import { Router } from 'express';
import * as customers from '../controllers/customer.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import {
  idParamSchema,
  listCustomersSchema,
  createCustomerSchema,
  updateCustomerSchema,
} from '../validators/customer.validators.js';

const router = Router();
router.use(protect);

router.get('/', authorize(...PERMISSIONS.viewCustomers), validate(listCustomersSchema), customers.list);
router.get('/:id', authorize(...PERMISSIONS.viewCustomers), validate(idParamSchema), customers.getOne);
router.post('/', authorize(...PERMISSIONS.manageCustomers), validate(createCustomerSchema), customers.create);
router.patch('/:id', authorize(...PERMISSIONS.manageCustomers), validate(updateCustomerSchema), customers.update);

export default router;
