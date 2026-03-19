import { Request, Response } from "express";
import { getPaymentByOrderId } from "./payment.service.js";

export const getPaymentByOrderIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const orderId = Number(req.params.orderId);

    if (Number.isNaN(orderId)) {
      return res.status(400).json({
        message: "Invalid orderId",
      });
    }

    const payment = await getPaymentByOrderId(orderId);

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    return res.json(payment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
