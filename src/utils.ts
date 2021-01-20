import { safeLoad } from 'js-yaml';
import * as fs from 'fs';
import * as camelize from 'camelize';
import {
  INT,
  STR,
  BOOL,
  DATE,
  EMPTY,
  ENUM,
  ARRAY,
  OBJECT,
  MAP,
  REF,
} from './constants';
import {
  TypeDef,
  PropertyDef,
  ModelDef,
  ArgumentDef,
  FunctionPropertyDef,
  ClientDef,
  ApiDef,
} from './types';

const DEFAULT_TYPE = STR;
const typesMap = {
  int32: INT,
  int64: INT,
  number: INT,
  integer: INT,
  float: INT,
  double: INT,
  string: STR,
  byte: STR,
  binary: STR,
  password: STR,
  email: STR,
  boolean: BOOL,
  date: DATE,
  'date-time': DATE,
};

function getTypeDef(def: any): TypeDef {
  if (!def) {
    return { typeName: EMPTY };
  }

  if (def.schema) {
    return getTypeDef(def.schema);
  }

  if (def[REF]) {
    const typeName = def[REF].split('/').pop();
    return { typeName };
  }

  if (def.enum) {
    return { typeName: ENUM, value: def.enum };
  }

  if (def.type === ARRAY) {
    let typeName: string = DEFAULT_TYPE,
      value: any;
    if (def.items) {
      const typeDef = getTypeDef(def.items);
      typeName = typeDef.typeName;
      value = typeDef.value;
    }
    if (typeName === ENUM) {
      return { array: true, typeName, value };
    }
    return { array: true, typeName };
  }

  if (def.type === OBJECT) {
    let value: TypeDef['value'] = [],
      typeName = OBJECT;
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

function getSchema(def: any) {
  if (typeof def !== 'object') return null;
  if (!def) return null;
  if (def.schema) return def.schema;

  for (const subdef of Object.values(def)) {
    const schema = getSchema(subdef);
    if (schema) {
      return schema;
    }
  }
}

function generateReturnType(resDef: any): TypeDef {
  const responseKey = Object.keys(resDef).find(
    (code: string) => code === 'default' || (code >= '200' && code < '300')
  );
  if (responseKey) {
    const schema = getSchema(resDef[responseKey]);
    return getTypeDef(schema);
  }
  return getTypeDef(undefined);
}

function generateArgument(paramDef: any): ArgumentDef {
  const { name, required } = paramDef;
  const typeDef = getTypeDef(paramDef);

  return {
    name: camelize(name.replace(' ', '_')), // TODO: extract, also handle reserve words
    typeDef,
    optional: !required,
  };
}

function generateMember(memberDef: any): FunctionPropertyDef {
  // TODO: handle duplicated operationIds
  const { operationId, parameters = [], responses } = memberDef;
  return {
    name: operationId,
    args: parameters.map(generateArgument),
    returnTypeDef: generateReturnType(responses),
  };
}

function generateProperties(
  propertyDefs: any[],
  required: string[] = []
): PropertyDef[] {
  return Object.entries(propertyDefs).map(([name, schema]) => ({
    name,
    typeDef: getTypeDef(schema),
    optional: !required.includes(name),
  }));
}

function generateModel(name: string, def: any): ModelDef {
  let props: PropertyDef[] = [],
    typeName = OBJECT;

  if (def.enum) {
    props = def.enum;
    typeName = ENUM;
  } else if (def.allOf) {
    console.warn(
      `[WARNING] - allOf not supported, model ${name} will be generated empty.`
    );
  } else {
    props = generateProperties(def.properties, def.required);
  }

  return {
    name,
    typeName,
    properties: props,
  };
}

function isOpenAPIv3(yaml: any): boolean {
  return (yaml.swagger || yaml.openapi).startsWith('3');
}

export function yamlToDef(clientName: string, filePath: string): ApiDef {
  const yamlDef = fs.readFileSync(filePath, 'utf8');
  const yaml = safeLoad(yamlDef);
  const definitions = isOpenAPIv3(yaml)
    ? yaml.components.schemas
    : yaml.definitions;

  const modelsDef: ModelDef[] = Object.entries(definitions).map(([name, def]) =>
    generateModel(name, def)
  );

  const verbs = Object.values(yaml.paths).flatMap((path: any) =>
    Object.values(path)
  );
  const clientDef: ClientDef = {
    name: clientName,
    members: verbs.map(generateMember),
  };

  return { clientDef, modelsDef };
}
