import { getChannel } from "../../config/rabbitmqConnection.js";
import { getRabbitmqConfig } from "../../config/rabbitmq.js";

let returnListenerRegistered = false;

export const publishOrderCreated = async (data: any) => {
  const channel = getChannel();
  const rabbitmqConfig = getRabbitmqConfig();

  const routingKey = "order.created";

  const message = {
    eventType: "order.created",
    eventVersion: 1,
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (!returnListenerRegistered) {
    channel.on("return", (msg) => {
      console.error("❌ MESSAGE RETURNED AS UNROUTABLE");
      console.error("   exchange:", msg.fields.exchange);
      console.error("   routingKey:", msg.fields.routingKey);
      console.error("   payload:", msg.content.toString());
    });
    returnListenerRegistered = true;
  }

  console.log("📤 EXCHANGE (publisher):", rabbitmqConfig.exchange);
  console.log("📤 ROUTING KEY (publisher):", routingKey);
  console.log("📤 order.created published:", message);

  const published = channel.publish(
    rabbitmqConfig.exchange,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    {
      persistent: true,
      mandatory: true,
      contentType: "application/json",
    },
  );

  console.log("📤 publish() returned:", published);
};
