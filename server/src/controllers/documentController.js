import multer from 'multer';
import { Document } from '../models/Document.js';
import { extractTextFromPdf } from '../services/pdfService.js';
import {
  chunkDocumentText,
  generateBatchEmbeddings,
  ingestChunksToPinecone,
  deleteDocumentVectors,
} from '../services/ragService.js';

// Multer in-memory storage for handling PDF uploads safely
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported'), false);
    }
  },
}).single('file');

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a PDF file to upload.',
      });
    }

    const { originalname, size, mimetype, buffer } = req.file;
    const userId = req.user._id;

    // 1. Create pending Document in MongoDB
    const document = await Document.create({
      userId,
      fileName: originalname,
      fileSize: size,
      mimeType: mimetype,
      status: 'processing',
    });

    try {
      // 2. Parse PDF buffer
      const { text, numPages } = await extractTextFromPdf(buffer);
      if (!text || text.length < 10) {
        throw new Error('Extracted PDF text is too short or empty.');
      }

      // 3. Chunking with LangChain
      const chunks = await chunkDocumentText(text, {
        documentId: document._id.toString(),
        fileName: originalname,
        userId: userId.toString(),
      });

      // 4. Tokenization & Embedding with Gemini
      const embeddedChunks = await generateBatchEmbeddings(chunks);

      // 5. Ingestion to Pinecone Vector DB
      await ingestChunksToPinecone(
        embeddedChunks,
        document._id,
        userId,
        originalname
      );

      // 6. Update Document status to indexed
      document.status = 'indexed';
      document.totalChunks = chunks.length;
      await document.save();

      res.status(201).json({
        success: true,
        message: `Successfully processed and indexed ${originalname} (${chunks.length} chunks generated).`,
        data: {
          document: {
            id: document._id,
            fileName: document.fileName,
            fileSize: document.fileSize,
            totalChunks: document.totalChunks,
            numPages,
            status: document.status,
            createdAt: document.createdAt,
          },
        },
      });
    } catch (ingestionError) {
      console.error('Ingestion error:', ingestionError);
      document.status = 'failed';
      document.errorMessage = ingestionError.message;
      await document.save();

      return res.status(500).json({
        success: false,
        message: `Document processing failed: ${ingestionError.message}`,
        documentId: document._id,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getUserDocuments = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const documents = await Document.find({ userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      data: {
        documents: documents.map((doc) => ({
          id: doc._id,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          totalChunks: doc.totalChunks,
          status: doc.status,
          errorMessage: doc.errorMessage,
          createdAt: doc.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const document = await Document.findOne({ _id: id, userId });
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or you do not have permission to delete it.',
      });
    }

    // Delete vectors from Pinecone
    await deleteDocumentVectors(document._id, userId);

    // Delete document record from MongoDB
    await Document.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Document and vector embeddings deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
