import { Router } from "express";
import {
  loginStoreUser,
  sendMagicLink,
  verifyMagicLink,
  changeStorePassword,
  logoutStoreUser,
} from "../controllers/storeAuthController";

const router = Router();

router.post("/login", loginStoreUser);
router.post("/magic-link", sendMagicLink);
router.get("/magic-link/:token", verifyMagicLink);
router.post("/change-password", changeStorePassword);
router.post("/logout", logoutStoreUser);

export default router;
