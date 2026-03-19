import app from "./app.js";
import { logger } from "./utils/logger.js";
import { connectRabbitMQ } from "./config/rabbitmqConnection.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
  
    await connectRabbitMQ();

   
    app.listen(PORT, () => {
      logger.info(`🚀 Payment Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:");
    process.exit(1);
  }
};

startServer();
