import express, { Router, Request, Response, NextFunction } from "express";

import { authenticateProvider } from "../controllers/providersController.js";
const router: Router = express.Router();

router.get("/github/auth/callback", (req: Request, res: Response, next: NextFunction) => {
  authenticateProvider(req, res, next, "github");
});

router.get("/gitlab/auth/callback", (req: Request, res: Response, next: NextFunction) => {
  authenticateProvider(req, res, next, "gitlab");
});

export default router;
