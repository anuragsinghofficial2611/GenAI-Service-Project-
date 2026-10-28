import { Pinecone } from '@pinecone-database/pinecone';
import { env } from './env.js';

let pineconeClient = null;

export const getPineconeClient = () => {
  if (!pineconeClient) {
    if (!env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is not defined in environment variables');
    }
    pineconeClient = new Pinecone({
      apiKey: env.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
};

export const getPineconeIndex = () => {
  const client = getPineconeClient();
  return client.index(env.PINECONE_INDEX_NAME);
};

export const verifyPineconeConnection = async () => {
  try {
    if (!env.PINECONE_API_KEY) {
      console.warn('⚠️ PINECONE_API_KEY missing. Pinecone features will fail until configured.');
      return false;
    }
    const client = getPineconeClient();
    const indexList = await client.listIndexes();
    console.log(`✅ Pinecone connection initialized. Available indexes: ${indexList.indexes?.map(i => i.name).join(', ') || 'none'}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Pinecone connection check warning: ${error.message}`);
    return false;
  }
};
