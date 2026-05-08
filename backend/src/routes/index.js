const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const shiftController = require('../controllers/shiftController');
const scheduleController = require('../controllers/scheduleController');
const workStatusController = require('../controllers/workStatusController');
const reportController = require('../controllers/reportController');

const router = express.Router();

// Auth routes (public)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.me);

// User routes
router.get('/users', authenticate, userController.getUsers);
router.post('/users', authenticate, requireAdmin, userController.createUser);
router.put('/users/:id', authenticate, requireAdmin, userController.updateUser);
router.delete('/users/:id', authenticate, requireAdmin, userController.deleteUser);

// Shift routes
router.get('/shifts', authenticate, shiftController.getShifts);
router.post('/shifts', authenticate, requireAdmin, shiftController.createShift);
router.put('/shifts/:id', authenticate, requireAdmin, shiftController.updateShift);
router.delete('/shifts/:id', authenticate, requireAdmin, shiftController.deleteShift);

// Schedule routes
router.get('/schedules', authenticate, scheduleController.getSchedules);
router.post('/schedules/bulk', authenticate, requireAdmin, scheduleController.bulkAssignSchedules);
router.delete('/schedules/:id', authenticate, requireAdmin, scheduleController.deleteSchedule);

// Work status routes
router.get('/work-status', authenticate, workStatusController.getWorkStatuses);
router.put('/work-status', authenticate, workStatusController.updateWorkStatus);
router.delete('/work-status/:date', authenticate, workStatusController.deleteWorkStatus);

// Report routes
router.get('/reports/summary', authenticate, reportController.getSummary);
router.get('/reports/export', authenticate, requireAdmin, reportController.exportCSV);

module.exports = router;
