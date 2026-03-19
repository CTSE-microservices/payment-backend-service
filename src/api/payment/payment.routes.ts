import express from "express";
import { getPaymentByOrderIdController } from "./payment.controller.js";

const router = express.Router();

router.get("/order/:orderId", getPaymentByOrderIdController);

export default router;
