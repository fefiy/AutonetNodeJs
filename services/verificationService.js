// services/verificationService.js
import pool from "../config/db.js";
import { sendVerificationEmail } from "../emails/index.js";
import crypto from "crypto";

// Generate token
const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Send verification email (creates token and sends email)
export const sendVerificationEmailToUser = async (userId, email, firstName) => {
  try {
    // Delete any existing verification for this user
    await pool.query("DELETE FROM email_verifications WHERE user_id = $1", [
      userId,
    ]);

    // Generate new token (expires in 24 hours)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Insert verification record
    await pool.query(
      `INSERT INTO email_verifications (user_id, token, expires_at)
             VALUES ($1, $2, $3)`,
      [userId, token, expiresAt],
    );

    // Send email
    await sendVerificationEmail(email, firstName, userId, token);

    return { success: true, token };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error: error.message };
  }
};

// Verify email with token
export const verifyEmailWithToken = async (userId, token) => {
  try {
    // Check if verification exists and not expired
    const result = await pool.query(
      `SELECT ev.*, u.email_confirmed
             FROM email_verifications ev
             JOIN users u ON ev.user_id = u.id
             WHERE ev.user_id = $1 
               AND ev.token = $2 
               AND ev.expires_at > CURRENT_TIMESTAMP`,
      [userId, token],
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: "Invalid or expired verification token",
      };
    }

    const verification = result.rows[0];

    // Check if already verified
    if (verification.email_confirmed) {
      return {
        success: false,
        error: "Email already verified",
      };
    }

    // Update user as verified
    await pool.query("UPDATE users SET email_confirmed = true WHERE id = $1", [
      userId,
    ]);

    // Delete verification record (optional, cron will clean up anyway)
    await pool.query("DELETE FROM email_verifications WHERE id = $1", [
      verification.id,
    ]);

    return { success: true, message: "Email verified successfully" };
  } catch (error) {
    console.error("Email verification error:", error);
    return { success: false, error: "Internal server error" };
  }
};
