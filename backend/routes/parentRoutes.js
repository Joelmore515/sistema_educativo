const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { createParentSchema, updateParentSchema } = require('../validators/schemas');
const { auditRoute } = require('../utils/audit');

router.get('/', verifyToken, requireRole('admin', 'director'), parentController.getAllParents);
router.post(
  '/',
  verifyToken,
  requireRole('admin', 'director'),
  validate(createParentSchema),
  auditRoute('create', 'parent'),
  parentController.registerParent
);
router.put(
  '/:id',
  verifyToken,
  requireRole('admin', 'director'),
  validate(updateParentSchema),
  auditRoute('update', 'parent'),
  parentController.updateParent
);
router.delete(
  '/:id',
  verifyToken,
  requireRole('admin', 'director'),
  auditRoute('delete', 'parent'),
  parentController.deleteParent
);

module.exports = router;
