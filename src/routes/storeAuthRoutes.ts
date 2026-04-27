import { Router } from "express";
import {
  loginStoreUser,
  sendMagicLink,
  verifyMagicLink,
  changeStorePassword,
  logoutStoreUser,
} from "../controllers/storeAuthController";

const router = Router();

router.post("/login", loginStoreUser /* #swagger.tags = ['StoreAuth'] */);
router.post("/magic-link", sendMagicLink /* #swagger.tags = ['StoreAuth'] */);
router.get("/magic-link/:token", verifyMagicLink /* #swagger.tags = ['StoreAuth'] */);
router.post("/change-password", changeStorePassword /* #swagger.tags = ['StoreAuth'] */);
router.post("/logout", logoutStoreUser /* #swagger.tags = ['StoreAuth'] */);

export default router;
