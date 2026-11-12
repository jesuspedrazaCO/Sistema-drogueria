import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validators.js';

const router = Router();

// Las respuestas de autenticación nunca deben quedar en caché
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.post('/logout-all', protect, auth.logoutAll);
router.get('/me', protect, auth.me);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), auth.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), auth.resetPassword);
router.post('/change-password', protect, validate(changePasswordSchema), auth.changePassword);

export default router;
