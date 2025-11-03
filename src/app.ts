import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import repRoutes from "./routes/repRoutes";
import storeRoutes from "./routes/storeRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import deliveryRoutes from "./routes/deliveryRoutes";
import noteRoutes from "./routes/noteRoutes";
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import timeLogRoutes from './routes/timeLogRoutes';



dotenv.config();
const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));
app.use(morgan("dev"));


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); 
app.use("/api/reps", repRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use('/api/orders', orderRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/timelogs", timeLogRoutes);

app.get("/", (_, res) => {
  res.send("Rep Order System API is running...");
});

export default app;
