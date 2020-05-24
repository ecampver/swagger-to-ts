#!/usr/bin/env node
import * as path from 'path';
import * as yargs from 'yargs';
import { yamlToDef } from './src/utils';
import { generateCode } from './src/codegen';
import { ApiDef } from './src/types';


const { source, destination, clientName } = yargs
  .usage('Usage: $0 [-s path] [-d path] [-n]')
  .option('source', {
    alias: 's',
    describe: 'The swagger yaml file path',
    demandOption: true,
    coerce: path.resolve
  })
  .option('destination', {
    alias: 'd',
    describe: 'Generated files destination folder path',
    demandOption: true,
    coerce: path.resolve
  })
  .option('clientName', {
    alias: 'n',
    describe: 'The interface name for the client',
    default: 'ApiClient'
  }).argv;

const apiDef: ApiDef = yamlToDef(clientName, source);
generateCode(apiDef, destination);
