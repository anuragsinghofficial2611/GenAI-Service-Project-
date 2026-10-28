import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getPineconeIndex } from '../config/pinecone.js';
import { getEmbeddingModel, getChatModel } from '../config/gemini.js';

/**
 * Step 1: Chunking
 * Splits extracted document text into semantic chunks with overlap using LangChain RecursiveCharacterTextSplitter
 */
export const chunkDocumentText = async (text, metadata = {}) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 150,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });

  const docs = await splitter.createDocuments([text], [metadata]);
  return docs.map((doc, index) => ({
    chunkIndex: index,
    text: doc.pageContent,
    metadata: {
      ...doc.metadata,
      chunkIndex: index,
    },
  }));
};

/**
 * Step 2: Embedding Generation
 * Generates high-dimensional vector embeddings using Google Gemini text-embedding-004
 */
export const generateEmbedding = async (text) => {
  const embeddingModel = getEmbeddingModel();
  const cleanText = text.replace(/\n/g, ' ').trim();
  const result = await embeddingModel.embedContent(cleanText);
  return result.embedding.values;
};

/**
 * Generates embeddings in batches for efficiency
 */
export const generateBatchEmbeddings = async (chunks, batchSize = 10) => {
  const results = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchPromises = batch.map(async (chunk) => {
      const vector = await generateEmbedding(chunk.text);
      return {
        ...chunk,
        vector,
      };
    });
    const batchEmbeddings = await Promise.all(batchPromises);
    results.push(...batchEmbeddings);
  }
  return results;
};

/**
 * Step 3: Vector DB Ingestion (Pinecone)
 * Upserts chunk vectors and metadata into Pinecone vector index
 */
export const ingestChunksToPinecone = async (embeddedChunks, documentId, userId, fileName) => {
  const index = getPineconeIndex();

  const vectorsToUpsert = embeddedChunks.map((chunk) => ({
    id: `${documentId}_chunk_${chunk.chunkIndex}`,
    values: chunk.vector,
    metadata: {
      documentId: documentId.toString(),
      userId: userId.toString(),
      fileName: fileName,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text.slice(0, 1000), // Ensure within metadata byte limits
    },
  }));

  // Batch upsert to Pinecone
  const batchSize = 40;
  for (let i = 0; i < vectorsToUpsert.length; i += batchSize) {
    const batch = vectorsToUpsert.slice(i, i + batchSize);
    await index.upsert(batch);
  }

  return vectorsToUpsert.length;
};

/**
 * Step 4: Semantic Retrieval
 * Searches Pinecone vector store for top-K chunks most similar to the user question
 */
export const retrieveContext = async (queryText, userId, documentId = null, topK = 4) => {
  try {
    const queryVector = await generateEmbedding(queryText);
    const index = getPineconeIndex();

    const filter = {
      userId: { $eq: userId.toString() },
    };

    if (documentId) {
      filter.documentId = { $eq: documentId.toString() };
    }

    const queryResponse = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter,
    });

    const matches = queryResponse.matches || [];
    return matches.map((match) => ({
      text: match.metadata?.text || '',
      score: match.score || 0,
      fileName: match.metadata?.fileName || 'Document',
      chunkIndex: match.metadata?.chunkIndex ?? 0,
      documentId: match.metadata?.documentId,
    }));
  } catch (error) {
    console.error('Error retrieving vector context from Pinecone:', error);
    // If vector search fails (e.g. index not yet populated or Pinecone credentials issue), return empty array gracefully
    return [];
  }
};

/**
 * Step 5: Augmented Generation with Gemini LLM
 * Combines retrieved context with prompt & history to generate accurate answers
 */
export const generateRagResponse = async ({
  question,
  retrievedChunks = [],
  conversationHistory = [],
}) => {
  const chatModel = getChatModel('gemini-1.5-flash');

  // Build context text from retrieved chunks
  let contextBlock = '';
  if (retrievedChunks.length > 0) {
    contextBlock = retrievedChunks
      .map((c, i) => `[Source ${i + 1} - ${c.fileName} (Chunk #${c.chunkIndex})]:\n${c.text}`)
      .join('\n\n---\n\n');
  } else {
    contextBlock = 'No specific document context found in the vector database for this question.';
  }

  // Format recent conversation history
  const recentHistory = conversationHistory
    .slice(-6)
    .map((msg) => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const systemPrompt = `You are a professional, helpful, and highly accurate AI Knowledge Assistant powered by RAG (Retrieval Augmented Generation).
Your task is to answer the user's question with utmost fidelity using the provided Document Context below.

GUIDELINES:
1. Always prioritize the factual information in the Document Context.
2. If the context contains the answer, synthesize a clear, well-structured, human-friendly response.
3. If the context does NOT contain enough information to answer the question, honestly state that the provided documents do not contain sufficient details to answer, but offer any helpful closely related guidance if possible.
4. Do NOT hallucinate facts outside the context when asking about the document.
5. Format your output cleanly with markdown formatting (bullet points, bold highlights, concise paragraphs) when helpful.

DOCUMENT CONTEXT:
${contextBlock}

CONVERSATION HISTORY:
${recentHistory || 'No previous messages in this conversation.'}

USER QUESTION:
${question}

ASSISTANT RESPONSE:`;

  const result = await chatModel.generateContent(systemPrompt);
  const responseText = result.response.text();

  return {
    answer: responseText,
    sources: retrievedChunks,
  };
};

/**
 * Deletes all vectors belonging to a specific document from Pinecone
 */
export const deleteDocumentVectors = async (documentId, userId) => {
  try {
    const index = getPineconeIndex();
    await index.deleteMany({
      documentId: { $eq: documentId.toString() },
      userId: { $eq: userId.toString() },
    });
  } catch (error) {
    console.warn(`Could not delete vectors for document ${documentId}:`, error.message);
  }
};
