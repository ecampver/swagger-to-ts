#!/usr/bin/env node
import * as path from 'path';
import { yamlToDef } from './utils';
import { generateCode } from './codegen';
import { ApiDef } from './types';
import * as yargs from 'yargs';


const { source, destination, clientName } = yargs
  .usage('Usage: $0 [-s path] [-d path] [-c]')
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
    alias: 'c',
    describe: 'The interface name for the client',
    default: 'ApiClient'
  }).argv;

const apiDef: ApiDef = yamlToDef(clientName, source);
generateCode(apiDef, destination);
