import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Split text into chunks of roughly equal size
function chunkText(text: string, maxChunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep overlap from previous chunk
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

  return chunks;
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

    if (fileType === "text/plain" || fileType.includes("text")) {
      text = await fileData.text();
    } else if (fileType === "application/pdf") {
      // For PDF, we'll extract text (simplified - in production use a PDF parser)
      text = await fileData.text();
      // Clean up potential binary content
      text = text.replace(/[^\\x20-\\x7E\\n\\r\\t]/g, " ").replace(/\s+/g, " ");
    } else if (fileType.includes("markdown") || document.file_name.endsWith(".md")) {
      text = await fileData.text();
    } else {
      // Try to read as text for other types
      try {
        text = await fileData.text();
      } catch {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
    }

    if (!text.trim()) {
      throw new Error("No text content extracted from document");
    }

    console.log(`Extracted ${text.length} characters from document`);

    // Delete existing chunks
    await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("document_id", documentId);

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks`);

    // Generate embeddings and insert chunks
    const chunkInserts = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}`);

      try {
        const embedding = await generateEmbedding(chunk, LOVABLE_API_KEY);
        
        chunkInserts.push({
          document_id: documentId,
          chunk_index: i,
          content: chunk,
          token_count: Math.ceil(chunk.length / 4), // Rough estimate
          embedding: JSON.stringify(embedding),
          metadata: { index: i, total: chunks.length },
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
