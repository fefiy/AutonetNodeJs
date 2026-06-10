import { Router } from "express";
import {
  getFeaturedProducts,
  addFeaturedProduct,
  removeFeaturedProduct,
  toggleFeaturedStatus,
} from "../controller/featuredProductsController.js";

const router = Router();

router.get("/", getFeaturedProducts);
router.post("/", addFeaturedProduct);
router.delete("/:id", removeFeaturedProduct);
router.patch("/:id/toggle", toggleFeaturedStatus);

export default router;
