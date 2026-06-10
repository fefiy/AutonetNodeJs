import { Router } from "express";

import {
  deleteCarModel,
  updateCarModel,
  getCarModels,
  addCarModel,
} from "../controller/carModelController.js";
const router = Router();

router.post("/", addCarModel);
router.get("/", getCarModels);
router.put("/:id", updateCarModel);
router.delete("/:id", deleteCarModel);

export default router;
