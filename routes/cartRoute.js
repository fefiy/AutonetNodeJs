import { Router } from "express";
import {
  removeFromCart,
  decreaseQuantity,
  increaseQuantity,
  addToCart,
  getCartByUserId,
} from "../controller/cartController.js";

const router = Router();

router.post("/add", addToCart);
router.get("/id", getCartByUserId);
router.delete("/", removeFromCart);
router.delete("/plus", increaseQuantity);
router.delete("/minus", decreaseQuantity);
export default router;
