const { CosmosClient } = require("@azure/cosmos");

module.exports = function (RED) {
  function CosmosR2Node(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    const uri = config.uri;
    const key = config.key;
    const databaseId = config.databaseId;
    const containerId = config.containerId;

    const client = new CosmosClient({ endpoint: uri, key: key });
    const container = client
      .database(databaseId)
      .container(containerId);

    node.on("input", async function (msg) {
      try {
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

  RED.nodes.registerType("cosmos-r2", CosmosR2Node);
};

