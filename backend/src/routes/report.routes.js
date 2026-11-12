import { Router } from 'express';
import * as reports from '../controllers/report.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import { salesSummarySchema, topProductsSchema, profitSchema } from '../validators/report.validators.js';

const router = Router();
router.use(protect);

// El tablero lo ven todos los roles; cada uno recibe solo lo que le corresponde
router.get('/dashboard', authorize(...PERMISSIONS.viewInventory), reports.dashboard);
router.get('/alerts', authorize(...PERMISSIONS.viewInventory), reports.alerts);

router.get('/sales-summary', authorize(...PERMISSIONS.viewReports), validate(salesSummarySchema), reports.salesSummary);
router.get('/top-products', authorize(...PERMISSIONS.viewReports), validate(topProductsSchema), reports.topProducts);
router.get('/profit', authorize(...PERMISSIONS.viewFinance), validate(profitSchema), reports.profit);
router.get('/inventory-value', authorize(...PERMISSIONS.viewCosts), reports.inventoryValue);

export default router;
