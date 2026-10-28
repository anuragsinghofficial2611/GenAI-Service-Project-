import { Conversation } from '../models/Conversation.js';
import { retrieveContext, generateRagResponse } from '../services/ragService.js';

export const sendMessage = async (req, res, next) => {
  try {
    const { message, conversationId, documentId } = req.body;
    const userId = req.user._id;

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation session not found.',
        });
      }
    } else {
      // Create a brand new conversation
      const summaryTitle = message.length > 40 ? `${message.substring(0, 40)}...` : message;
      conversation = await Conversation.create({
        userId,
        title: summaryTitle,
        documentId: documentId || null,
        messages: [],
      });
    }

    // 1. Semantic Retrieval using Pinecone Vector DB
    const retrievedChunks = await retrieveContext(message, userId, documentId, 4);

    // 2. Augmented Generation using Gemini LLM
    const { answer, sources } = await generateRagResponse({
      question: message,
      retrievedChunks,
      conversationHistory: conversation.messages,
    });

    // 3. Save User message to MongoDB
    conversation.messages.push({
      sender: 'user',
      content: message,
      sources: [],
      timestamp: new Date(),
    });

    // 4. Save Assistant message with retrieved sources to MongoDB
    conversation.messages.push({
      sender: 'assistant',
      content: answer,
      sources: sources.map((s) => ({
        text: s.text,
        score: s.score,
        fileName: s.fileName,
        chunkIndex: s.chunkIndex,
      })),
      timestamp: new Date(),
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation._id,
        answer,
        sources: sources.map((s) => ({
          text: s.text,
          score: s.score,
          fileName: s.fileName,
          chunkIndex: s.chunkIndex,
        })),
        createdAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({ userId })
      .sort({ lastMessageAt: -1 })
      .select('title documentId lastMessageAt createdAt messages');

    const formatted = conversations.map((conv) => {
      const lastMsg = conv.messages[conv.messages.length - 1];
      return {
        id: conv._id,
        title: conv.title,
        documentId: conv.documentId,
        messageCount: conv.messages.length,
        lastMessage: lastMsg ? {
          sender: lastMsg.sender,
          content: lastMsg.content.slice(0, 100),
          timestamp: lastMsg.timestamp,
        } : null,
        createdAt: conv.createdAt,
        lastMessageAt: conv.lastMessageAt,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        conversations: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        conversation: {
          id: conversation._id,
          title: conversation.title,
          documentId: conversation.documentId,
          messages: conversation.messages,
          createdAt: conversation.createdAt,
          lastMessageAt: conversation.lastMessageAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOneAndDelete({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
