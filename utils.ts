import { safeLoad } from 'js-yaml';
import * as fs from 'fs';
import * as camelize from 'camelize';


/*
integer	integer	int32	signed 32 bits
long	integer	int64	signed 64 bits
float	number	float	
double	number	double	
string	string		
byte	string	byte	base64 encoded characters
binary	string	binary	any sequence of octets
boolean	boolean		
date	string	date	As defined by full-date - RFC3339
dateTime	string	date-time	As defined by date-time - RFC3339
password	string	password	Used to hint UIs the input needs to be obscured.
*/
const typesMap = {
  'int32': 'int',
  'int64': 'int',
  'number': 'int',
  'integer': 'int',
  'float': 'int',
  'double': 'int',
  'string': 'str',
  'byte': 'str',
  'binary': 'str',
  'password': 'str',
  'email': 'str',
  'boolean': 'bool',
  'date': 'Date',
  'date-time': 'Date'
};
const EMPTY = 'empty';
const ENUM = 'enum';
const ARRAY = 'array';
const OBJECT = 'object';
const MAP = 'map';
const REF = '$ref';
const DEFAULT = 'str';

function getTypeDef(def: any) {
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
    return { typeName: ENUM, values: def.enum };
  }

  if (def.type === ARRAY) {
    let name = DEFAULT;
    if (def.items) {
      name = getTypeDef(def.items).typeName;
    }
    return { typeName: `${name}[]` };
  }

  if (def.type === OBJECT) {
    let values = [], typeName = OBJECT;
    if (def.properties) {
      values = generateProperties(def.properties);
    } else if (def.additionalProperties) {
      values = getTypeDef(def.additionalProperties);
      typeName = MAP;
    }
    return { typeName, values };
  }

  if (def.format) {
    return { typeName: typesMap[def.format] };
  }

  return { typeName: typesMap[def.type] || DEFAULT };
}

function generateResponse(resDef: any) {
  const success = Object.keys(resDef).find(code => code >= '200' && code < '300');
  return getTypeDef(resDef[success].schema);
}

function generateParameter(paramDef: any) {
  const { name, required } = paramDef;
  const typeDef = getTypeDef(paramDef);

  return {
    name: camelize(name.replace(' ', '_')),
    typeDef,
    optional: !required
  };
}

function generateMember(memberDef: any) {
  const { operationId, parameters = [], responses } = memberDef;  
  return {
    name: operationId,
    args: parameters.map(generateParameter),
    responseTypeDef: generateResponse(responses)
  }
}

function generateProperties(propertyDefs: any[]) {
  return Object.entries(propertyDefs).map(([name, schema]) => ({
    name,
    typeDef: getTypeDef(schema)
  }));
}

function generateModel(name: string, def: any) {
  let props = [], typeName = 'object';

  if (def.enum) {
    props = def.enum; 
    typeName = ENUM;
  } else if (!def.allOf) { // allOf not supported for now
    try {
      props = generateProperties(def.properties);
    } catch(e) {
      console.log(e, name, def);
    }
  }

  return {
    name,
    typeName,
    properties: props
  }
}

export function yamlToDef(filePath: string) {
  const yamlDef = fs.readFileSync(filePath, 'utf8');
  const yaml = safeLoad(yamlDef)
  const verbs = Object.values(yaml.paths).flatMap(path => Object.values(path));
  const clientDef = {
    name: 'Client',
    members: verbs.map(generateMember)
  };
  const modelsDef = Object.entries(yaml.definitions).map(([name, def]) => generateModel(name, def));
  //console.log(require('util').inspect(modelsDef, true, null));
  return { clientDef, modelsDef };
}
