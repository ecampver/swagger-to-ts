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
```

## Example

For the following Swagger spec:

```yaml
swagger: "2.0"
info:
  title: Users API
  description: API description in Markdown.
  version: 1.0.0
host: api.example.com
basePath: /v1
schemes:
  - https
paths:
  /users:
    get:
      summary: Returns a list of users.
      description: Optional extended description in Markdown.
      operationId: getUsers
      produces:
        - application/json
      responses:
        200:
          description: OK
    post:
      summary: Creates a new user.
      operationId: createUser
      parameters:
        - in: body
          name: user
          schema:
            $ref: '#/definitions/User'
      responses:
        200:
          description: OK
          schema:
            $ref: '#/definitions/User'
  /users/{userId}:
    get:
      summary: Returns a user by ID.
      operationId: getUserById
      parameters:
        - in: path
          name: userId
          required: true
          type: integer
      responses:
        200:
          description: OK
          schema:
            $ref: '#/definitions/User'
definitions:
  User:
    properties:
      id:
        type: integer
      name:
        type: string
```

Let's run the `swagger-to-ts` command:

```bash
swagger-to-ts -s api-users.yaml -d codegen/ -c UsersClient
```

This will yield two files `codegen/models.ts` and `codgen/client.ts` with the following contents:

```typescript
// models.ts
export interface User {
    id?: number;
    name?: string;
}

// client.ts
export interface UsersClient {
    getUsers: () => Promise<unknown>;
    createUser: (user?: User) => Promise<User>;
    getUserById: (userId: number) => Promise<User>;
}
```

## Limitations

* Supports only OpenAPI v2
* Doesn't support `allOf` attribute
* Doesn't handle duplicated `operationId` attributes on different paths
* Doesn't import the generated models into the generated client file (yet)
