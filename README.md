# swagget-to-ts

Generate Typescript models and client interface from Swagger yaml

## Install

```bash
npm install -g swagger-to-ts
```

## Usage

```bash
Usage: swagger-to-ts [-s path] [-d path] [-c]

Options:
  --help             Show help                                         [boolean]
  --version          Show version number                               [boolean]
  --source, -s       The swagger yaml file path                       [required]
  --destination, -d  Generated files destination folder path          [required]
  --clientName, -c   The interface name for the client    [default: "ApiClient"]

Examples:
  swagget-to-ts -s api-definition.yaml -d codegen/ -c MyApiClient
```

## Caveats

* Supports only OpenAPI v2
* Doesn't support `allOf` attribute
* Doesn't handle duplicated `operationId` attributes on different paths
