import { Router } from 'express';
import * as expenses from '../controllers/expense.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import {
  idParamSchema,
  listExpensesSchema,
  createExpenseSchema,
  updateExpenseSchema,
  voidExpenseSchema,
  expenseSummarySchema,
} from '../validators/expense.validators.js';

const router = Router();
router.use(protect, authorize(...PERMISSIONS.manageExpenses));

router.get('/', validate(listExpensesSchema), expenses.list);
router.get('/summary', validate(expenseSummarySchema), expenses.summary);
router.get('/:id', validate(idParamSchema), expenses.getOne);
router.post('/', validate(createExpenseSchema), expenses.create);
router.patch('/:id', validate(updateExpenseSchema), expenses.update);
router.post('/:id/void', validate(voidExpenseSchema), expenses.voidOne);

export default router;
