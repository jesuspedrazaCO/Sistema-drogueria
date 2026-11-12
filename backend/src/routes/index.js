import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import supplierRoutes from './supplier.routes.js';
import productRoutes from './product.routes.js';
import purchaseRoutes from './purchase.routes.js';
import batchRoutes from './batch.routes.js';
import inventoryRoutes from './inventory.routes.js';
import saleRoutes from './sale.routes.js';
import customerRoutes from './customer.routes.js';
import expenseRoutes from './expense.routes.js';
import reportRoutes from './report.routes.js';
import settingsRoutes from './settings.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/products', productRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/batches', batchRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', saleRoutes);
router.use('/customers', customerRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);

export default router;
