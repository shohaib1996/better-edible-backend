import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

interface ValidateSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validates req.body, req.query, and/or req.params against Zod schemas.
 * On failure, passes a ZodError to next() which the global errorHandler catches.
 */
export const validate = (schemas: ValidateSchemas) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) return next(result.error);
      req.body = result.data; // replace with parsed/coerced data
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) return next(result.error);
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
      });
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) return next(result.error);
      Object.defineProperty(req, "params", {
        value: result.data,
        writable: true,
        configurable: true,
      });
    }

    next();
  };
};
