import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const validateOrder = (req: Request, res: Response, next: NextFunction) => {
  // Add order validation logic if needed
  next();
};
