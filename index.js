import express from "express";
import dotenv from "dotenv";
dotenv.config();

import pool from "./config/db.js";

import { server, app } from "./socket.js";
import authRoute from "./routes/authRoutes.js";
import companyRoute from "./routes/companyRoute.js"
import categoryRoute from "./routes/categoryRoute.js"
import carBrandRoute from "./routes/carBrandRoute.js"
import itemBrandRoute from "./routes/itemBrandRoute.js"

app.use("/api/auth", authRoute);
app.use("/api/companies",companyRoute)
app.use("/api/categories",categoryRoute)
app.use("/api/car_brands",carBrandRoute)
app.use("/api/item_brands", itemBrandRoute)


const port = process.env.PORT || 4100;
server.listen(port, () => {
  console.log("listening on port " + port);
});
