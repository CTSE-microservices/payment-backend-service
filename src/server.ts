import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { logger } from "./utils/logger.js";
import { connectRabbitMQ } from "./config/rabbitmqConnection.js";
import { startOrderCreatedConsumer } from "./consumers/orderCreated.consumer.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectRabbitMQ();
    await startOrderCreatedConsumer();

    app.listen(PORT, () => {
      logger.info(`🚀 Payment Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:");
    process.exit(1);
  }
};

startServer();
