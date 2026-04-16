import { Router } from "express";
import {
  addItemBrand,

} from "../controller/itemBrandController.js";

const router = Router();

router.post("/create",addItemBrand)


export default router;