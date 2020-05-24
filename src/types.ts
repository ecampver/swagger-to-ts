export interface TypeDef {
  typeName: string;
  value?: string[] | PropertyDef[] | TypeDef; // enum, object literal type or type reference
  array?: boolean;
}

export interface PropertyDef {
  name: string;
  typeDef: TypeDef;
  optional: boolean;
}

export interface ModelDef {
  name: string;
  typeName: string;
  properties: string[] | PropertyDef[]; // enum or property definitions
}

export interface ArgumentDef extends PropertyDef {}

export interface FunctionPropertyDef {
  name: string;
  args: ArgumentDef[];
  returnTypeDef: TypeDef;
}

export interface ClientDef {
  name: string;
  members: FunctionPropertyDef[]
}

export interface ApiDef {
  modelsDef: ModelDef[];
  clientDef: ClientDef;
}
