import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, matchCount = 5, threshold = 0.3 } = await req.json();

    if (!query) {
      throw new Error("Query is required");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`Searching knowledge base for: "${query.slice(0, 50)}..."`);

    // Use PostgreSQL full-text search with ranking
    // Extract meaningful search terms
    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term: string) => term.length > 2)
      .map((term: string) => term.replace(/[^\w]/g, ""))
      .filter((term: string) => term.length > 0)
      .slice(0, 10);

    if (searchTerms.length === 0) {
      return new Response(
        JSON.stringify({ results: [], message: "No valid search terms" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build search query - use OR for broader matching
    const tsQuery = searchTerms.join(" | ");

    // Search chunks with full-text search
    const { data: chunks, error: searchError } = await supabase
      .from("knowledge_chunks")
      .select(`
        id,
        content,
        chunk_index,
        document_id,
        knowledge_documents!inner (
          id,
          title,
          category,
          status
        )
      `)
      .textSearch("content", tsQuery, {
        type: "websearch",
        config: "english",
      })
      .eq("knowledge_documents.status", "ready")
      .limit(matchCount * 2);

    if (searchError) {
      console.error("Search error:", searchError);
      
      // Fallback to ILIKE search if full-text search fails
      const likePattern = `%${searchTerms[0]}%`;
      const { data: fallbackChunks, error: fallbackError } = await supabase
        .from("knowledge_chunks")
        .select(`
          id,
          content,
          chunk_index,
          document_id,
          knowledge_documents!inner (
            id,
            title,
            category,
            status
          )
        `)
        .ilike("content", likePattern)
        .eq("knowledge_documents.status", "ready")
        .limit(matchCount);

      if (fallbackError) {
        throw fallbackError;
      }

      const results = (fallbackChunks || []).map((chunk: any) => ({
        id: chunk.id,
        content: chunk.content,
        document_id: chunk.document_id,
        document_title: chunk.knowledge_documents?.title || "Unknown",
        chunk_index: chunk.chunk_index,
        similarity: 0.5,
      }));

      return new Response(
        JSON.stringify({ results, searchType: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate simple relevance score based on term matches
    const scoredResults = (chunks || []).map((chunk: any) => {
      const contentLower = chunk.content.toLowerCase();
      let matchScore = 0;
      let matchedTerms = 0;

      for (const term of searchTerms) {
        const regex = new RegExp(term, "gi");
        const matches = contentLower.match(regex);
        if (matches) {
          matchScore += matches.length;
          matchedTerms++;
        }
      }

      // Normalize score (0-1 range)
      const termCoverage = matchedTerms / searchTerms.length;
      const densityScore = Math.min(matchScore / 10, 1);
      const similarity = (termCoverage * 0.6 + densityScore * 0.4);

      return {
        id: chunk.id,
        content: chunk.content,
        document_id: chunk.document_id,
        document_title: chunk.knowledge_documents?.title || "Unknown",
        chunk_index: chunk.chunk_index,
        similarity: Math.round(similarity * 100) / 100,
      };
    });

    // Filter by threshold and sort by relevance
    const filteredResults = scoredResults
      .filter((r: any) => r.similarity >= threshold)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, matchCount);

    console.log(`Found ${filteredResults.length} matching chunks`);

    return new Response(
      JSON.stringify({ results: filteredResults, searchType: "fulltext" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
