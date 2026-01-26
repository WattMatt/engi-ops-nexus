import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate embedding for RAG search
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
    console.error("Embedding API error:", response.status);
    return [];
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Search knowledge base for relevant context
async function searchKnowledgeBase(
  query: string,
  apiKey: string,
  supabase: any,
  matchCount = 3
): Promise<string> {
  try {
    const queryEmbedding = await generateEmbedding(query, apiKey);
    if (queryEmbedding.length === 0) return "";

    const { data: matches, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.65,
      match_count: matchCount,
    });

    if (error || !matches?.length) return "";

    // Format context from matches
    const contextParts = matches.map((m: any, i: number) => 
      `[Source ${i + 1}: ${m.document_title}]\n${m.content}`
    );

    return contextParts.join("\n\n---\n\n");
  } catch (e) {
    console.error("Knowledge search error:", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, skillId, useRag = true } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Build system prompt
    let systemPrompt = `You are an expert electrical engineering and construction assistant. You help with:
- Electrical code compliance and regulations
- Cable sizing and circuit calculations
- Equipment selection and specifications
- Cost estimation and project budgeting
- Safety standards and best practices
- Technical documentation and reporting

Provide clear, practical advice with references to relevant standards when applicable.`;

    // Load skill instructions if provided
    if (skillId) {
      const { data: skill } = await supabase
        .from("ai_skills")
        .select("name, instructions")
        .eq("id", skillId)
        .single();

      if (skill) {
        systemPrompt += `\n\n## Active Skill: ${skill.name}\n${skill.instructions}`;
        console.log(`Using skill: ${skill.name}`);
      }
    }

    // Add project context if provided
    if (context?.projectData) {
      systemPrompt += `\n\nCurrent project context:\n${JSON.stringify(context.projectData, null, 2)}`;
    }

    // RAG: Search knowledge base for relevant context
    let ragContext = "";
    if (useRag && messages?.length > 0) {
      const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
      if (lastUserMessage?.content) {
        console.log("Searching knowledge base for context...");
        ragContext = await searchKnowledgeBase(
          lastUserMessage.content,
          LOVABLE_API_KEY,
          supabase
        );
        
        if (ragContext) {
          systemPrompt += `\n\n## Reference Documents
The following information from the knowledge base may be relevant to the user's question. Use it to provide accurate, grounded responses. Cite sources when using this information.

${ragContext}`;
          console.log("Added RAG context from knowledge base");
        }
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in ai-chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});