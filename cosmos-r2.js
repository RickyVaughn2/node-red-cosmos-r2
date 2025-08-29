const { CosmosClient, BulkOperationType } = require("@azure/cosmos");

module.exports = function (RED) {
  function CosmosR2Node(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    const uri = this.credentials.uri;
    const key = this.credentials.key;
    const databaseId = config.databaseId;
    const containerId = config.containerId;

    // Defer client creation until needed. This avoids URI errors from Cosmos when starting/managing flow.
    let client = null;
    let container = null;

    function initializeClient() {
      if (!uri || typeof uri !== 'string' || !uri.startsWith('https://')) {
        throw new Error("Invalid or missing Cosmos DB URI. Expected format: https://your-account.documents.azure.com:443/");
      }
      if (!key) {
        throw new Error("Missing Cosmos DB key");
      }
      if (!databaseId) {
        throw new Error("Missing database ID");
      }
      if (!containerId) {
        throw new Error("Missing container ID");
      }

      client = new CosmosClient({ endpoint: uri, key: key });
      container = client.database(databaseId).container(containerId);
    }

    node.on("input", async function (msg) {
      try {
        // Initialize client on first use
        if (!container) {
          try {
            initializeClient();
          } catch (initError) {
            node.error("Cosmos configuration error: " + initError.message);
            return;
          }
        }

        const operation = msg.operation;
        const item = msg.item;

        if (!operation) {
          node.error("No operation specified");
          return;
        }

        switch (operation) {
          case "create":
            const { resource: createdItem } = await container.items.create(item);
            msg.payload = createdItem;
            break;

          case "read":
            const { resources: readItems } = await container.items.query(msg.query || "SELECT * from c").fetchAll();
            msg.payload = readItems;
            break;

          case "update":
            if (!msg.partitionKey) {
              node.error("Operation 'update' requires a partitionKey in msg.partitionKey");
              return;
            }
            const { resource: updatedItem } = await container.item(item.id, msg.partitionKey).replace(item);
            msg.payload = updatedItem;
            break;

          case "delete":
            if (!msg.partitionKey) {
              node.error("Operation 'delete' requires a partitionKey in msg.partitionKey");
              return;
            }
            const { resource: deletedItem } = await container.item(item.id, msg.partitionKey).delete();
            msg.payload = deletedItem;
            break;

          case "upsert":
            const { resource: upsertedItem } = await container.items.upsert(item);
            msg.payload = upsertedItem;
            break;

          case "batch-create":
            if (!Array.isArray(msg.items)) {
              node.error("batch-create requires an array of items in msg.items");
              return;
            }
            if (!msg.partitionKey) {
              node.error("batch-create requires a partitionKey in msg.partitionKey");
              return;
            }
            try {
              const operations = msg.items.map(item => ({
                operationType: BulkOperationType.Create,
                resourceBody: item
              }));
              const response = await container.items.batch(operations, msg.partitionKey);
              msg.payload = response;
            } catch (error) {
              node.error("Batch create failed: " + error.message);
              return;
            }
            break;

          case "batch-upsert":
            if (!Array.isArray(msg.items)) {
              node.error("batch-upsert requires an array of items in msg.items");
              return;
            }
            if (!msg.partitionKey) {
              node.error("batch-upsert requires a partitionKey in msg.partitionKey");
              return;
            }
            try {
              const operations = msg.items.map(item => ({
                operationType: BulkOperationType.Upsert,
                resourceBody: item
              }));
              const response = await container.items.batch(operations, msg.partitionKey);
              msg.payload = response;
            } catch (error) {
              node.error("Batch upsert failed: " + error.message);
              return;
            }
            break;

          case "batch-update":
            if (!Array.isArray(msg.items)) {
              node.error("batch-update requires an array of items in msg.items");
              return;
            }
            if (!msg.partitionKey) {
              node.error("batch-update requires a partitionKey in msg.partitionKey");
              return;
            }
            try {
              for (const item of msg.items) {
                if (!item.id) {
                  throw new Error(`Item missing id field: ${JSON.stringify(item)}`);
                }
              }
              const operations = msg.items.map(item => ({
                operationType: BulkOperationType.Replace,
                id: item.id,
                resourceBody: item
              }));
              const response = await container.items.batch(operations, msg.partitionKey);
              msg.payload = response;
            } catch (error) {
              node.error("Batch update failed: " + error.message);
              return;
            }
            break;

          case "batch-delete":
            if (!Array.isArray(msg.items)) {
              node.error("batch-delete requires an array of items in msg.items");
              return;
            }
            if (!msg.partitionKey) {
              node.error("batch-delete requires a partitionKey in msg.partitionKey");
              return;
            }
            try {
              for (const item of msg.items) {
                if (!item.id) {
                  throw new Error(`Item missing id field: ${JSON.stringify(item)}`);
                }
              }
              const operations = msg.items.map(item => ({
                operationType: BulkOperationType.Delete,
                id: item.id
              }));
              const response = await container.items.batch(operations, msg.partitionKey);
              msg.payload = response;
            } catch (error) {
              node.error("Batch delete failed: " + error.message);
              return;
            }
            break;

          case "batch-read":
            if (!Array.isArray(msg.items)) {
              node.error("batch-read requires an array of items with id fields in msg.items");
              return;
            }
            if (!msg.partitionKey) {
              node.error("batch-read requires a partitionKey in msg.partitionKey");
              return;
            }
            try {
              for (const item of msg.items) {
                if (!item.id) {
                  throw new Error(`Item missing id field: ${JSON.stringify(item)}`);
                }
              }
              const operations = msg.items.map(item => ({
                operationType: BulkOperationType.Read,
                id: item.id
              }));
              const response = await container.items.batch(operations, msg.partitionKey);
              msg.payload = response;
            } catch (error) {
              node.error("Batch read failed: " + error.message);
              return;
            }
            break;

          default:
            node.error("Invalid operation");
            return;
        }

        node.send(msg);
      } catch (error) {
        node.error("Error processing operation: " + error.message);
      }
    });
  }

  RED.nodes.registerType("cosmos-r2", CosmosR2Node,{
    credentials: {
      uri: { type:"text" },
      key: { type:"password" }
    }
  });
};

