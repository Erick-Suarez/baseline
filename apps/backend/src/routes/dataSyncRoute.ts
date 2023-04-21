import { authenticateToken } from "../controllers/authController.js";
import {
  deleteDataSync,
  getDataSyncsForOrganization,
} from "../controllers/dataSyncController.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.use(authenticateToken);

router.get("/:organization_id", getDataSyncsForOrganization);

router.delete("/", deleteDataSync);

export default router;
