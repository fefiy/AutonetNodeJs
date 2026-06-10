import { Router } from "express";
import {
  createProduct,
  getAllProduct,
  getProducts,
} from "../controller/productController.js";

const router = Router();

router.post("/create", createProduct);
router.get("/", getProducts);
export default router;
