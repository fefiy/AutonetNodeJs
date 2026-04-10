import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET_K || "your-secret-key";
const JWT_EXPIRES_IN = "15m";

export const getClientIp = (req) => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return realIp;
  }

  return req.socket.remoteAddress || req.connection.remoteAddress || req.ip;
};

export const getUserAgent = (req) => {
  return req.headers["user-agent"] || "Unknown";
};
export const generateJwtToken = (user_id, role, session_id) => {
  return jwt.sign({ user_id, role, session_id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const generateRandomRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

