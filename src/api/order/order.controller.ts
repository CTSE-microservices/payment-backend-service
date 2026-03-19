import { Request, Response } from "express";
import { publishOrderCreated } from "./order.publisher.js";

export const publishOrderCreatedController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { orderId, userId, amount, currency } = req.body;

    if (!orderId || !userId || !amount || !currency) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    console.log("✅ /api/order/publish hit");

    await publishOrderCreated({
      orderId,
      userId,
      amount,
      currency,
    });

    return res.json({
      message: "order.created event published successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to publish event",
    });
  }
};
