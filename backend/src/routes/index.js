const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const allowedEmailController = require('../controllers/allowedEmailController');
const auditLogController = require('../controllers/auditLogController');
const shiftController = require('../controllers/shiftController');
const scheduleController = require('../controllers/scheduleController');
const reportController = require('../controllers/reportController');

const router = express.Router();

// Auth routes (public)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.me);

// User routes
router.get('/users', authenticate, userController.getUsers);
router.put('/users/:id', authenticate, requireAdmin, userController.updateUser);
router.delete('/users/:id', authenticate, requireAdmin, userController.deleteUser);

// Allowed email (whitelist) routes
router.get('/allowed-emails', authenticate, requireAdmin, allowedEmailController.listAllowedEmails);
router.post('/allowed-emails', authenticate, requireAdmin, allowedEmailController.addAllowedEmail);
router.put('/allowed-emails/:id', authenticate, requireAdmin, allowedEmailController.updateAllowedEmail);
router.delete('/allowed-emails/:id', authenticate, requireAdmin, allowedEmailController.removeAllowedEmail);

// Shift routes
router.get('/shifts', authenticate, shiftController.getShifts);
router.post('/shifts', authenticate, requireAdmin, shiftController.createShift);
router.put('/shifts/:id', authenticate, requireAdmin, shiftController.updateShift);
router.delete('/shifts/:id', authenticate, requireAdmin, shiftController.deleteShift);

// Schedule routes
router.get('/schedules', authenticate, scheduleController.getSchedules);
router.post('/schedules/bulk', authenticate, requireAdmin, scheduleController.bulkAssignSchedules);
router.delete('/schedules/:id', authenticate, requireAdmin, scheduleController.deleteSchedule);

// Report routes (night-shift allowance)
router.get('/reports/night-shift', authenticate, reportController.getNightShiftReport);
router.get('/reports/night-shift/export', authenticate, requireAdmin, reportController.exportNightShiftCSV);

// Audit log routes (admin only)
router.get('/audit-logs', authenticate, requireAdmin, auditLogController.listAuditLogs);
router.get('/audit-logs/actions', authenticate, requireAdmin, auditLogController.listDistinctActions);

module.exports = router;
