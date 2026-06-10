// routes/engineTypeRoutes.js
import { Router } from "express";
import {
  addEngineType,
  getEngineTypes,
  updateEngineType,
  deleteEngineType,
} from "../controller/engineTypeController.js";

const router = Router();

router.post("/", addEngineType);
router.get("/", getEngineTypes);
router.put("/:id", updateEngineType);
router.delete("/:id", deleteEngineType);

export default router;
