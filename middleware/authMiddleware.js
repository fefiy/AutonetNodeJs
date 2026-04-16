// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const authenticateToken = async (req, res, next) => {
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log("Decoded token:", decoded);

    // Attach user info to request
    req.user = decoded;

    // Optional: Verify session still exists in database
    const client = await pool.connect();
    try {
      const sessionResult = await client.query(
        "SELECT id FROM sessions WHERE id = $1 AND expires_at > NOW()",
        [decoded.session_id],
      );

      if (sessionResult.rows.length === 0) {
        return res.status(401).json({ error: "Session expired" });
      }
    } finally {
      client.release();
    }

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
