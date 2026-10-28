import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/rag_chatbot'),
  JWT_SECRET: z.string().default('default_jwt_secret_key_change_in_production_123456789'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  PINECONE_API_KEY: z.string().min(1, 'PINECONE_API_KEY is required'),
  PINECONE_INDEX_NAME: z.string().default('rag-docs'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
});

let parsedEnv;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  console.warn('⚠️ Environment validation warnings (some defaults used):');
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.warn(`  - [${err.path.join('.')}] ${err.message}`);
    });
  }
  // Provide fallback structure so backend can still boot and provide helpful feedback
  parsedEnv = {
    PORT: parseInt(process.env.PORT || '5000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rag_chatbot',
    JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production_123456789',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || '',
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || 'rag-docs',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  };
}

export const env = parsedEnv;
