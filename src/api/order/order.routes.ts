import express from "express";
import { publishOrderCreatedController } from "./order.controller.js";

const router = express.Router();

// Dev/test route
router.post("/publish", publishOrderCreatedController);

export default router;
