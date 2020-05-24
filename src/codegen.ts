import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { INT, STR, BOOL, EMPTY, ENUM, OBJECT, MAP } from './constants';
import {
  TypeDef,
  PropertyDef,
  ModelDef,
  ArgumentDef,
  FunctionPropertyDef,
  ClientDef,
  ApiDef
} from './types';


const KEY = 'key';
const PROMISE = 'Promise';

const typesMap = {
  [INT]: ts.SyntaxKind.NumberKeyword,
  [STR]: ts.SyntaxKind.StringKeyword,
  [BOOL]: ts.SyntaxKind.BooleanKeyword,
  [EMPTY]: ts.SyntaxKind.UnknownKeyword
};
const QUESTION_TOKEN = ts.createToken(ts.SyntaxKind.QuestionToken);

function makeTypeNode(typeDef: TypeDef): ts.TypeNode {
  const { typeName, value } = typeDef;

  const primitiveType = typesMap[typeName];
  if (primitiveType) {
    return ts.createKeywordTypeNode(primitiveType);
  }

  if (typeName.endsWith('[]')) {
    const arrayType: ts.TypeNode = makeTypeNode({ typeName: typeName.replace('[]', '') });
    return ts.createArrayTypeNode(arrayType);
  }

  if (typeName === ENUM) {
    const stringLiterals: ts.StringLiteral[] = (<string[]>value).map(ts.createStringLiteral);
    const stringLiteralTypeNodes: ts.LiteralTypeNode[] = stringLiterals.map(ts.createLiteralTypeNode)
    return ts.createUnionTypeNode(stringLiteralTypeNodes);
  }

  if (typeName === OBJECT) {
    const typeElements: ts.PropertySignature[] = (<PropertyDef[]>value).map(makeModelProperty);
    return ts.createTypeLiteralNode(typeElements);
  }

  if (typeName === MAP) {
    const stringParameter: ts.ParameterDeclaration = ts.createParameter(
      /*decorators*/ undefined,
      /*modifieres*/ undefined,
      /*dotDotDotToken*/ undefined,
      /*name*/ KEY,
      /*questionToken*/ undefined,
      /*type*/ ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
    );
    const indexSignature: ts.IndexSignatureDeclaration = ts.createIndexSignature(
      /*decorators*/ undefined,
      /*modifiers*/ undefined,
      /*parameters*/ [stringParameter],
      /*type*/ makeTypeNode(<TypeDef>value)
    );
    return ts.createTypeLiteralNode([indexSignature]);
  }

  return ts.createTypeReferenceNode(typeName, /*typeArguments*/ undefined);
}

function makeArgument(argumentDef: ArgumentDef): ts.ParameterDeclaration {
  const { name, typeDef, optional } = argumentDef;

  return ts.createParameter(
    /*decorators*/ undefined,
    /*modifiers*/ undefined,
    /*dotDotDotToken*/ undefined,
    /*name*/ name,
    /*questionToken*/ optional ? QUESTION_TOKEN : undefined,
    /*type*/ makeTypeNode(typeDef),
    /*initializer*/ undefined
  );
}

function makeFunctionMember(functionDef: FunctionPropertyDef): ts.PropertySignature {
  const { name, args, returnTypeDef } = functionDef;

  args.sort((arg, _) => arg.optional ? 1 : -1);

  const returnTypeNode = makeTypeNode(returnTypeDef);
  const promiseNode = ts.createTypeReferenceNode(PROMISE, /*typeArguments*/ [returnTypeNode]);

  const functionTypeNode = ts.createFunctionTypeNode(
    /*typeParameters*/ undefined,
    /*parameters*/ args.map(makeArgument),
    /*type*/ promiseNode
  );

  return ts.createPropertySignature(
    /*modifiers*/ undefined,
    /*name*/ name,
    /*questionToken*/ undefined,
    /*type*/ functionTypeNode,
    /*initializer*/ undefined
  );
}

function makeClientInterface(clientDef: ClientDef): ts.InterfaceDeclaration {
  const { name, members } = clientDef;

  return ts.createInterfaceDeclaration(
    /*decorators*/ undefined,
    /*modifiers*/ [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    /*name*/ name,
    /*typeParameters*/ undefined,
    /*heritageClauses*/ undefined,
    /*members*/ members.map(makeFunctionMember)
  );
}

function makeModelProperty(propertyDef: PropertyDef): ts.PropertySignature {
  const { name, typeDef, optional } = propertyDef;
  return ts.createPropertySignature(
    /*modifiers*/ undefined,
    /*name*/ name,
    /*questionToken*/ optional ? QUESTION_TOKEN : undefined,
    /*type*/ makeTypeNode(typeDef),
    /*initializer*/ undefined
  );
}

function makeEnumMember(value: string): ts.EnumMember {
  const stringLiteral = ts.createStringLiteral(value);
  return ts.createEnumMember(/*name*/ value, /*initializer*/ stringLiteral);
}

function makeModelType(modelDef: ModelDef): ts.DeclarationStatement {
  const { name, typeName, properties } = modelDef;

  if (typeName === ENUM) {
    return ts.createEnumDeclaration(
      /*decorators*/ undefined,
      /*modifiers*/ [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      /*name*/ name,
      /*members*/ (<string[]>properties).map(makeEnumMember)
    );
  }

  properties.sort((prop, _) => prop.optional ? 1 : -1);

  return ts.createInterfaceDeclaration(
    /*decorators*/ undefined,
    /*modifiers*/ [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    /*name*/ name,
    /*typeParameters*/ undefined,
    /*heritageClauses*/ undefined,
    /*members*/ (<PropertyDef[]>properties).map(makeModelProperty)
  );
}

export function generateCode(apiDef: ApiDef, destinationPath: string) {
  const clientFilename = 'client.ts';
  const modelsFilename = 'models.ts';

  const clientInterfaceFile = ts.createSourceFile(clientFilename, '', ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
  const modelsFile = ts.createSourceFile(modelsFilename, '', ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const modelNodes = apiDef.modelsDef.map(makeModelType);
  const clientInterfaceNode = makeClientInterface(apiDef.clientDef);

  const modelsCode = printer.printList(ts.ListFormat.MultiLineFunctionBodyStatements, ts.createNodeArray(modelNodes), modelsFile);
  const clientInterfaceCode = printer.printNode(ts.EmitHint.Unspecified, clientInterfaceNode, clientInterfaceFile);

  fs.writeFileSync(path.join(destinationPath, modelsFilename), modelsCode);
  fs.writeFileSync(path.join(destinationPath, clientFilename), clientInterfaceCode);
}
