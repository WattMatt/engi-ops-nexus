import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlexibleIssueData {
  issueDescription?: string;
  logs?: string;
  documentStructure?: Record<string, unknown>;
  errorDetails?: string;
  consoleLogs?: string[];
  documentStats?: {
    contentItems?: number;
    imageCount?: number;
    categoriesCount?: number;
    variationsCount?: number;
  };
  strategies?: Record<string, unknown>;
  totalTimeMs?: number;
  errorMessage?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ABACUS_API_KEY = Deno.env.get("ABACUS_AI_API_KEY");
    const DEPLOYMENT_TOKEN = Deno.env.get("ABACUS_AI_DEPLOYMENT_ID"); // This is actually the deployment token
    
    if (!ABACUS_API_KEY) {
      throw new Error("ABACUS_AI_API_KEY is not configured");
    }
    
    if (!DEPLOYMENT_TOKEN) {
      throw new Error("ABACUS_AI_DEPLOYMENT_ID (deployment token) is not configured");
    }

    const issueData: FlexibleIssueData = await req.json();
    console.log("[Abacus AI] Received issue data");
    console.log("[Abacus AI] Using deployment token:", DEPLOYMENT_TOKEN.substring(0, 10) + "...");

    const analysisPrompt = buildAnalysisPrompt(issueData);
    console.log("[Abacus AI] Prompt length:", analysisPrompt.length);

    // Method 1: Try getChatResponse with deploymentToken only (no deploymentId param)
    console.log("[Abacus AI] Trying getChatResponse with deploymentToken...");
    
    const response1 = await fetch("https://api.abacus.ai/api/v0/getChatResponse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deploymentToken: DEPLOYMENT_TOKEN,
        messages: [
          { is_user: true, text: analysisPrompt }
        ],
      }),
    });

    console.log("[Abacus AI] Method 1 status:", response1.status);

    if (response1.ok) {
      const data = await response1.json();
      return new Response(JSON.stringify({
        success: true,
        analysis: data.response || data.message || data.content || data,
        source: "getChatResponse",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const error1 = await response1.text();
    console.log("[Abacus AI] Method 1 error:", error1);

    // Method 2: Try predict with deploymentToken
    console.log("[Abacus AI] Trying predict endpoint...");
    
    const response2 = await fetch("https://api.abacus.ai/api/v0/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deploymentToken: DEPLOYMENT_TOKEN,
        queryData: {
          query: analysisPrompt,
        },
      }),
    });

    console.log("[Abacus AI] Method 2 status:", response2.status);

    if (response2.ok) {
      const data = await response2.json();
      return new Response(JSON.stringify({
        success: true,
        analysis: data.result || data,
        source: "predict",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const error2 = await response2.text();
    console.log("[Abacus AI] Method 2 error:", error2);

    // Method 3: Try with API key as Bearer token + deployment token
    console.log("[Abacus AI] Trying with Bearer auth...");
    
    const response3 = await fetch("https://api.abacus.ai/api/v0/getChatResponse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ABACUS_API_KEY}`,
      },
      body: JSON.stringify({
        deploymentToken: DEPLOYMENT_TOKEN,
        messages: [
          { is_user: true, text: analysisPrompt }
        ],
      }),
    });

    console.log("[Abacus AI] Method 3 status:", response3.status);

    if (response3.ok) {
      const data = await response3.json();
      return new Response(JSON.stringify({
        success: true,
        analysis: data.response || data.message || data.content || data,
        source: "getChatResponse-bearer",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const error3 = await response3.text();
    console.log("[Abacus AI] Method 3 error:", error3);

    // Method 4: Try getCompletion
    console.log("[Abacus AI] Trying getCompletion...");
    
    const response4 = await fetch("https://api.abacus.ai/api/v0/getCompletion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ABACUS_API_KEY}`,
      },
      body: JSON.stringify({
        deploymentToken: DEPLOYMENT_TOKEN,
        prompt: analysisPrompt,
      }),
    });

    console.log("[Abacus AI] Method 4 status:", response4.status);

    if (response4.ok) {
      const data = await response4.json();
      return new Response(JSON.stringify({
        success: true,
        analysis: data.completion || data.result || data,
        source: "getCompletion",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const error4 = await response4.text();
    console.log("[Abacus AI] Method 4 error:", error4);

    // All methods failed
    return new Response(JSON.stringify({
      success: false,
      error: "All Abacus AI endpoints failed",
      attempts: [
        { method: "getChatResponse", status: response1.status, error: error1.substring(0, 200) },
        { method: "predict", status: response2.status, error: error2.substring(0, 200) },
        { method: "getChatResponse-bearer", status: response3.status, error: error3.substring(0, 200) },
        { method: "getCompletion", status: response4.status, error: error4.substring(0, 200) },
      ],
      recommendation: "Please verify your Abacus AI deployment token is valid and the deployment is active.",
    }), {
      status: 500,
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

function buildAnalysisPrompt(data: FlexibleIssueData): string {
  const parts: string[] = [
    "You are a JavaScript/TypeScript debugging expert specializing in PDF generation libraries.",
    "",
    "## Problem Description",
    data.issueDescription || "PDF generation using pdfmake library is experiencing issues.",
  ];

  if (data.documentStructure) {
    parts.push("", "## Document Structure", JSON.stringify(data.documentStructure, null, 2));
  }

  if (data.logs) {
    parts.push("", "## Logs", data.logs);
  }

  if (data.errorDetails || data.errorMessage) {
    parts.push("", "## Error Details", data.errorDetails || data.errorMessage || "");
  }

  parts.push(
    "",
    "## Required Analysis",
    "1. What is the root cause of this issue?",
    "2. What is the recommended solution with code examples?",
    "3. Are there alternative approaches?",
    "",
    "Provide a detailed technical analysis with implementable solutions."
  );

  return parts.join("\n");
}
