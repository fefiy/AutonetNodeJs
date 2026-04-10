import pool from "../config/db.js";
import {
  generateRandomRefreshToken,
  generateJwtToken,
} from "../common/auth.js";

export const refresh_token = async (req, res) => {
  const { token, session_id } = req.body;

  if (!token || !session_id) {
    return res.status(400).json({ error: "Token and session_id are required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenResult = await client.query(
      `SELECT rt.*, s.is_active, s.expires_at as session_expires_at
             FROM refresh_tokens rt
             JOIN sessions s ON rt.session_id = s.id
             WHERE rt.token = $1 AND rt.session_id = $2 AND rt.revoked = false`,
      [token, session_id],
    );

    if (tokenResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const refreshTokenRecord = tokenResult.rows[0];

    if (new Date(refreshTokenRecord.expires_at) < new Date()) {
      await client.query("ROLLBACK");
      return res.status(401).json({ error: "Refresh token expired" });
    }

    if (
      !refreshTokenRecord.is_active ||
      (refreshTokenRecord.session_expires_at &&
        new Date(refreshTokenRecord.session_expires_at) < new Date())
    ) {
      await client.query("ROLLBACK");
      return res.status(401).json({ error: "Session is inactive or expired" });
    }

    await client.query(
      "UPDATE refresh_tokens SET revoked = true, revoked_at = $1 WHERE id = $2",
      [new Date(), refreshTokenRecord.id],
    );

    const newRefreshToken = generateRandomRefreshToken();
    const newRefreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    await client.query(
      `INSERT INTO refresh_tokens (token, user_id, session_id, parent_token, expires_at)
             VALUES ($1, $2, $3, $4, $5)`,
      [
        newRefreshToken,
        refreshTokenRecord.user_id,
        session_id,
        token,
        newRefreshTokenExpiresAt,
      ],
    );

    await client.query("UPDATE sessions SET last_activity = $1 WHERE id = $2", [
      new Date(),
      session_id,
    ]);

    const userResult = await client.query(
      "SELECT id, role FROM users WHERE id = $1",
      [refreshTokenRecord.user_id],
    );

    const user = userResult.rows[0];
    const jwtToken = generateJwtToken(user.id, user.role, session_id);

    await client.query("COMMIT");

    res.json({
      jwt_token: jwtToken,
      refresh_token: newRefreshToken,
      session_id: session_id,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Token refresh error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};
