import { ConsumeMessage } from "amqplib";
import { getChannel } from "../config/rabbitmqConnection.js";
import { getRabbitmqConfig } from "../config/rabbitmq.js";
import { createPendingPaymentFromOrderCreated } from "../api/payment/payment.service.js";

interface OrderCreatedMessage {
  eventType: string;
  eventVersion: number;
  timestamp: string;
  orderId: number;
  userId: string;
  amount: number | string;
  currency: string;
}

export const startOrderCreatedConsumer = async () => {
  const channel = getChannel();
  const rabbitmqConfig = getRabbitmqConfig();

  const queueName = rabbitmqConfig.orderCreatedQueue;
  const routingKey = "order.created";

  console.log("✅ Consumer init started");
  console.log("📥 EXCHANGE (consumer):", rabbitmqConfig.exchange);
  console.log("📥 QUEUE (consumer):", queueName);
  console.log("📥 ROUTING KEY (consumer):", routingKey);

  await channel.assertQueue(queueName, {
    durable: true,
  });
  console.log("✅ Queue asserted:", queueName);

  await channel.bindQueue(queueName, rabbitmqConfig.exchange, routingKey);
  console.log(
    `✅ Queue bound: ${queueName} -> ${rabbitmqConfig.exchange} (${routingKey})`,
  );

  await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
    console.log("🔥 CONSUMER CALLBACK HIT");
    if (!msg) return;

    try {
      console.log("🔥 RAW MESSAGE:", msg.content.toString());

      const raw = msg.content.toString();
      const parsed: OrderCreatedMessage = JSON.parse(raw);

      console.log("📥 order.created received:", parsed);

      const result = await createPendingPaymentFromOrderCreated({
        orderId: parsed.orderId,
        userUuid: parsed.userId,
        amount: parsed.amount,
        currency: parsed.currency,
        rawMessage: parsed,
      });

      console.log("💰 Payment creation result:", result);

      channel.ack(msg);
      console.log("✅ order.created processed and payment created");
    } catch (error) {
      const err = error as Error;
      console.error("❌ Failed to process order.created");
      console.error("   message:", err?.message);
      console.error("   stack:", err?.stack);
      console.error(
        "   full:",
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
      );
      console.error("   failed payload:", msg.content.toString());

      channel.nack(msg, false, false);
    }
  });

  console.log(`👂 Listening for ${routingKey} on queue ${queueName}`);
};
