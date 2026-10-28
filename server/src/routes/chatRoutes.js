import express from 'express';
import {
  sendMessage,
  getConversations,
  getConversationById,
  deleteConversation,
} from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { chatMessageSchema } from '../validators/schemas.js';

const router = express.Router();

router.use(protect); // All chat routes require authentication

router.post('/', validate(chatMessageSchema), sendMessage);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);

export default router;
