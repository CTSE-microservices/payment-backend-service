import { logger } from '../utils/logger.js';
import {
  rabbitMQ,
  QUEUE_PAYMENT_SERVICE,
  RK_PAYMENT_SESSION_CREATED,
} from '../config/rabbitmq.js';
import { publishPaymentEvent } from '../utils/rabbitmqPublisher.js';
import { createCheckoutSession } from '../services/stripeService.js';
import { prisma } from '../config/database.js';

// Shape of the message the order service publishes
interface OrderConfirmedMessage {
  orderId: string;
  userId: string;
  amount: number;   
  currency: string;  // e.g. "usd"
  items: Array<{ name: string; quantity: number; price: number }>;
}

export async function startOrderConsumer(): Promise<void> {
  const channel = await rabbitMQ.getChannel();

  // Process one message at a time so a slow Stripe call doesn't pile up
  channel.prefetch(1);

  channel.consume(QUEUE_PAYMENT_SERVICE, async (msg) => {
    if (!msg) return;

    let data: OrderConfirmedMessage;
    try {
      data = JSON.parse(msg.content.toString()) as OrderConfirmedMessage;
    } catch {
      logger.error('Received non-JSON message on payment_service_queue — discarding');
      channel.nack(msg, false, false);
      return;
    }

    logger.info({ orderId: data.orderId }, 'Processing order.confirmed message');

    try {
      // 1. Create a PENDING payment transaction in the database
      const txn = await prisma.payment_transaction.create({
        data: {
          order_id: Number(data.orderId),
          user_uuid: data.userId,
          gateway: 'stripe',
          status: 'PENDING',
          amount: data.amount,
          currency: data.currency.toUpperCase(),
          created_by: data.userId,
          status_history: {
            create: { status: 'PENDING', changed_by: data.userId },
          },
        },
      });

      // 2. Build a readable description for the Stripe checkout page
      const description = data.items.length
        ? data.items.map((i) => `${i.name} x${i.quantity}`).join(', ')
        : `Payment for Order #${data.orderId}`;

      // 3. Create the Stripe Checkout Session
      const { url, sessionId } = await createCheckoutSession({
        orderId: data.orderId,
        transactionId: txn.id,
        amount: data.amount,
        currency: data.currency,
        description,
      });

      // 4. Store the Stripe session ID against the transaction for later webhook lookup
      await prisma.payment_transaction.update({
        where: { id: txn.id },
        data: { gateway_ref: sessionId },
      });

      // 5. Publish payment.session_created so the order service can give the
      //    checkout URL back to the user / frontend
      await publishPaymentEvent(RK_PAYMENT_SESSION_CREATED, {
        orderId: data.orderId,
        transactionId: txn.id,
        checkoutUrl: url,
        stripeSessionId: sessionId,
        status: 'PENDING',
      });

      logger.info(
        { orderId: data.orderId, transactionId: txn.id, checkoutUrl: url },
        'Stripe session created and payment.session_created published'
      );

      channel.ack(msg);
    } catch (err) {
      logger.error({ err, orderId: data.orderId }, 'Failed to process order.confirmed');
      // nack without requeue — avoids infinite retry loop.
      // In production, wire up a dead-letter exchange here.
      channel.nack(msg, false, false);
    }
  });

  logger.info('Order consumer started — listening on payment_service_queue');
}
