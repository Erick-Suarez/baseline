import { authenticateToken } from "../controllers/authController.js";
import express, { Router } from "express";
import {
  updateUserDisplayName,
  updateUserPassword,
} from "../controllers/userController.js";

const router: Router = express.Router();

router.use(authenticateToken);

router.patch("/name", updateUserDisplayName);
router.patch("/password", updateUserPassword);

export default router;
