// src/routes/authRoutes.ts
import { Router } from 'express';
import { registerRep, loginRep, logoutRep } from '../controllers/authController';

const router = Router();

router.post('/register', registerRep);
router.post('/login', loginRep);
router.post('/logout', logoutRep);

export default router;
