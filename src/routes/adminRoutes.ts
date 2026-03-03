// src/routes/adminRoutes.ts
import { Router } from 'express';
import { registerAdmin, loginAdmin, logoutAdmin } from '../controllers/adminAuthController';
import { validate } from '../middleware/validate';
import { registerAdminSchema, loginAdminSchema } from '../validators/adminSchemas';

const router = Router();

router.post('/register', validate({ body: registerAdminSchema }), registerAdmin /* #swagger.tags = ['Admin'] */);
router.post('/login', validate({ body: loginAdminSchema }), loginAdmin /* #swagger.tags = ['Admin'] */);
router.post('/logout', logoutAdmin /* #swagger.tags = ['Admin'] */);

export default router;
