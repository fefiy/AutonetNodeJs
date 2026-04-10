import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import {
  getClientIp,
  getUserAgent,
  generateRandomRefreshToken,
  generateJwtToken,
} from "../common/auth.js";

export const getActiveSessions = async (req, res) => {
  const { user_id } = req.params;

  try {
    const sessions = await pool.query(
      `SELECT id, user_agent, ip, created_at, last_activity, expires_at, is_active
             FROM sessions
             WHERE user_id = $1 AND is_active = true
             ORDER BY last_activity DESC`,
      [user_id],
    );

    res.json({ sessions: sessions.rows });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const revokeSession = async (req, res) => {
  const { session_id } = req.params;

  try {
    await pool.query("BEGIN");

    // Revoke all refresh tokens for this session
    await pool.query(
      "UPDATE refresh_tokens SET revoked = true, revoked_at = $1 WHERE session_id = $2 AND revoked = false",
      [new Date(), session_id],
    );

    // Deactivate the session
    await pool.query("UPDATE sessions SET is_active = false WHERE id = $1", [
      session_id,
    ]);

    await pool.query("COMMIT");

    res.json({ message: "Session revoked successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Revoke session error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
