import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported file types and their MIME types
const SUPPORTED_TYPES = {
  // Text-based
  "text/plain": "text",
  "text/markdown": "text",
  "text/csv": "text",
  // PDF
  "application/pdf": "pdf",
  // Word
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  // Excel
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  // PowerPoint
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  // JSON/XML
  "application/json": "text",
  "application/xml": "text",
  "text/xml": "text",
};

// Split text into chunks with intelligent boundaries
function chunkText(text: string, maxChunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  
  // Clean up the text
  text = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  
  if (!text) return [];
  
  // Try to split on paragraph boundaries first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    
    if (currentChunk.length + trimmed.length + 1 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep overlap from previous chunk
      const words = currentChunk.split(" ");
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(" ") + " " + trimmed;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If we didn't get any chunks (single block of text), split by sentences
  if (chunks.length === 0 && text.length > maxChunkSize) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    currentChunk = "";
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        const words = currentChunk.split(" ");
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(" ") + " " + sentence;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }
  
  // Fallback: if still no chunks, just return the whole text
  if (chunks.length === 0 && text.trim()) {
    chunks.push(text.trim());
  }
  
  return chunks;
}

// Extract text from PDF using simple text extraction
function extractTextFromPDF(arrayBuffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let text = "";
    
    // Find text streams in PDF
    const content = decoder.decode(bytes);
    
    // Extract text between BT and ET (text blocks)
    const textBlocks = content.match(/BT[\s\S]*?ET/g) || [];
    for (const block of textBlocks) {
      // Extract strings in parentheses or hex strings
      const strings = block.match(/\(([^)]*)\)/g) || [];
      for (const str of strings) {
        const cleaned = str.slice(1, -1)
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "")
          .replace(/\\t/g, " ")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\");
        text += cleaned + " ";
      }
    }
    
    // Also try to find plain text content
    const plainTextMatches = content.match(/\/Contents\s*\[([^\]]*)\]/g) || [];
    
    // Clean up extracted text
    text = text
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    return text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    return "";
  }
}

// Extract text from DOCX (Office Open XML)
async function extractTextFromDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const content = decoder.decode(bytes);
    
    // DOCX files are ZIP archives, find XML content
    // Look for text content patterns in the raw bytes
    let text = "";
    
    // Find XML text nodes with <w:t> tags (Word text)
    const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    for (const match of textMatches) {
      const innerText = match.replace(/<[^>]*>/g, "");
      text += innerText + " ";
    }
    
    // Also look for paragraph breaks
    text = text.replace(/\s{2,}/g, "\n\n");
    
    return text.trim();
  } catch (error) {
    console.error("DOCX extraction error:", error);
    return "";
  }
}

// Extract text from Excel-like content
function extractTextFromSpreadsheet(arrayBuffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const content = decoder.decode(bytes);
    
    let text = "";
    
    // Look for cell values in XLSX (sharedStrings.xml pattern)
    const stringMatches = content.match(/<t[^>]*>([^<]*)<\/t>/g) || [];
    for (const match of stringMatches) {
      const innerText = match.replace(/<[^>]*>/g, "");
      if (innerText.trim()) {
        text += innerText + " | ";
      }
    }
    
    // Clean up
    text = text.replace(/\|\s*\|/g, "\n").replace(/\s+/g, " ");
    
    return text.trim();
  } catch (error) {
    console.error("Spreadsheet extraction error:", error);
    return "";
  }
}

