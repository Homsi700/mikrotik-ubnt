const express = require('express');
const { check } = require('express-validator');
const deviceController = require('../controllers/deviceController');

const router = express.Router();

const deviceValidation = [
  check('name').trim().notEmpty().withMessage('Name is required'),
  check('type').isIn(['mikrotik', 'ubnt', 'mimosa']).withMessage('Invalid device type'),
  check('ipAddress').isIP().withMessage('Invalid IP address'),
  check('username').notEmpty().withMessage('Username is required'),
  check('password').notEmpty().withMessage('Password is required'),
  check('port').optional().isInt({ min: 1, max: 65535 }).withMessage('Invalid port number')
];

router.post('/', deviceValidation, deviceController.createDevice);
router.get('/', deviceController.getAllDevices);
router.get('/:id', deviceController.getDeviceById);
router.put('/:id', deviceValidation, deviceController.updateDevice);
router.delete('/:id', deviceController.deleteDevice);
router.get('/:id/status', deviceController.checkDeviceStatus);

module.exports = router;