import { Request, Response, NextFunction } from 'express';
import { HttpStatusCode } from "@baselinedocs/shared";

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    return next(err);
  }

  // Default Values for non-custom Errors
  const status = HttpStatusCode.INTERNAL_SERVER_ERROR;

  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  req.log.info(err);

  res.status(status).json({error: err });
};
