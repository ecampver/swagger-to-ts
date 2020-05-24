import { safeLoad } from 'js-yaml';
import * as fs from 'fs';
import * as camelize from 'camelize';
import { INT, STR, BOOL, DATE, EMPTY, ENUM, ARRAY, OBJECT, MAP, REF } from './constants';
import {
  TypeDef,
  PropertyDef,
  ModelDef,
  ArgumentDef,
  FunctionPropertyDef,
  ClientDef,
  ApiDef
} from './types';


const DEFAULT_TYPE = STR;
const typesMap = {
  'int32': INT,
  'int64': INT,
  'number': INT,
  'integer': INT,
  'float': INT,
  'double': INT,
  'string': STR,
  'byte': STR,
  'binary': STR,
  'password': STR,
  'email': STR,
  'boolean': BOOL,
  'date': DATE,
  'date-time': DATE
};

function getTypeDef(def: any): TypeDef {
  if (!def) {
    return { typeName: EMPTY };
  }

  if (def.schema) {
    return getTypeDef(def.schema);
  }

  if (def[REF]) {
    return { typeName: def[REF].split('/')[2] };
  }
  
  if (def.enum) {
    return { typeName: ENUM, value: def.enum };
  }

  if (def.type === ARRAY) {
    let name = DEFAULT_TYPE;
    if (def.items) {
      name = getTypeDef(def.items).typeName;
    }
    return { typeName: `${name}[]` };
  }

  if (def.type === OBJECT) {
    let value: TypeDef['value'] = [], typeName = OBJECT;
    if (def.properties) {
      value = generateProperties(def.properties);
    } else if (def.additionalProperties) {
      value = getTypeDef(def.additionalProperties);
      typeName = MAP;
    }
    return { typeName, value };
  }

  if (def.format) {
    return { typeName: typesMap[def.format] };
  }

  return { typeName: typesMap[def.type] || DEFAULT_TYPE };
}

function generateReturnType(resDef: any): TypeDef {
  const success = Object.keys(resDef).find(code => code >= '200' && code < '300');
  return getTypeDef(resDef[success].schema);
}

function generateArgument(paramDef: any): ArgumentDef {
  const { name, required } = paramDef;
  const typeDef = getTypeDef(paramDef);

  return {
    name: camelize(name.replace(' ', '_')),
    typeDef,
    optional: !required
  };
}

function generateMember(memberDef: any): FunctionPropertyDef {
  const { operationId, parameters = [], responses } = memberDef;  
  return {
    name: operationId,
    args: parameters.map(generateArgument),
    returnTypeDef: generateReturnType(responses)
  }
}

function generateProperties(propertyDefs: any[]): PropertyDef[] {
  return Object.entries(propertyDefs)
    .map(([name, schema]) => ({
      name,
      typeDef: getTypeDef(schema)
    }));
}

function generateModel(name: string, def: any): ModelDef {
  let props: PropertyDef[] = [], typeName = OBJECT;

  if (def.enum) {
    props = def.enum; 
    typeName = ENUM;
  } else if (def.allOf) {
    console.warn(`[WARNIN] - allOf not supported, model ${name} will be generated empty.`);
  } else {
    props = generateProperties(def.properties);
  }

  return {
    name,
    typeName,
    properties: props
  }
}

export function yamlToDef(clientName: string, filePath: string): ApiDef {
  const yamlDef = fs.readFileSync(filePath, 'utf8');
  const yaml = safeLoad(yamlDef)

  const modelsDef: ModelDef[] = Object.entries(yaml.definitions)
    .map(([name, def]) => generateModel(name, def));

  const verbs = Object.values(yaml.paths).flatMap(path => Object.values(path));
  const clientDef: ClientDef = {
    name: clientName,
    members: verbs.map(generateMember)
  };

  return { clientDef, modelsDef };
}
