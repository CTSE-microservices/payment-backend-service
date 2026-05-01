import Stripe from 'stripe';
import { logger } from '../utils/logger.js';

// Stripe client — initialised once from env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export interface CheckoutSessionResult {
  url: string;
  sessionId: string;
}

/**
 * Creates a Stripe Checkout Session for the given order.
 * amount must be in the smallest currency unit (cents for USD).
 * Returns the hosted checkout URL and the session ID.
 */
export async function createCheckoutSession(params: {
  orderId: string;
  transactionId: number;
  amount: number;
  currency: string;
  description: string;
}): Promise<CheckoutSessionResult> {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: {
            name: `Order #${params.orderId}`,
            description: params.description,
          },
          // Stripe expects amount in smallest currency unit (cents)
          unit_amount: params.amount,
        },
        quantity: 1,
      },
    ],
    // These metadata fields come back in the webhook so we can tie the
    // Stripe session back to our DB records without a separate DB lookup.
    metadata: {
      orderId: params.orderId,
      transactionId: String(params.transactionId),
    },
    success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/payment/cancel?orderId=${params.orderId}`,
  });

  logger.info({ sessionId: session.id, orderId: params.orderId }, 'Stripe checkout session created');

  return { url: session.url!, sessionId: session.id };
}

/**
 * Verifies the Stripe webhook signature and returns the parsed event.
 * Throws if the signature is invalid — the controller should return 400.
 */
export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
