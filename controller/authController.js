import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { getClientIp, getUserAgent } from "../common/auth.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import {
  sendVerificationEmailToUser,
  verifyEmailWithToken,
} from "../services/verificationService.js";
export const register = async (req, res) => {
  const { email, password, first_name, last_name, role, phone_number } =
    req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if user exists
    const existingUser = await client.query(
      "SELECT id, email_confirmed FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];

      if (!user.email_confirmed) {
        // Resend verification
        await sendVerificationEmailToUser(user.id, email, first_name);
        await client.query("COMMIT");

        return res.status(200).json({
          message:
            "Email already registered but not verified. New verification email sent.",
        });
      }

      return res.status(409).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await client.query(
      `INSERT INTO users (email, password, first_name, last_name, role, phone_number, email_confirmed)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, email, first_name, last_name, role`,
      [
        email,
        hashedPassword,
        first_name,
        last_name,
        role || "user",
        phone_number,
        false,
      ],
    );

    const user = result.rows[0];

    await client.query("COMMIT");

    // Send verification email
    await sendVerificationEmailToUser(user.id, user.email, user.first_name);

    res.status(201).json({
      message:
        "User registered successfully. Please check your email to verify your account.",
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

export const loginWithEmail = async (req, res) => {
  const { email, password } = req.body;
  console.log("login with email", email);
  const user_agent = getUserAgent(req);
  const ip = getClientIp(req);
  const client = await client.connect();
  try {
    const userResult = await client.query(
      `SELECT id, email, password, role, email_confirmed, first_name
             FROM users 
             WHERE email = $1`,
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    // Check if email is verified
    if (!user.email_confirmed) {
      // Send verification email
      await sendVerificationEmailToUser(user.id, user.email, user.first_name);

      return res.status(403).json({
        error:
          "Email not verified. Please check your email to verify your account.",
        email_verified: false,
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create session
    const sessionResult = await client.query(
      `INSERT INTO sessions (user_id, user_agent, ip, expires_at, last_activity)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
      [
        user.id,
        user_agent,
        ip,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        new Date(),
      ],
    );

    const session_id = sessionResult.rows[0].id;

    // Create refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    await client.query(
      `INSERT INTO refresh_tokens (token, user_id, session_id, expires_at)
             VALUES ($1, $2, $3, $4)`,
      [refreshToken, user.id, session_id, refreshTokenExpiresAt],
    );

    // Update last login
    await client.query("UPDATE users SET last_login = $1 WHERE id = $2", [
      new Date(),
      user.id,
    ]);

    // Generate JWT
    const jwtToken = jwt.sign(
      { user_id: user.id, role: user.role, session_id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15m" },
    );
    await client.query("COMMIT");

    res.json({
      jwt_token: jwtToken,
      refresh_token: refreshToken,
      session_id: session_id,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        email_confirmed: user.email_confirmed,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

export const verifyEmail = async (req, res) => {
  const { userId, token } = req.body;
  const client = await client.connect();

  if (!userId || !token) {
    return res.status(400).json({
      error: "Invalid verification link",
    });
  }

  try {
    const result = await verifyEmailWithToken(userId, token);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const user_agent = getUserAgent(req);
    const ip = getClientIp(req);
    const sessionResult = await pool.query(
      `INSERT INTO sessions (user_id, user_agent, ip, expires_at, last_activity)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
      [
        user.id,
        user_agent,
        ip,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        new Date(),
      ],
    );

    const session_id = sessionResult.rows[0].id;

    // Create refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    await client.query(
      `INSERT INTO refresh_tokens (token, user_id, session_id, expires_at)
             VALUES ($1, $2, $3, $4)`,
      [refreshToken, user.id, session_id, refreshTokenExpiresAt],
    );

    // Update last login
    await client.query("UPDATE users SET last_login = $1 WHERE id = $2", [
      new Date(),
      user.id,
    ]);

    // Generate JWT
    const jwtToken = jwt.sign(
      { user_id: user.id, role: user.role, session_id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15m" },
    );
    await client.query("COMMIT");
    res.json({
      jwt_token: jwtToken,
      refresh_token: refreshToken,
      session_id: session_id,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        email_confirmed: user.email_confirmed,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("erify error:", error);
  } finally {
    client.release();
  }
};

export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const userResult = await pool.query(
      `SELECT id, first_name, email_confirmed 
             FROM users 
             WHERE email = $1`,
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    if (user.email_confirmed) {
      return res.status(400).json({ error: "Email already verified" });
    }

    // Send verification email
    const result = await sendVerificationEmailToUser(
      user.id,
      email,
      user.first_name,
    );

    if (!result.success) {
      return res
        .status(500)
        .json({ error: "Failed to send verification email" });
    }

    res.json({
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const logout = async (req, res) => {
  const { session_id, token } = req.body;

  try {
    if (token) {
      await pool.query(
        "UPDATE refresh_tokens SET revoked = true, revoked_at = $1 WHERE token = $2",
        [new Date(), token],
      );
    }

    if (session_id) {
      await pool.query("UPDATE sessions SET is_active = false WHERE id = $1", [
        session_id,
      ]);
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
