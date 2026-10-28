import pdfParse from 'pdf-parse';

export const extractTextFromPdf = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    const cleanedText = data.text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return {
      text: cleanedText,
      numPages: data.numpages,
      info: data.info,
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
};