// Use AI to enhance/summarize extracted content
async function enhanceWithAI(text: string, apiKey: string, fileName: string): Promise<string> {
  // If text is short enough, no need to enhance
  if (text.length < 500) return text;
  
  // If text is very long, summarize sections
  if (text.length > 50000) {
    // Just take first 50000 chars for now
    text = text.slice(0, 50000);
  }
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a document processor. Clean up and structure the following extracted document content. 
Preserve all important information, technical details, numbers, specifications, and factual content.
Remove artifacts, repeated characters, and formatting noise.
Output clean, well-structured text that retains all the original meaning and data.
Do NOT summarize or remove any important information - just clean it up.`
          },
          {
            role: "user",
            content: `Document: ${fileName}\n\nExtracted content:\n${text}`
          }
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      console.error("AI enhancement failed:", response.status);
      return text; // Return original if AI fails
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || text;
  } catch (error) {
    console.error("AI enhancement error:", error);
    return text;
  }
}

// Generate embedding using Lovable AI Gateway
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-004",
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Embedding API error:", response.status, error);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      throw new Error("documentId is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update document status to processing
    await supabase
      .from("knowledge_documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    // Get document info
    const { data: document, error: docError } = await supabase
      .from("knowledge_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error("Document not found");
    }

    console.log(`Processing document: ${document.title} (${document.file_name})`);
    console.log(`File type: ${document.file_type}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("knowledge-documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Extract text based on file type
    let text = "";
    const fileType = document.file_type.toLowerCase();
    const fileName = document.file_name.toLowerCase();

    // Determine extraction method
    let extractionMethod = "text";
    const supportedType = SUPPORTED_TYPES[fileType as keyof typeof SUPPORTED_TYPES];
    if (supportedType) {
      extractionMethod = supportedType;
    } else if (fileName.endsWith(".md") || fileName.endsWith(".txt")) {
      extractionMethod = "text";
    } else if (fileName.endsWith(".pdf")) {
      extractionMethod = "pdf";
    } else if (fileName.endsWith(".docx")) {
      extractionMethod = "docx";
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      extractionMethod = "xlsx";
    }

    console.log(`Extraction method: ${extractionMethod}`);

    switch (extractionMethod) {
      case "text":
        text = await fileData.text();
        break;
      
      case "pdf":
        const pdfBuffer = await fileData.arrayBuffer();
        text = extractTextFromPDF(pdfBuffer);
        // If PDF extraction yields little text, try as plain text
        if (text.length < 100) {
          console.log("PDF extraction yielded little text, trying as plain text...");
          text = await fileData.text();
          text = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ");
        }
        break;
      
      case "docx":
      case "doc":
        const docBuffer = await fileData.arrayBuffer();
        text = await extractTextFromDOCX(docBuffer);
        if (text.length < 50) {
          // Fallback to raw text extraction
          text = await fileData.text();
          text = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ");
        }
        break;
      
      case "xlsx":
      case "xls":
        const xlsBuffer = await fileData.arrayBuffer();
        text = extractTextFromSpreadsheet(xlsBuffer);
        break;
      
      case "pptx":
        // PowerPoint - extract visible text
        const pptBuffer = await fileData.arrayBuffer();
        text = await extractTextFromDOCX(pptBuffer); // Similar XML structure
        break;
      
      default:
        // Try as text
        try {
          text = await fileData.text();
        } catch {
          throw new Error(`Unsupported file type: ${fileType}`);
        }
    }

    // Clean up extracted text
    text = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();

    if (!text || text.length < 10) {
      throw new Error("No text content could be extracted from document");
    }

    console.log(`Extracted ${text.length} characters from document`);

    // Optionally enhance with AI for better quality
    if (extractionMethod !== "text" && text.length > 100) {
      console.log("Enhancing extracted text with AI...");
      text = await enhanceWithAI(text, LOVABLE_API_KEY, document.file_name);
      console.log(`Enhanced text: ${text.length} characters`);
    }

    // Delete existing chunks
    await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("document_id", documentId);

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error("No chunks could be created from document");
    }

    // Generate embeddings and insert chunks
    const chunkInserts = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Generating embedding for chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      try {
        const embedding = await generateEmbedding(chunk, LOVABLE_API_KEY);
        
        chunkInserts.push({
          document_id: documentId,
          chunk_index: i,
          content: chunk,
          token_count: Math.ceil(chunk.length / 4), // Rough estimate
          embedding: JSON.stringify(embedding),
          metadata: { 
            index: i, 
            total: chunks.length,
            extraction_method: extractionMethod,
          },
        });
      } catch (embError) {
        console.error(`Error embedding chunk ${i}:`, embError);
        // Continue with other chunks
      }

      // Rate limit: small delay between API calls
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Insert all chunks
    if (chunkInserts.length > 0) {
      const { error: insertError } = await supabase
        .from("knowledge_chunks")
        .insert(chunkInserts);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }
    }

    // Update document status
    await supabase
      .from("knowledge_documents")
      .update({
        status: "ready",
        chunk_count: chunkInserts.length,
        error_message: null,
      })
      .eq("id", documentId);

    console.log(`Successfully processed document with ${chunkInserts.length} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        chunks: chunkInserts.length,
        documentId,
        extractionMethod,
        originalLength: text.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing document:", error);

    // Try to update document status to error
    try {
      const { documentId } = await (async () => {
        try {
          return await req.json();
        } catch {
          return { documentId: null };
        }
      })();

      if (documentId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from("knowledge_documents")
          .update({
            status: "error",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", documentId);
      }
    } catch {
      // Ignore cleanup errors
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
