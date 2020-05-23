import { yamlToDef } from './utils';
import { generateCode } from './codegen';

//const def = yamlToDef('../api-contacts/tickets-contract/src/main/resources/api-tickets-contract.yaml');
//const def = yamlToDef('./contact-channels-core-api.yaml');
//const def = yamlToDef('./api-v2-trips-contract_src_main_resources_default-api.yaml');
const def = yamlToDef('./trips-products-contract_src_main_resources_api-trips-products-contract.yaml');
generateCode(def);


/* TODO
 * 1. handle duplicated operationIds
 * 2. handle reserve words
 */
