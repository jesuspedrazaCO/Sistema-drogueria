import { Router } from 'express';
import * as products from '../controllers/product.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import {
  idParamSchema,
  listProductsSchema,
  createProductSchema,
  updateProductSchema,
} from '../validators/product.validators.js';

const router = Router();
router.use(protect);

router.get('/', authorize(...PERMISSIONS.viewInventory), validate(listProductsSchema), products.list);
router.get('/categories', authorize(...PERMISSIONS.viewInventory), products.categories);
router.get('/:id', authorize(...PERMISSIONS.viewInventory), validate(idParamSchema), products.getOne);
router.post('/', authorize(...PERMISSIONS.manageCatalog), validate(createProductSchema), products.create);
router.patch('/:id', authorize(...PERMISSIONS.manageCatalog), validate(updateProductSchema), products.update);

export default router;
