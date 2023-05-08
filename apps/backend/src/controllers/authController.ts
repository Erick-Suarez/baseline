import { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

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
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No auth token" });

  jwt.verify(token, process.env.JWT_SECRET!, (err, data) => {
    if (err) {
      req.log.info(err);
      return res.status(403).json({ message: "Forbidden" });
    }

    const authenticatedRequest = req as AuthenticatedRequest;
    authenticatedRequest.user = data as User;
    req.log = req.log.child({ userId: authenticatedRequest.user });

    next();
  });
}
