import { authenticateToken } from "../controllers/authController.js";
import { deleteDataSync } from "../controllers/dataSyncController.js";
import {
  createIndexFromRepository,
  deleteIndexForRepository,
} from "../controllers/embeddingIndexController.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.use(authenticateToken);

router.post("/", createIndexFromRepository);
router.delete("/", deleteIndexForRepository);

export default router;
