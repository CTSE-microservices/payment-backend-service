import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const validateDiscount = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    code: Joi.string().required(),
    orderAmount: Joi.number().min(0).required()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};
