import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../../config/stripe.js";

export const stripeWebhookController = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature || typeof signature !== "string") {
      return res.status(400).send("Missing stripe-signature header");
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).send("STRIPE_WEBHOOK_SECRET is not configured");
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret,
    );

    console.log("📩 Stripe webhook received:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log("✅ checkout.session.completed");
        console.log("   session.id:", session.id);
        console.log("   metadata:", session.metadata);

        break;
      }

      case "payment_intent.succeeded": {
        console.log("✅ payment_intent.succeeded");
        break;
      }

      case "payment_intent.payment_failed": {
        console.log("❌ payment_intent.payment_failed");
        break;
      }

      default:
        console.log("ℹ️ Unhandled Stripe event:", event.type);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    const err = error as Error;
    console.error("❌ Stripe webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};
