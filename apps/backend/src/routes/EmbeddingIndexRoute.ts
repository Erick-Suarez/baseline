import { authenticateToken } from "../controllers/authController.js";
import {
  createIndexFromRepository,
  deleteIndexForRepository,
  updateIndexFromRepository,
} from "../controllers/embeddingIndexController.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.use(authenticateToken);

router.post("/", createIndexFromRepository);
router.post("/update", updateIndexFromRepository);
router.delete("/", deleteIndexForRepository);

export default router;
