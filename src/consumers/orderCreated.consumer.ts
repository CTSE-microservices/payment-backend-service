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

  await channel.assertQueue(queueName, {
    durable: true,
  });

  await channel.bindQueue(queueName, rabbitmqConfig.exchange, routingKey);

  await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      console.log("🔥 RAW MESSAGE:", msg?.content.toString());
      const raw = msg.content.toString();
      const parsed: OrderCreatedMessage = JSON.parse(raw);

      console.log("📥 order.created received:", parsed);

      await createPendingPaymentFromOrderCreated({
        orderId: parsed.orderId,
        userUuid: parsed.userId,
        amount: parsed.amount,
        currency: parsed.currency,
        rawMessage: parsed,
      });

      channel.ack(msg);
      console.log("✅ order.created processed and payment created");
    } catch (error) {
      console.error("❌ Failed to process order.created:", error);

      // for now, reject without requeue to avoid endless loops during dev
      channel.nack(msg, false, false);
    }
  });

  console.log(`👂 Listening for ${routingKey} on queue ${queueName}`);
};
