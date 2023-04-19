import { geRepositoriesWithEmbeddingsForOrganizationId } from "../controllers/repositoryController.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.get("/:organization_id", geRepositoriesWithEmbeddingsForOrganizationId);

export default router;
