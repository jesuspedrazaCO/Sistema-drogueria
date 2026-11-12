import { Router } from 'express';
import * as sales from '../controllers/sale.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import { idParamSchema, listSalesSchema, createSaleSchema, voidSaleSchema } from '../validators/sale.validators.js';

const router = Router();
router.use(protect);

router.get('/', authorize(...PERMISSIONS.viewSales), validate(listSalesSchema), sales.list);
router.get('/:id', authorize(...PERMISSIONS.viewSales), validate(idParamSchema), sales.getOne);
router.post('/', authorize(...PERMISSIONS.sell), validate(createSaleSchema), sales.create);
router.post('/:id/void', authorize(...PERMISSIONS.voidSale), validate(voidSaleSchema), sales.voidOne);

export default router;
