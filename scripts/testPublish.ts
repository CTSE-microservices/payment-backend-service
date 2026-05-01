/**
 * Manual test script — publishes a fake order.confirmed message to RabbitMQ.
 *
 * This simulates what the order service will do in production so you can
 * test the payment service consumer + Stripe flow without the real order service.
 *
 * Usage:
 *   npx tsx scripts/testPublish.ts
 *
 * What happens after you run this:
 *   1. Message lands on payment_service_queue
 *   2. orderConsumer picks it up
 *   3. A payment_transaction row is created in the DB (PENDING)
 *   4. A Stripe Checkout Session is created
 *   5. payment.session_created is published to payment_events exchange
 *   6. The checkout URL is logged — open it in your browser to pay
 *   7. Stripe calls the webhook → payment.success is published
 */

import amqplib from 'amqplib';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const EXCHANGE_ORDER_EVENTS = 'order_events';
const QUEUE_PAYMENT_SERVICE = 'payment_service_queue';
const RK_ORDER_CONFIRMED = 'order.confirmed';

// ── Edit this payload to match what you want to test ─────────────────────
const testMessage = {
  orderId: '1006',              // Must match an order in your DB (or any ID for a smoke test)
  userId: '00000000-0000-0000-0000-000000000001',
  amount: 3400,                 // 2500 cents = $25.00 USD
  currency: 'usd',
  items: [
    { name: 'Blue T-Shirt', quantity: 2, price: 1000 },
    { name: 'Black Jeans',  quantity: 1, price: 500  },
  ],
};
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.RABBITMQ_URL;
  if (!url || url.includes('YOUR_')) {
    console.error('ERROR: RABBITMQ_URL is not set in .env — add your CloudAMQP URL first.');
    process.exit(1);
  }

  console.log('Connecting to RabbitMQ…');
  const conn = await amqplib.connect(url);
  const channel = await conn.createChannel();

  // Ensure the exchange and queue exist (idempotent)
  await channel.assertExchange(EXCHANGE_ORDER_EVENTS, 'topic', { durable: true });
  await channel.assertQueue(QUEUE_PAYMENT_SERVICE, { durable: true });
  await channel.bindQueue(QUEUE_PAYMENT_SERVICE, EXCHANGE_ORDER_EVENTS, RK_ORDER_CONFIRMED);

  const payload = Buffer.from(JSON.stringify(testMessage));
  channel.publish(EXCHANGE_ORDER_EVENTS, RK_ORDER_CONFIRMED, payload, { persistent: true });

  console.log('');
  console.log('✓ Published order.confirmed message:');
  console.log(JSON.stringify(testMessage, null, 2));
  console.log('');
  console.log('Now watch your payment service logs.');
  console.log('You should see:');
  console.log('  1. "Processing order.confirmed message"');
  console.log('  2. "Stripe checkout session created"');
  console.log('  3. "Payment event published" (payment.session_created)');
  console.log('  4. A Stripe checkout URL in the logs — open it to complete payment');

  await channel.close();
  await conn.close();
}

main().catch((err) => {
  console.error('Test publish failed:', err);
  process.exit(1);
});
