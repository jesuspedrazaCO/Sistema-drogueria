import { Router } from 'express';
import * as users from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import {
  idParamSchema,
  listUsersSchema,
  createUserSchema,
  updateUserSchema,
} from '../validators/user.validators.js';

const router = Router();

// Toda la gestión de usuarios es solo para administradores
router.use(protect, authorize(...PERMISSIONS.manageUsers));

router.get('/', validate(listUsersSchema), users.list);
router.post('/', validate(createUserSchema), users.create);
router.get('/:id', validate(idParamSchema), users.getOne);
router.patch('/:id', validate(updateUserSchema), users.update);
router.post('/:id/resend-invite', validate(idParamSchema), users.resendInvite);

export default router;
