import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env.js';

let genAI = null;

export const getGeminiClient = () => {
  if (!genAI) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return genAI;
};

export const getEmbeddingModel = () => {
  const ai = getGeminiClient();
  return ai.getGenerativeModel({ model: 'text-embedding-004' });
};

export const getChatModel = (modelName = 'gemini-1.5-flash') => {
  const ai = getGeminiClient();
  return ai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });
};
