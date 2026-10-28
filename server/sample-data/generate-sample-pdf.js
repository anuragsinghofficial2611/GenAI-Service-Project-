import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([600, 750]);
  const { width, height } = page.getSize();

  let y = height - 50;

  page.drawText('Retrieval-Augmented Generation (RAG) Architecture Report', {
    x: 40,
    y,
    size: 16,
    font: timesBold,
    color: rgb(0.1, 0.1, 0.2),
  });

  y -= 30;
  page.drawText('Section 1: Executive Overview', {
    x: 40,
    y,
    size: 13,
    font: timesBold,
    color: rgb(0.2, 0.3, 0.6),
  });

  const body1 = [
    'Retrieval-Augmented Generation (RAG) combines dense semantic retrieval with deep generative AI models.',
    'By indexing external PDF documents into Pinecone vector databases, language models access authoritative facts.',
    'This architecture eliminates common AI hallucinations and grounds responses in verified context.',
  ];

  y -= 20;
  for (const line of body1) {
    page.drawText(line, { x: 40, y, size: 10, font: timesRomanFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
  }

  y -= 15;
  page.drawText('Section 2: The End-to-End Pipeline Workflow', {
    x: 40,
    y,
    size: 13,
    font: timesBold,
    color: rgb(0.2, 0.3, 0.6),
  });

  const body2 = [
    '1. Ingestion & Chunking: Text is extracted and split with LangChain RecursiveCharacterTextSplitter.',
    '2. Tokenization & Embeddings: Chunks are converted into 768-dimensional vectors using Google Gemini.',
    '3. Vector Indexing: Embeddings and metadata are indexed in Pinecone namespaces with user ID isolation.',
    '4. Query Retrieval: When a user asks a question, Pinecone executes cosine similarity to find top matches.',
    '5. Decoding & Synthesis: Gemini Flash analyzes retrieved chunks and synthesizes a grounded answer.',
  ];

  y -= 20;
  for (const line of body2) {
    page.drawText(line, { x: 40, y, size: 10, font: timesRomanFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
  }

  y -= 15;
  page.drawText('Section 3: Security & Session Isolation', {
    x: 40,
    y,
    size: 13,
    font: timesBold,
    color: rgb(0.2, 0.3, 0.6),
  });

  const body3 = [
    'Authentication uses industry-standard JSON Web Tokens (JWT) with bcrypt salt rounds for password safety.',
    'Every conversation is persisted in MongoDB and linked with the authenticated user ID.',
    'All API request inputs are strictly validated using Zod schemas on both frontend and backend.',
  ];

  y -= 20;
  for (const line of body3) {
    page.drawText(line, { x: 40, y, size: 10, font: timesRomanFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  const outputPath = path.join(__dirname, 'rag-sample-guide.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`✅ Valid standard sample PDF generated at: ${outputPath}`);
}

generateSamplePdf().catch(console.error);
