const { CosmosClient } = require("@azure/cosmos");

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
            const { resource: updatedItem } = await container.item(item.id).replace(item);
            msg.payload = updatedItem;
            break;

          case "delete":
            const { resource: deletedItem } = await container.item(item.id).delete();
            msg.payload = deletedItem;
            break;

          case "upsert":
            const { resource: upsertedItem } = await container.items.upsert(item);
            msg.payload = upsertedItem;
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

