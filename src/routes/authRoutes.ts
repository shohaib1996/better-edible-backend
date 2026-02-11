import { Router } from "express";
import {
  registerRep,
  loginRep,
  logoutRep,
} from "../controllers/authController";
import cors from "cors";

const router = Router();

// Handle OPTIONS for CORS preflight
router.options("/register", cors());
router.options("/login", cors());
router.options("/logout", cors());

router.post("/register", registerRep /* #swagger.tags = ['Auth'] */);
router.post("/login", loginRep /* #swagger.tags = ['Auth'] */);
router.post("/logout", logoutRep /* #swagger.tags = ['Auth'] */);

export default router;
