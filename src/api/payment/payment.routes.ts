import { Router } from 'express';
import { PaymentController } from './payment.controller.js';
import { jwtMiddleware } from '../../middleware/jwtMiddleware.js';

const router = Router();

// ── Stripe Webhook ─────────────────────────────────────────────────────────
// Must be registered BEFORE jwtMiddleware and BEFORE express.json().
// The raw body is required for Stripe signature verification.
// express.raw() is applied to this path in app.ts.
router.post('/webhook/stripe', PaymentController.stripeWebhook);

// ── Authenticated routes ───────────────────────────────────────────────────
router.use(jwtMiddleware);

// POST /api/payment            — manually initiate a payment for an order
router.post('/', PaymentController.initiate);

// GET  /api/payment/order/:orderId — get payment status for a given order
router.get('/order/:orderId', PaymentController.getByOrder);

// GET  /api/payment/:transactionId — get a specific transaction
router.get('/:transactionId', PaymentController.getTransaction);

// POST /api/payment/:transactionId/confirm — mark payment as succeeded (manual)
router.post('/:transactionId/confirm', PaymentController.confirm);

// POST /api/payment/:transactionId/fail — mark payment as failed (manual)
router.post('/:transactionId/fail', PaymentController.fail);

export default router;
