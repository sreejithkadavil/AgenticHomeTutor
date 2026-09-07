import { PDFParse } from "pdf-parse";

export class MaterialExtractionError extends Error {}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_PDF_BYTES = 50 * 1024 * 1024;
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText({ pageJoiner: "\n\n" });
    const text = result.text.trim();
    if (!text) {
      throw new MaterialExtractionError(
        "No selectable text was found in this PDF. If it's a scanned document, upload a clear photo of each page instead.",
      );
    }
    return text;
  } finally {
    await parser.destroy();
  }
}

async function extractImageText(contentBase64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new MaterialExtractionError("Reading photos of notes is not configured yet.");
  }

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Transcribe all readable text from this photo of a student's school notes or worksheet, in reading order. Preserve headings, bullet points, and numbered items as separate lines. Output only the transcription — no summary, no commentary, no text that isn't visible in the image.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this page." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${contentBase64}` } },
            ],
          },
        ],
        temperature: 0,
      }),
    });
  } catch (error) {
    throw new MaterialExtractionError(
      `Could not reach the transcription service: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw new MaterialExtractionError(`Image transcription failed with status ${response.status}`);
  }
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new MaterialExtractionError("No text could be read from this photo. Try a clearer, well-lit picture.");
  }
  return text;
}

export interface ExtractMaterialInput {
  fileName: string;
  mimeType: string;
  contentBase64: string;
}

export async function extractPdfMaterial(buffer: Buffer): Promise<string> {
  if (buffer.byteLength === 0) {
    throw new MaterialExtractionError("The uploaded PDF is empty.");
  }
  if (buffer.byteLength > MAX_PDF_BYTES) {
    throw new MaterialExtractionError("This PDF is too large (max 50MB).");
  }
  return extractPdfText(buffer);
}

/**
 * Turns a parent-uploaded PDF or photo of school notes into plain text that
 * can be reviewed and imported as curriculum content — the syllabus importer
 * previously only accepted .txt/.csv/.json read verbatim, so a scan or photo
 * of real notes produced unusable content.
 */
export async function extractMaterialText(input: ExtractMaterialInput): Promise<string> {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(input.contentBase64, "base64");
  } catch {
    throw new MaterialExtractionError("The uploaded file could not be read.");
  }
  if (buffer.byteLength === 0) {
    throw new MaterialExtractionError("The uploaded file is empty.");
  }
  const mimeType = input.mimeType.toLowerCase();
  const fileName = input.fileName.toLowerCase();
  const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");
  if (buffer.byteLength > (isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES)) {
    throw new MaterialExtractionError("This file is too large (max 8MB). Try a smaller file or a lower-resolution photo.");
  }

  if (isPdf) {
    return extractPdfMaterial(buffer);
  }
  if (mimeType.startsWith("image/")) {
    return extractImageText(input.contentBase64, input.mimeType);
  }
  throw new MaterialExtractionError(
    `Unsupported file type${input.mimeType ? ` (${input.mimeType})` : ""}. Upload a PDF, a photo (JPG/PNG), or a .txt/.csv/.json file.`,
  );
}
