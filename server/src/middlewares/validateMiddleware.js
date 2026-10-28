import { z } from 'zod';

export const validate = (schema, target = 'body') => {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[target];
      const parsedData = await schema.parseAsync(dataToValidate);
      req[target] = parsedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }
      return next(error);
    }
  };
};
