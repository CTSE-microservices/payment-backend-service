import { logger } from './logger.js';
import { rabbitMQ, EXCHANGE_PAYMENT_EVENTS } from '../config/rabbitmq.js';

/**
 * Publishes a message to the payment_events topic exchange.
 * routingKey should be one of: payment.session_created | payment.success | payment.failed
 */
export async function publishPaymentEvent(routingKey: string, message: unknown): Promise<void> {
  try {
    const channel = await rabbitMQ.getChannel();
    channel.publish(
      EXCHANGE_PAYMENT_EVENTS,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    logger.info({ routingKey, message }, 'Payment event published');
  } catch (err) {
    logger.error({ err, routingKey }, 'Failed to publish payment event');
  }
}
