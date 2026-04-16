import { Router } from "express";
import {
  addCategory,
  getCategoriesHierarchy
} from "../controller/categoryController.js";

const router = Router();

router.post("/create",addCategory)
router.get("/",getCategoriesHierarchy)


export default router;