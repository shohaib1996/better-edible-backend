import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { AppError } from "./utils/AppError";
import { errorHandler } from "./middleware/errorHandler";
import repRoutes from "./routes/repRoutes";
import storeRoutes from "./routes/storeRoutes";
import productRoutes from "./routes/productRoutes";
import productLineRoutes from "./routes/productLineRoutes";
import orderRoutes from "./routes/orderRoutes";
import privateLabelProductRoutes from "./routes/privateLabelProductRoutes";
import privateLabelClientRoutes from "./routes/privateLabelClientRoutes";
import labelRoutes from "./routes/labelRoutes";
import clientOrderRoutes from "./routes/clientOrderRoutes";
import deliveryRoutes from "./routes/deliveryRoutes";
import noteRoutes from "./routes/noteRoutes";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import timeLogRoutes from "./routes/timeLogRoutes";
import sampleRoutes from "./routes/sampleRoutes";
import contactRoutes from "./routes/contactRoutes";
import followupRoutes from "./routes/followupRoutes";
import deliveryOrderRoutes from "./routes/deliveryOrderRoutes";
import cookItemRoutes from "./routes/cookItemRoutes";
import moldRoutes from "./routes/moldRoutes";
import dehydratorTrayRoutes from "./routes/dehydratorTrayRoutes";
import dehydratorUnitRoutes from "./routes/dehydratorUnitRoutes";
import caseRoutes from "./routes/caseRoutes";
import ppsRoutes from "./routes/ppsRoutes";
import packagePrepRoutes from "./routes/packagePrepRoutes";
import oilRoutes from "./routes/oilRoutes";
import flavorRoutes from "./routes/flavorRoutes";
import colorRoutes from "./routes/colorRoutes";

// 👉 dotenv ONLY for local development
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const app = express();

// ✅ CORS first
app.use(
  cors({
    origin: [
      "https://www.better-edibles.com",
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

// Swagger API Documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reps", repRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-lines", productLineRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/private-label-products", privateLabelProductRoutes);
app.use("/api/private-label-clients", privateLabelClientRoutes);
app.use("/api/labels", labelRoutes);
app.use("/api/client-orders", clientOrderRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/timelogs", timeLogRoutes);
app.use("/api/samples", sampleRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/followups", followupRoutes);
app.use("/api/delivery-order", deliveryOrderRoutes);
app.use("/api/cook-items", cookItemRoutes);
app.use("/api/molds", moldRoutes);
app.use("/api/dehydrator-trays", dehydratorTrayRoutes);
app.use("/api/dehydrator-units", dehydratorUnitRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/pps", ppsRoutes);
app.use("/api/pps", packagePrepRoutes);
app.use("/api/oil", oilRoutes);
app.use("/api/flavors", flavorRoutes);
app.use("/api/colors", colorRoutes);

app.get("/", (_req, res) => {
  res.send("Rep Order System API is running... yep 4th time");
});

// 404 - catch-all for unmatched routes
app.use((_req, _res, next) => next(new AppError("Route not found", 404)));

// Global error handler — must be last
app.use(errorHandler);

export default app;
