import { Router } from 'express';
import * as inventory from '../controllers/inventory.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import {
  initialStockSchema,
  adjustmentSchema,
  writeOffSchema,
  writeOffExpiredSchema,
  listMovementsSchema,
} from '../validators/inventory.validators.js';

const router = Router();
router.use(protect);

// Kardex: solo roles que ven reportes (el vendedor no necesita el historial de costos)
router.get('/movements', authorize(...PERMISSIONS.viewReports), validate(listMovementsSchema), inventory.movements);

router.post('/initial-stock', authorize(...PERMISSIONS.manageInventory), validate(initialStockSchema), inventory.initialStock);
router.post('/adjustments', authorize(...PERMISSIONS.manageInventory), validate(adjustmentSchema), inventory.adjust);
router.post('/write-offs', authorize(...PERMISSIONS.manageInventory), validate(writeOffSchema), inventory.writeOff);
router.post('/write-offs/expired', authorize(...PERMISSIONS.manageInventory), validate(writeOffExpiredSchema), inventory.writeOffExpired);

export default router;
