import { Router } from "express";
import {
  addItemBrand,
  getAllItemBrands,
  updateItemBrand

} from "../controller/itemBrandController.js";

const router = Router();

router.post("/create",addItemBrand)
router.get("/",getAllItemBrands)
router.put("/update/:id", updateItemBrand);


export default router;