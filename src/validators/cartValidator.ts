import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const validateCartItem = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
    price: Joi.number().min(0).required()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};
