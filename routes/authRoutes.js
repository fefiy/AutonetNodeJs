import { Router } from "express";
import {
  loginWithEmail,
  register,
  verifyEmail,
  resendVerificationEmail,
  logout,
  googleAuth,
  googleAuthCallback,
  getCurrentUser
} from "../controller/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
const router = Router();

router.post("/login", loginWithEmail);
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend/verification-email", resendVerificationEmail);
router.post("/logout", logout);
router.get("/google", googleAuth);
router.get("/google/callback", googleAuthCallback);
router.get("/me", authenticateToken, getCurrentUser);



export default router;
