import { Router } from "express";
import {
  getAllGarages,
  getGarageById,
  getGaragesByUserId,
  getGaragesWithFilters,
  createGarage,
  updateGarage,
  deleteGarage,
  deleteUserGarages,
} from "../controllers/garage.controller.js";

const router = Router();

// GET routes
router.get("/", getAllGarages);
router.get("/search", getGaragesWithFilters);
router.get("/:id", getGarageById);
router.get("/user/:userId", getGaragesByUserId);

// POST routes
router.post("/", createGarage);

// PUT routes
router.put("/:id", updateGarage);

// DELETE routes
router.delete("/:id", deleteGarage);
router.delete("/user/:userId", deleteUserGarages);

export default router;
