# node-red-cosmos-r2

A Node-RED custom node that connects to a Cosmos DB and performs create, update, read, delete, and upsert operations.

## Installation

Install the node-red-cosmos-r2 node from the command line:

```
npm install node-red-cosmos-r2
```

Then, restart your Node-RED instance to load the new node.

## Features

- Connect to Cosmos DB using URI, Key, Database ID, and Container ID
- Perform create, read, update, delete, and upsert operations
- Configure operations using input messages

## Usage

Add the cosmos-r2 node to your Node-RED flow and configure it with the following properties:

- Name: (Optional) A custom name for the node
- URI: The Cosmos DB endpoint URI
- Key: The Cosmos DB key
- Database ID: The Cosmos DB database ID
- Container ID: The Cosmos DB container ID

The input message must contain the following properties:

- `operation`: The type of operation to perform, either "create", "read", "update", "delete", or "upsert"
- `item`: (Optional) The item to create, update, delete, or upsert. Required for "create", "update", "delete", and "upsert" operations
- `query`: (Optional) A query to filter items for "read" operation. If not provided, all items will be retrieved

The output message will contain the following property:

- `payload`: The result of the operation, such as created, read, updated, deleted, or upserted items

## Examples

Create an item:

```json
{
  "operation": "create",
  "item": {
    "id": "1",
    "name": "Example Item"
  }
}
```

Read items:

```json
{
  "operation": "read",
  "query": "SELECT * FROM c WHERE c.name = 'Example Item'"
}
```

Update an item:

```json
{
  "operation": "update",
  "item": {
    "id": "1",
    "name": "Updated Item"
  }
}
```

Delete an item:

```json
{
  "operation": "delete",
  "item": {
    "id": "1"
  }
}
```

Upsert an item:

```json
{
  "operation": "upsert",
  "item": {
    "id": "1",
    "name": "Upserted Item"
  }
}
```

## Developer Tools

A Dockerfile and sample flow are provided to test the functionality of the module.

### Prerequisites

- Docker
- npm

### Installation

1. Install module dependencies:

   ```
   cd {path/to/repo}
   npm install
   ```

1. Create Docker container:

   ```
   cd ./development_tools/docker
   docker-compose up
   ```

1. Access the Node-RED flow at http://localhost:1880/.

## License

[GPL 3.0](LICENSE)
