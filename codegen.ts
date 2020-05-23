import * as fs from 'fs';
import * as ts from 'typescript';

const PROMISE = 'Promise';
const HTTP_RESPONSE = 'HttpResponse';

const typesMap = {
  'int': ts.SyntaxKind.NumberKeyword,
  'str': ts.SyntaxKind.StringKeyword,
  'bool': ts.SyntaxKind.BooleanKeyword,
  'empty': ts.SyntaxKind.UnknownKeyword
};
const ENUM = 'enum';
const OBJECT = 'object';
const MAP = 'map';
const QUESTION_TOKEN = ts.createToken(ts.SyntaxKind.QuestionToken);

function makeTypeNode(typeDef: any): ts.TypeNode {
  const { typeName, values } = typeDef;

  const primitiveType = typesMap[typeName];
  if (primitiveType) {
    return ts.createKeywordTypeNode(primitiveType);
  }

  if (typeName.endsWith('[]')) {
    const arrayType = makeTypeNode({ typeName: typeName.replace('[]', '') });
    return ts.createArrayTypeNode(arrayType);
  }

  if (typeName === ENUM) {
    const stringLiterals = values.map(ts.createStringLiteral);
    const stringLiteralTypeNodes = stringLiterals.map(ts.createLiteralTypeNode)
    return ts.createUnionTypeNode(stringLiteralTypeNodes);
  }

  if (typeName === OBJECT) {
    const typeElements = values.map(makeModelProperty);
    return ts.createTypeLiteralNode(typeElements);
  }

  if (typeName === MAP) {
    const stringParameter = ts.createParameter(
      /*decorators*/ undefined,
      /*modifieres*/ undefined,
      /*dotDotDotToken*/ undefined,
      /*name*/ 'key',
      /*questionToken*/ undefined,
      /*type*/ ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
    );
    const indexSignature = ts.createIndexSignature(
      undefined, undefined, [stringParameter], makeTypeNode(values)
    );
    return ts.createTypeLiteralNode([indexSignature]);
  }

  return ts.createTypeReferenceNode(typeName, undefined);
}

function makeArgument(argumentDefinition: any) {
  const { name, typeDef, optional } = argumentDefinition;

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

function makeMember(memberDefinition: any) {
  const { name, args, responseTypeDef } = memberDefinition;

  args.sort((arg1, arg2) => arg1.optional ? 1 : -1);

  const responseTypeNode = makeTypeNode(responseTypeDef);
  //const httpResponseNode = ts.createTypeReferenceNode(HTTP_RESPONSE, [responseTypeNode]);
  const promiseNode = ts.createTypeReferenceNode(PROMISE, [responseTypeNode]);

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

function makeClientInterface(interfaceDefinition: any) {
  const { name, members } = interfaceDefinition;

  return ts.createInterfaceDeclaration(
    /*decorators*/ undefined,
    /*modifiers*/ [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    /*name*/ name,
    /*typeParameters*/ undefined,
    /*heritageClauses*/ undefined,
    /*members*/ members.map(makeMember)
  );
}

/*
{
    name: 'PageTicketsDTO',
    typeName: 'object',
    properties: [
      { name: 'totalPages', typeDef: { typeName: 'int' } },
      { name: 'totalElements', typeDef: { typeName: 'int' } },
      { name: 'page', typeDef: { typeName: 'int' } },
      { name: 'size', typeDef: { typeName: 'int' } },
      { name: 'content', typeDef: { typeName: 'TicketDTO[]' } },
      [length]: 5
    ]
  }
{
    name: 'StateDTO',
    typeName: 'enum',
    properties: [ 'IN_PROGRESS', 'DERIVED', 'CLOSED', [length]: 3 ]
  }
{
    name: 'ContactReasonActionDTO',
    typeName: 'object',
    properties: [
      {
        name: 'type',
        typeDef: {
          typeName: 'enum',
          values: [ 'COMMENT', 'OPERATION_ID', [length]: 2 ]
        }
      },
      { name: 'required', typeDef: { typeName: 'bool' } },
      [length]: 2
    ]
  }
*/

function makeModelProperty(propertyDefinition: any) {
  const { name, typeDef } = propertyDefinition;
  return ts.createPropertySignature(
    /*modifiers*/ undefined,
    /*name*/ name,
    /*questionToken*/ QUESTION_TOKEN,
    /*type*/ makeTypeNode(typeDef),
    /*initializer*/ undefined
  );
}

function makeEnumMember(value: string) {
  const stringLiteral = ts.createStringLiteral(value);
  return ts.createEnumMember(value, stringLiteral);
}

function makeModelType(modelDefinition: any) {
  const { name, typeName, properties } = modelDefinition;

  if (typeName === ENUM) {
    return ts.createEnumDeclaration(
      /*decorators*/ undefined,
      /*modifiers*/ [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      /*name*/ name,
      /*members*/ properties.map(makeEnumMember)
    );
  }

  return ts.createInterfaceDeclaration(
    /*decorators*/ undefined,
    /*modifiers*/ [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    /*name*/ name,
    /*typeParameters*/ undefined,
    /*heritageClauses*/ undefined,
    /*members*/ properties.map(makeModelProperty)
  );
}

export function generateCode(def: any) {
  const clientInterfaceFile = ts.createSourceFile('client.ts', '', ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
  const modelsFile = ts.createSourceFile('models.ts', '', ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const modelNodes = def.modelsDef.map(makeModelType);
  const clientInterfaceNode = makeClientInterface(def.clientDef);

  const modelsCode = printer.printList(ts.ListFormat.MultiLineFunctionBodyStatements, ts.createNodeArray(modelNodes), modelsFile);
  const clientInterfaceCode = printer.printNode(ts.EmitHint.Unspecified, clientInterfaceNode, clientInterfaceFile);

  fs.writeFileSync('models.ts', modelsCode);
  fs.writeFileSync('client.ts', clientInterfaceCode);
}
