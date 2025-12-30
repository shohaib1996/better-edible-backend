import express from "express";
import cors from "cors";
import morgan from "morgan";
import repRoutes from "./routes/repRoutes";
import storeRoutes from "./routes/storeRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import privateLabelRoutes from "./routes/privateLabelRoutes";
import privateLabelProductRoutes from "./routes/privateLabelProductRoutes";
import deliveryRoutes from "./routes/deliveryRoutes";
import noteRoutes from "./routes/noteRoutes";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import timeLogRoutes from "./routes/timeLogRoutes";
import sampleRoutes from "./routes/sampleRoutes";
import contactRoutes from "./routes/contactRoutes";
import followupRoutes from "./routes/followupRoutes";

// 👉 dotenv ONLY for local development
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const app = express();

// ✅ CORS first
app.use(
  cors({
    origin: [
      "https://better-edibles.com",
      "https://staging.better-edibles.com",
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reps", repRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/private-labels", privateLabelRoutes);
app.use("/api/private-label-products", privateLabelProductRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/timelogs", timeLogRoutes);
app.use("/api/samples", sampleRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/followups", followupRoutes);

app.get("/", (_req, res) => {
  res.send("Rep Order System API is running... yep 4th time");
});

export default app;
