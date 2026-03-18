import amqplib from 'amqplib';
import { logger } from './logger.js';

export class RabbitMQPublisher {
  static async publish(queue: string, message: unknown) {
    try {
      const conn = await amqplib.connect(process.env.RABBITMQ_URL!);
      const channel = await conn.createChannel();
      await channel.assertQueue(queue, { durable: true });
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
      logger.info(`Published to ${queue}: ${JSON.stringify(message)}`);
      await channel.close();
      await conn.close();
    } catch (err) {
      logger.error({ err }, 'RabbitMQ publish error');
    }
  }
}
