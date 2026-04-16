import { Router } from "express";
import {
  addCompany
} from "../controller/companyController.js";

const router = Router();

router.post("/create", addCompany)


export default router;