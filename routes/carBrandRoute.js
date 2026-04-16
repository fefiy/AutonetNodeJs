import { Router } from "express";
import {
  addCarBrand,
  updateCarBrand,
   deleteCarBrand,
   getAllCarBrands,
   getCarBrandById
} from "../controller/carBrandController.js";

const router = Router();

router.post("/create",addCarBrand)
router.get("/",getAllCarBrands)


export default router;