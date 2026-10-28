import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { verifyPineconeConnection } from './config/pinecone.js';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Verify Pinecone connection
    await verifyPineconeConnection();

    // Start Express server
    const server = app.listen(env.PORT, () => {
      console.log(`
======================================================
🚀 RAG Express Backend Server running!
📡 URL: http://localhost:${env.PORT}
🛡️ Environment: ${env.NODE_ENV}
✨ Pinecone Index: ${env.PINECONE_INDEX_NAME}
🤖 Gemini LLM: Integrated (text-embedding-004 & gemini-1.5-flash)
======================================================
      `);
    });

    // Handle unhandled rejections and termination signals
    process.on('unhandledRejection', (err) => {
      console.error(`💥 Unhandled Rejection: ${err.message}`);
    });

    process.on('SIGINT', () => {
      console.log('Shutting down server gracefully...');
      server.close(() => {
        console.log('Process terminated.');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

startServer();
