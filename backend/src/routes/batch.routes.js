import { Router } from 'express';
import * as inventory from '../controllers/inventory.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../config/permissions.js';
import { idParamSchema, listBatchesSchema, blockBatchSchema } from '../validators/inventory.validators.js';

const router = Router();
router.use(protect);

router.get('/', authorize(...PERMISSIONS.viewInventory), validate(listBatchesSchema), inventory.listBatches);
router.get('/:id', authorize(...PERMISSIONS.viewInventory), validate(idParamSchema), inventory.getBatch);
router.patch('/:id/block', authorize(...PERMISSIONS.manageInventory), validate(blockBatchSchema), inventory.blockBatch);

export default router;
