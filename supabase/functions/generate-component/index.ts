import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoUrl, componentName, description } = await req.json();
    
    if (!repoUrl) {
      throw new Error("Repository URL is required");
    }

    console.log("Fetching repository:", repoUrl);

    // Parse GitHub URL to extract owner, repo, and optional path
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/[^\/]+\/(.+))?/);
    if (!urlMatch) {
      throw new Error("Invalid GitHub URL format");
    }

    const [, owner, repo, path] = urlMatch;
    const repoName = repo.replace(/\.git$/, '');

    // Fetch repository contents from GitHub API
    const apiUrl = path 
      ? `https://api.github.com/repos/${owner}/${repoName}/contents/${path}`
      : `https://api.github.com/repos/${owner}/${repoName}/contents`;

    const githubResponse = await fetch(apiUrl, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Lovable-Component-Generator",
      },
    });

    if (!githubResponse.ok) {
      throw new Error(`GitHub API error: ${githubResponse.statusText}`);
    }

    const contents = await githubResponse.json();
    
    // Filter and fetch relevant files (ts, tsx, js, jsx)
    const codeFiles: Array<{ name: string; content: string }> = [];
    
    for (const item of Array.isArray(contents) ? contents : [contents]) {
      if (item.type === "file" && /\.(tsx?|jsx?)$/.test(item.name)) {
        const fileResponse = await fetch(item.download_url);
        const fileContent = await fileResponse.text();
        codeFiles.push({ name: item.name, content: fileContent });
      }
    }

    if (codeFiles.length === 0) {
      throw new Error("No TypeScript/JavaScript files found in the repository");
    }

    // Prepare context for AI
    const codeContext = codeFiles.map(f => 
      `// File: ${f.name}\n${f.content}`
    ).join("\n\n---\n\n");

    // Use Lovable AI to generate component
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are an expert React/TypeScript developer. Analyze the provided code and generate a clean, production-ready React component.

Requirements:
- Use TypeScript with proper types
- Follow React best practices and hooks patterns
- Use Tailwind CSS for styling
- Include proper error handling
- Make it reusable and maintainable
- Add JSDoc comments for complex logic

${componentName ? `Component name: ${componentName}` : ''}
${description ? `Component purpose: ${description}` : ''}`;

    const userPrompt = `Analyze this code and generate a React component based on it:\n\n${codeContext}

Generate ONLY the component code, no explanations.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("Failed to generate component with AI");
    }

    const aiData = await aiResponse.json();
    const generatedCode = aiData.choices?.[0]?.message?.content || "";

    // Extract code from markdown if present
    const codeMatch = generatedCode.match(/```(?:tsx?|jsx?)?\n([\s\S]*?)```/);
    const finalCode = codeMatch ? codeMatch[1].trim() : generatedCode.trim();

    return new Response(
      JSON.stringify({
        success: true,
        component: finalCode,
        sourceFiles: codeFiles.map(f => f.name),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-component:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
