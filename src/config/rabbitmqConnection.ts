import amqp from "amqplib";
import { getRabbitmqConfig } from "./rabbitmq.js";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  try {
    const rabbitmqConfig = getRabbitmqConfig();

    console.log("RabbitMQ URL:", rabbitmqConfig.url);

    const connection = await amqp.connect(rabbitmqConfig.url);
    channel = await connection.createChannel();

    await channel.assertExchange(rabbitmqConfig.exchange, "topic", {
      durable: true,
    });

    console.log("✅ Connected to Cloud RabbitMQ");
    console.log("✅ Exchange asserted:", rabbitmqConfig.exchange);
  } catch (error) {
    console.error("❌ RabbitMQ connection failed:", error);
    throw error;
  }
};

export const getChannel = () => {
  if (!channel) {
    throw new Error("RabbitMQ not initialized");
  }
  return channel;
};
