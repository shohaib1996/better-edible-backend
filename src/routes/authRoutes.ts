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

router.post("/register", registerRep);
router.post("/login", loginRep);
router.post("/logout", logoutRep);

export default router;
