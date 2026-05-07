const express = require('express');
const router = express.Router();
const deleteImageController = require('../controllers/deleteImageController');

router.post('/delete', deleteImageController.deleteImage);

module.exports = router;
