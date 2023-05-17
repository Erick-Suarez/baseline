import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
import { createDataSyncForOrganization } from "./dataSyncController.js";

dotenv.config();

export interface AuthenticatedRequest extends Request {
  user: User;
}

interface User {
  user: { user_id: string; organization_id: string };
}

export async function authenticateProvider(
  req: Request,
  res: Response,
  next: NextFunction,
  provider: string
) {
  try {
    if (!req.query.state || !req.query.code) {
      req.log.info("Missing query params from github oauth callback", req.query);
      return res.status(400).json({ message: "Missing query params" });
    }
    const stateObj = JSON.parse(decodeURIComponent(req.query.state as string));
    const organization_id = stateObj.organization_id;

    await createDataSyncForOrganization(
      Number(organization_id),
      req.query.code as string,
      provider
    );
    return res.redirect(`${process.env.BASELINE_FRONTEND_URL}/manageData`);
  } catch (err) {
    return next(err);
  }
}
