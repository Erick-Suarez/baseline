import express, { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
import { parseCookies } from "nookies";
import * as jwt from "jsonwebtoken";

dotenv.config();

export interface AuthenticatedRequest extends Request {
  user: User;
}

interface User {
  user: { user_id: string; organization_id: string };
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsedCookies = parseCookies({ req });

  const accessToken = parsedCookies["baseline.access-token"] as
    | string
    | undefined;

  if (!accessToken) {
    return res.sendStatus(401);
  }

  jwt.verify(accessToken, process.env.JWT_SECRET!, (err, data) => {
    if (err) {
      return res.sendStatus(403);
    }

    const authenticatedRequest = req as AuthenticatedRequest;
    authenticatedRequest.user = data as User;

    next();
  });
}
