import { authenticateToken } from "../controllers/authController.js";
import { geRepositoriesWithEmbeddingsForOrganizationId } from "../controllers/repositoryController.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.use(authenticateToken);

router.get("/:organization_id", geRepositoriesWithEmbeddingsForOrganizationId);

export default router;
