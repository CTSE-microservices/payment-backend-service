import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service.js';
import { constructWebhookEvent } from '../../services/stripeService.js';
import { logger } from '../../utils/logger.js';

function getUserUuid(req: Request): string {
  // jwtMiddleware attaches the decoded user_uuid claim to req.user_uuid
  return req.user_uuid ?? '';
}

export class PaymentController {
  static async initiate(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, amount, currency, gateway } = req.body as {
        orderId: number;
        amount: number;
        currency?: string;
        gateway?: string;
      };
      if (!orderId || !amount) {
        return res.status(400).json({ message: 'orderId and amount are required' });
      }
      const txn = await PaymentService.initiatePayment({
        orderId,
        amount,
        currency,
        gateway,
        userUuid: getUserUuid(req),
      });
      return res.status(201).json(txn);
    } catch (err) {
      next(err);
    }
  }

  static async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const transactionId = parseInt(String(req.params.transactionId), 10);
      if (isNaN(transactionId)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      const { gatewayRef } = req.body as { gatewayRef?: string };
      const authHeader = req.headers.authorization ?? '';
      const txn = await PaymentService.confirmPayment(transactionId, {
        gatewayRef,
        userUuid: getUserUuid(req),
        authToken: authHeader.replace('Bearer ', ''),
      });
      return res.json(txn);
    } catch (err) {
      next(err);
    }
  }

  static async fail(req: Request, res: Response, next: NextFunction) {
    try {
      const transactionId = parseInt(String(req.params.transactionId), 10);
      if (isNaN(transactionId)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      const txn = await PaymentService.failPayment(transactionId, getUserUuid(req));
      return res.json(txn);
    } catch (err) {
      next(err);
    }
  }

  static async getByOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = parseInt(String(req.params.orderId), 10);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }
      const txn = await PaymentService.getByOrder(orderId);
      if (!txn) return res.status(404).json({ message: 'No payment found for this order' });
      return res.json(txn);
    } catch (err) {
      next(err);
    }
  }

  static async getTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(String(req.params.transactionId), 10);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid transaction ID' });
      const txn = await PaymentService.getTransaction(id);
      if (!txn) return res.status(404).json({ message: 'Transaction not found' });
      return res.json(txn);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payment/webhook/stripe
   *
   * Stripe calls this URL after every payment event.
   * The route must NOT go through express.json() — it needs the raw body
   * to verify the webhook signature (handled in app.ts with express.raw()).
   */
  static async stripeWebhook(req: Request, res: Response) {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.warn('Stripe webhook received without signature');
      return res.status(400).json({ message: 'Missing stripe-signature header' });
    }

    let event;
    try {
      // req.body is a raw Buffer here (express.raw middleware applied in app.ts)
      event = constructWebhookEvent(req.body as Buffer, signature);
    } catch (err) {
      logger.error({ err }, 'Stripe webhook signature verification failed');
      return res.status(400).json({ message: 'Webhook signature verification failed' });
    }

    logger.info({ type: event.type }, 'Stripe webhook event received');

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as {
            id: string;
            payment_intent: string;
            payment_status: string;
          };
          if (session.payment_status === 'paid') {
            await PaymentService.handleStripeSuccess(session.id, session.payment_intent);
          }
          break;
        }

        case 'checkout.session.expired': {
          const session = event.data.object as { id: string };
          await PaymentService.handleStripeFailed(session.id, 'Checkout session expired');
          break;
        }

        case 'payment_intent.payment_failed': {
          // Stripe also sends this for failed card charges
          const intent = event.data.object as {
            id: string;
            last_payment_error?: { message?: string };
          };
          const reason = intent.last_payment_error?.message ?? 'Payment failed';
          // For payment_intent events we don't have a session ID — log and skip
          // The checkout.session.expired event covers the session-level failure
          logger.warn({ intentId: intent.id, reason }, 'payment_intent.payment_failed received');
          break;
        }

        default:
          logger.info({ type: event.type }, 'Unhandled Stripe webhook event — ignoring');
      }
    } catch (err) {
      logger.error({ err, type: event.type }, 'Error processing Stripe webhook');
      // Still return 200 — Stripe retries on non-2xx and we don't want duplicate processing
    }

    // Always acknowledge receipt to Stripe
    return res.json({ received: true });
  }
}
