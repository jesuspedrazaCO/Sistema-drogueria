import { Router } from 'express';
import * as settings from '../controllers/settings.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import { updateSettingsSchema } from '../validators/settings.validators.js';

const router = Router();
router.use(protect);

router.get('/', settings.get); // datos del negocio para comprobantes: cualquier usuario autenticado
router.patch('/', authorize(...PERMISSIONS.manageUsers), validate(updateSettingsSchema), settings.update);

export default router;
