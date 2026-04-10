import { Router } from "express";
import {
  loginWithEmail,
  register,
  verifyEmail,
  resendVerificationEmail,
} from "../controller/authController.js";

const router = Router();

router.post("/login", loginWithEmail);
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend/verification-email", resendVerificationEmail);


export default router;
