import { Router } from "express";
import { registerRep, loginRep, logoutRep } from "../controllers/authController";
import cors from "cors";
import { validate } from "../middleware/validate";
import { registerRepSchema, loginRepSchema } from "../validators/authSchemas";

const router = Router();

// Handle OPTIONS for CORS preflight
router.options("/register", cors());
router.options("/login", cors());
router.options("/logout", cors());

router.post(
  "/register",
  validate({ body: registerRepSchema }),
  registerRep /* #swagger.tags = ['Auth'] */
);
router.post("/login", validate({ body: loginRepSchema }), loginRep /* #swagger.tags = ['Auth'] */);
router.post("/logout", logoutRep /* #swagger.tags = ['Auth'] */);

export default router;
