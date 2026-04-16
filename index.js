import dotenv from "dotenv";
dotenv.config();
import { initializePassport } from "./config/passport.js";
import pool from "./config/db.js";
import session from "express-session";
import passport from "passport";
import { server, app } from "./socket.js";
import authRoute from "./routes/authRoutes.js";
<<<<<<< HEAD
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
  // requestChecksumCalculation: "when_required",
});

app.post("/api/get-presigned-url", async (req, res) => {
  try {
    const { fileName, fileType, unique_file_name } = req.body;

    if (!fileName || !fileType || !unique_file_name) {
      return res.status(400).json({ error: "Missing fileName or fileType" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: "Invalid file type" });
    }

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: unique_file_name,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    console.log("upload url", uploadUrl);
    res.json({
      success: true,
      uploadUrl,
      fileKey: unique_file_name,
      publicUrl: `${process.env.CLOUDFLARE_PUBLIC_URL}/${unique_file_name}`,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

app.use("/api/auth", authRoute);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);
=======
import companyRoute from "./routes/companyRoute.js"
import categoryRoute from "./routes/categoryRoute.js"
import carBrandRoute from "./routes/carBrandRoute.js"
import itemBrandRoute from "./routes/itemBrandRoute.js"

app.use("/api/auth", authRoute);
app.use("/api/companies",companyRoute)
app.use("/api/categories",categoryRoute)
app.use("/api/car_brands",carBrandRoute)
app.use("/api/item_brands", itemBrandRoute)

>>>>>>> 3387124aa3e198ab33a01170f533f14f6337e648

// Initialize Passport (THIS IS CRITICAL)
initializePassport(); // Make sure this is called BEFORE using passport
app.use(passport.initialize());
app.use(passport.session());
const port = process.env.PORT || 4100;
server.listen(port, () => {
  console.log("listening on port " + port);
});
