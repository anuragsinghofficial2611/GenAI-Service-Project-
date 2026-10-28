import express from 'express';
import {
  uploadDocument,
  getUserDocuments,
  deleteDocument,
  uploadMiddleware,
} from '../controllers/documentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // All document routes require authentication

router.post('/upload', uploadMiddleware, uploadDocument);
router.get('/', getUserDocuments);
router.delete('/:id', deleteDocument);

export default router;
