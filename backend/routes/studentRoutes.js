const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.post('/', studentController.registerStudent);
router.get('/', studentController.getAllStudents);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);
router.get('/qr/:uuid', studentController.getStudentByQR);

module.exports = router;
