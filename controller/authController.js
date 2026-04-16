import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { getClientIp, getUserAgent, generateToken } from "../utils/helpers.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import passport from "passport";
import {
  sendVerificationEmailToUser,
  verifyEmailWithToken,
} from "../services/verificationService.js";

// Register with email
export const register = async (req, res) => {
  const { email, password, first_name, last_name, role, phone_number } =
    req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if user exists
    const existingUser = await client.query(
      "SELECT id, email_confirmed, provider FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];

      if (user.provider !== "email") {
        return res.status(409).json({
          error: `Email already registered with ${user.provider}. Please login with ${user.provider}.`,
        });
      }

      if (!user.email_confirmed) {
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
      `INSERT INTO users (email, password, first_name, last_name, role, phone_number, email_confirmed, provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, first_name, last_name, role, provider`,
      [
        email,
        hashedPassword,
        first_name,
        last_name,
        role || "user",
        phone_number,
        false,
        "email",
      ],
    );

    const user = result.rows[0];
    await client.query("COMMIT");

    // Send verification email
    await sendVerificationEmailToUser(user.id, user.email, user.first_name);

    res.status(201).json({
      message:
        "User registered successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

// Login with email
export const loginWithEmail = async (req, res) => {
  const { email, password } = req.body;
  const user_agent = getUserAgent(req);
  const ip = getClientIp(req);
  const client = await pool.connect();

  try {
    const userResult = await client.query(
      `SELECT id, email, password, role, email_confirmed, first_name, provider
       FROM users 
       WHERE email = $1`,
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    // Check provider
    if (user.provider !== "email") {
      return res.status(401).json({
        error: `This email is registered with ${user.provider}. Please login with ${user.provider}.`,
        provider: user.provider,
      });
    }

    // Check if email is verified
    if (!user.email_confirmed) {
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
      `INSERT INTO sessions (user_id, user_agent, ip, expires_at, last_activity, provider)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        user.id,
        user_agent,
        ip,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        new Date(),
        "email",
      ],
    );

    const session_id = sessionResult.rows[0].id;
    const refreshToken = generateToken();
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
      { user_id: user.id, role: user.role, session_id, provider: "email" },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15m" },
    );

    await client.query("COMMIT");

    res.json({
      access_token: jwtToken,
      refresh_token: refreshToken,
      session_id: session_id,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        email_confirmed: user.email_confirmed,
        provider: user.provider,
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

// Verify email
export const verifyEmail = async (req, res) => {
  const { userId, token } = req.body;
  const client = await pool.connect();

  if (!userId || !token) {
    return res.status(400).json({ error: "Invalid verification link" });
  }

  try {
    const result = await verifyEmailWithToken(userId, token);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const user_agent = getUserAgent(req);
    const ip = getClientIp(req);

    const userResult = await client.query(
      `SELECT id, email, role, email_confirmed, first_name, provider
       FROM users 
       WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    const sessionResult = await client.query(
      `INSERT INTO sessions (user_id, user_agent, ip, expires_at, last_activity, provider)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        user.id,
        user_agent,
        ip,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        new Date(),
        user.provider,
      ],
    );

    const session_id = sessionResult.rows[0].id;
    const refreshToken = generateToken();
    const refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    await client.query(
      `INSERT INTO refresh_tokens (token, user_id, session_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [refreshToken, user.id, session_id, refreshTokenExpiresAt],
    );

    await client.query("UPDATE users SET last_login = $1 WHERE id = $2", [
      new Date(),
      user.id,
    ]);

    const jwtToken = jwt.sign(
      {
        user_id: user.id,
        role: user.role,
        session_id,
        provider: user.provider,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15m" },
    );

    await client.query("COMMIT");

    res.json({
      access_token: jwtToken,
      refresh_token: refreshToken,
      session_id: session_id,
      user: user,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Verify error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

// Google Auth
export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
  session: true,
});

// Google Auth Callback
export const googleAuthCallback = (req, res, next) => {
  passport.authenticate(
    "google",
    {
      session: true,
      failureRedirect: `${process.env.APP_URL}/login?error=google_auth_failed`,
    },
    async (err, user, info) => {
      if (err || !user) {
        console.error("Google auth error:", err);
        return res.redirect(
          `${process.env.APP_URL}/login?error=google_auth_failed`,
        );
      }

      const client = await pool.connect();

      try {
        const user_agent = getUserAgent(req);
        const ip = getClientIp(req);

        // Create session
        const sessionResult = await client.query(
          `INSERT INTO sessions (user_id, user_agent, ip, expires_at, last_activity, provider)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
          [
            user.id,
            user_agent,
            ip,
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            new Date(),
            "google",
          ],
        );

        const session_id = sessionResult.rows[0].id;
        const refreshToken = generateToken();
        const refreshTokenExpiresAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        );

        await client.query(
          `INSERT INTO refresh_tokens (token, user_id, session_id, expires_at)
         VALUES ($1, $2, $3, $4)`,
          [refreshToken, user.id, session_id, refreshTokenExpiresAt],
        );

        await client.query("UPDATE users SET last_login = $1 WHERE id = $2", [
          new Date(),
          user.id,
        ]);

        const jwtToken = jwt.sign(
          { user_id: user.id, role: user.role, session_id, provider: "google" },
          process.env.JWT_SECRET_KEY,
          { expiresIn: "15m" },
        );

        await client.query("COMMIT");

        // Redirect to frontend
        const redirectUrl = `${process.env.APP_URL}/auth/google-callback?access_token=${jwtToken}&refresh_token=${refreshToken}&session_id=${session_id}&provider=google`;
        return res.redirect(redirectUrl);
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("Google callback error:", error);
        return res.redirect(
          `${process.env.APP_URL}/login?error=internal_server_error`,
        );
      } finally {
        client.release();
      }
    },
  )(req, res, next);
};

// Get current user information
export const getCurrentUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
   
    const userId = req.user.user_id; // From the authenticateToken middleware
    
    console.log("Getting current user for ID:", userId);
    
    const result = await client.query(
      `SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        role, 
        email_confirmed,
        phone_number,
        provider,
        created_at,
        last_login
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = result.rows[0];
    console.log("User found:", user.email);
    
    res.json(user);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  console.log("resend erification email", email);
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
  const client = await pool.connect();
  console.log("logout logout logout");
  try {
    if (token) {
      await client.query(
        "UPDATE refresh_tokens SET revoked = true, revoked_at = $1 WHERE token = $2",
        [new Date(), token],
      );
    }

    if (session_id) {
      await client.query(
        "UPDATE sessions SET is_active = false WHERE id = $1",
        [session_id],
      );
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
