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
  provider: string
) {
  if (!req.query.state || !req.query.code) {
    req.log.info("Missing query params from github oauth callback", req.query);
    return res.status(400).json({ message: "Missing query params" });
  }
  try {
    const stateObj = JSON.parse(decodeURIComponent(req.query.state as string));
    const organization_id = stateObj.organization_id;

    await createDataSyncForOrganization(
      Number(organization_id),
      req.query.code as string,
      provider
    );

    // redirect the user back to the manageData page
    res.redirect(`${process.env.BASELINE_FRONTEND_URL}/manageData`);
  } catch (error) {
    req.log.info(error);
    res.sendStatus(500);
  }
}
