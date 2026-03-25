import express from "express";
import dotenv from "dotenv";
dotenv.config();

import pool from "./config/db.js";


const app = express();
const PORT = 3000;

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Server is running 🚀",
      time: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      error: "Database connection failed ❌",
      details: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
