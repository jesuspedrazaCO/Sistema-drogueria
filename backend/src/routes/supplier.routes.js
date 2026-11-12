import { Router } from 'express';
import * as suppliers from '../controllers/supplier.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import {
  idParamSchema,
  listSuppliersSchema,
  createSupplierSchema,
  updateSupplierSchema,
} from '../validators/supplier.validators.js';

const router = Router();
router.use(protect);

router.get('/', authorize(...PERMISSIONS.viewSuppliers), validate(listSuppliersSchema), suppliers.list);
router.get('/:id', authorize(...PERMISSIONS.viewSuppliers), validate(idParamSchema), suppliers.getOne);
router.post('/', authorize(...PERMISSIONS.manageCatalog), validate(createSupplierSchema), suppliers.create);
router.patch('/:id', authorize(...PERMISSIONS.manageCatalog), validate(updateSupplierSchema), suppliers.update);

export default router;
