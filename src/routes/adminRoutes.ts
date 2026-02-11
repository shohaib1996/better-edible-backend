// src/routes/adminRoutes.ts
import { Router } from 'express';
import { registerAdmin, loginAdmin, logoutAdmin } from '../controllers/adminAuthController';

const router = Router();

router.post('/register', registerAdmin /* #swagger.tags = ['Admin'] */);
router.post('/login', loginAdmin /* #swagger.tags = ['Admin'] */);
router.post('/logout', logoutAdmin /* #swagger.tags = ['Admin'] */);

export default router;
