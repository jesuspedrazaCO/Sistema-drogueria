import { Router } from 'express';
import * as purchases from '../controllers/purchase.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import {
  idParamSchema,
  listPurchasesSchema,
  createPurchaseSchema,
  voidPurchaseSchema,
  paymentSchema,
} from '../validators/purchase.validators.js';

const router = Router();
router.use(protect);

router.get('/', authorize(...PERMISSIONS.viewPurchases), validate(listPurchasesSchema), purchases.list);
router.get('/payables', authorize(...PERMISSIONS.viewPurchases), purchases.payables);
router.get('/:id', authorize(...PERMISSIONS.viewPurchases), validate(idParamSchema), purchases.getOne);
router.post('/', authorize(...PERMISSIONS.manageInventory), validate(createPurchaseSchema), purchases.create);
router.post('/:id/void', authorize(...PERMISSIONS.voidPurchase), validate(voidPurchaseSchema), purchases.voidOne);
router.post('/:id/payments', authorize(...PERMISSIONS.paySuppliers), validate(paymentSchema), purchases.pay);

export default router;
