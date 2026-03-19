import { getChannel } from "../../config/rabbitmqConnection.js";
import { getRabbitmqConfig } from "../../config/rabbitmq.js";

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

  channel.publish(
    rabbitmqConfig.exchange,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );

  console.log("📤 order.created published:", message);
};
