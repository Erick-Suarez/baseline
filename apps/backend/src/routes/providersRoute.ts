import express, { Router, Request, Response } from "express";

import { authenticateProvider } from "../controllers/providersController.js";
const router: Router = express.Router();

router.get("/github/auth/callback", (req: Request, res: Response) => {
  authenticateProvider(req, res, "github");
});

router.get("/gitlab/auth/callback", (req: Request, res: Response) => {
  authenticateProvider(req, res, "gitlab");
});

export default router;
