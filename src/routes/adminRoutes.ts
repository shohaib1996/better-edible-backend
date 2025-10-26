// src/routes/adminRoutes.ts
import { Router } from 'express';
import { registerAdmin, loginAdmin, logoutAdmin } from '../controllers/adminAuthController';

const router = Router();

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);

export default router;
