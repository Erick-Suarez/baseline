import {
  deleteDataSync,
  getDataSyncsForOrganization,
} from "../controllers/dataSyncController.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.get("/:organization_id", getDataSyncsForOrganization);

router.delete("/", deleteDataSync);

export default router;
