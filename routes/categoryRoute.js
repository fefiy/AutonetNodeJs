import { Router } from "express";
import {
  addCategory,
  getCategoriesHierarchy,
  updateCategory,
} from "../controller/categoryController.js";

const router = Router();

router.post("/create", addCategory);
router.get("/", getCategoriesHierarchy);
router.put("/:id", updateCategory);

export default router;
