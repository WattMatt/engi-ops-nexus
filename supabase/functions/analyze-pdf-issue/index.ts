import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PDFIssueData {
  consoleLogs: string[];
  documentStats: {
    contentItems: number;
    imageCount: number;
    categoriesCount: number;
    variationsCount: number;
  };
  strategies: {
    getBlob: { attempted: boolean; result: string; timeout: number };
    getBuffer: { attempted: boolean; result: string; timeout: number };
    getBase64: { attempted: boolean; result: string; timeout: number };
  };
  totalTimeMs: number;
  errorMessage: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ABACUS_API_KEY = Deno.env.get("ABACUS_AI_API_KEY");
    if (!ABACUS_API_KEY) {
      throw new Error("ABACUS_AI_API_KEY is not configured");
    }

    const issueData: PDFIssueData = await req.json();
    console.log("[Abacus AI] Analyzing PDF generation issue:", JSON.stringify(issueData, null, 2));

    // Construct the prompt for analysis
    const analysisPrompt = `You are a JavaScript/TypeScript debugging expert specializing in PDF generation libraries.

## Problem Description
A web application using pdfmake library is experiencing PDF generation hangs. All callback-based methods (getBlob, getBuffer, getBase64) fail to fire their callbacks.

## Technical Details
- **Library**: pdfmake (browser-based PDF generation)
- **Document Stats**: ${issueData.documentStats.contentItems} content items, ${issueData.documentStats.imageCount} images
- **Data**: ${issueData.documentStats.categoriesCount} categories, ${issueData.documentStats.variationsCount} variations
- **Total Time Before Timeout**: ${issueData.totalTimeMs}ms
- **Final Error**: ${issueData.errorMessage}

## Strategy Results
1. **getBlob (15s timeout)**: ${issueData.strategies.getBlob.result}
2. **getBuffer (30s timeout)**: ${issueData.strategies.getBuffer.result}  
3. **getBase64 (remaining timeout)**: ${issueData.strategies.getBase64.result}

## Console Logs
\`\`\`
${issueData.consoleLogs.join('\n')}
\`\`\`

## Questions
1. What is the root cause of pdfmake callbacks not firing?
2. Are there known pdfmake issues with complex documents that cause this?
3. What is the recommended solution that will work reliably?
4. Should we use pdfmake's download() method instead of blob-based methods?
5. Are there alternative approaches (Web Workers, chunking, simplifying content)?

Please provide a detailed technical analysis and recommended solution.`;

    // Try Abacus AI Chat LLM endpoint with proper format
    console.log("[Abacus AI] Calling getChatResponse endpoint...");
    
    const response = await fetch("https://api.abacus.ai/api/v0/getChatResponse", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ABACUS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deploymentToken: ABACUS_API_KEY,
        messages: [
          { 
            role: "user", 
            content: analysisPrompt 
          }
        ],
        llmName: "CLAUDE_V3_5_SONNET", // Use Claude for technical analysis
      }),
    });

    console.log("[Abacus AI] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Abacus AI] getChatResponse error:", response.status, errorText);
      
      // Try alternative: getCompletion endpoint
      console.log("[Abacus AI] Trying getCompletion endpoint...");
      const completionResponse = await fetch("https://api.abacus.ai/api/v0/getCompletion", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ABACUS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deploymentToken: ABACUS_API_KEY,
          prompt: analysisPrompt,
          llmName: "CLAUDE_V3_5_SONNET",
          maxTokens: 4000,
        }),
      });

      if (!completionResponse.ok) {
        const completionError = await completionResponse.text();
        console.error("[Abacus AI] getCompletion error:", completionResponse.status, completionError);
        
        // Try predict endpoint with queryData format
        console.log("[Abacus AI] Trying predict endpoint with queryData...");
        const predictResponse = await fetch("https://api.abacus.ai/api/v0/predict", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ABACUS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deploymentToken: ABACUS_API_KEY,
            queryData: {
              prompt: analysisPrompt,
            },
          }),
        });

        if (!predictResponse.ok) {
          const predictError = await predictResponse.text();
          console.error("[Abacus AI] predict error:", predictResponse.status, predictError);
          
          return new Response(JSON.stringify({
            success: false,
            error: `All Abacus AI endpoints failed. Last error: ${predictError}`,
            attemptedEndpoints: ["getChatResponse", "getCompletion", "predict"],
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const predictData = await predictResponse.json();
        return new Response(JSON.stringify({
          success: true,
          analysis: predictData.result || predictData,
          source: "abacus-ai-predict",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const completionData = await completionResponse.json();
      return new Response(JSON.stringify({
        success: true,
        analysis: completionData.completion || completionData.result || completionData,
        source: "abacus-ai-getCompletion",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("[Abacus AI] Analysis received successfully");

    return new Response(JSON.stringify({
      success: true,
      analysis: data.response || data.message || data.content || data,
      source: "abacus-ai-getChatResponse",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Abacus AI] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
