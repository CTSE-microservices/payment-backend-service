import amqp from "amqplib";
import { rabbitmqConfig } from "./rabbitmq.js";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(rabbitmqConfig.url);

    channel = await connection.createChannel();

    // Create exchange
    await channel.assertExchange(rabbitmqConfig.exchange, "topic", {
      durable: true,
    });

    console.log("✅ Connected to Cloud RabbitMQ");
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
