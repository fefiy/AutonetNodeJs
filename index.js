import express from "express";
import dotenv from "dotenv";
dotenv.config();

import pool from "./config/db.js";

import { server, app } from "./socket.js";
import authRoute from "./routes/authRoutes.js";

app.use("/api/auth", authRoute);

const port = process.env.PORT || 4100;
server.listen(port, () => {
  console.log("listening on port " + port);
});
