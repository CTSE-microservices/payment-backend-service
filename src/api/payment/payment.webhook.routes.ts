import express from "express";
import { stripeWebhookController } from "./payment.webhook.controller.js";

const router = express.Router();

router.post("/stripe", stripeWebhookController);

export default router;
