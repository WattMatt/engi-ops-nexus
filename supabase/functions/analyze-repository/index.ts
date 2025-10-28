import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FileNode {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
  sha?: string;
}

interface AnalysisResult {
  files: FileNode[];
  dependencies: {
    required: string[];
    missing: string[];
  };
  structure: {
    components: string[];
    utils: string[];
    types: string[];
    styles: string[];
    config: string[];
  };
  summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoUrl } = await req.json();
    
    if (!repoUrl) {
      throw new Error("Repository URL is required");
    }

    console.log("Analyzing repository:", repoUrl);

    // Parse GitHub URL
    let owner: string, repoName: string, path: string | undefined;
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/[^\/]+\/(.+))?/);
    const shortMatch = repoUrl.match(/^([^\/\s]+)\/([^\/\s]+)$/);
    const cliMatch = repoUrl.match(/gh\s+repo\s+clone\s+([^\/\s]+)\/([^\/\s]+)/);

    if (urlMatch) {
      [, owner, repoName, path] = urlMatch;
      repoName = repoName.replace(/\.git$/, '');
    } else if (shortMatch) {
      [, owner, repoName] = shortMatch;
    } else if (cliMatch) {
      [, owner, repoName] = cliMatch;
    } else {
      throw new Error("Invalid format. Use: https://github.com/owner/repo, owner/repo, or gh repo clone owner/repo");
    }

    // Fetch repository tree recursively
    const treeUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`;
    const treeResponse = await fetch(treeUrl, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Lovable-Component-Generator",
      },
    });

    if (!treeResponse.ok) {
      throw new Error(`GitHub API error: ${treeResponse.statusText}`);
    }

    const treeData = await treeResponse.json();
    const allItems = treeData.tree || [];

    // Filter by path if specified
    const relevantItems = path 
      ? allItems.filter((item: any) => item.path.startsWith(path))
      : allItems;

    // Categorize files
    const structure = {
      components: [] as string[],
      utils: [] as string[],
      types: [] as string[],
      styles: [] as string[],
      config: [] as string[],
    };

    const importantFiles: FileNode[] = [];
    
    for (const item of relevantItems) {
      if (item.type !== 'blob') continue;

      const filePath = item.path;
      
      // Skip unwanted files
      if (
        filePath.includes('node_modules') ||
        filePath.includes('.git/') ||
        filePath.includes('dist/') ||
        filePath.includes('build/') ||
        filePath.endsWith('.md') ||
        filePath.endsWith('.lock') ||
        filePath.endsWith('.log')
      ) continue;

      // Categorize files
      if (/\.(tsx|jsx)$/.test(filePath) && /component|Component/.test(filePath)) {
        structure.components.push(filePath);
      } else if (/\.(ts|js)$/.test(filePath) && /(util|helper|lib|hook)/.test(filePath)) {
        structure.utils.push(filePath);
      } else if (/\.d\.ts$|types\.ts/.test(filePath)) {
        structure.types.push(filePath);
      } else if (/\.(css|scss|sass)$/.test(filePath)) {
        structure.styles.push(filePath);
      } else if (/(config|\.json)$/.test(filePath) && !filePath.includes('package-lock')) {
        structure.config.push(filePath);
      }

      // Collect important files (limit size to avoid overwhelming response)
      if (
        /\.(tsx?|jsx?|css|json)$/.test(filePath) && 
        item.size < 100000 && // Skip files larger than 100KB
        importantFiles.length < 100 // Limit to 100 files
      ) {
        importantFiles.push({
          path: filePath,
          type: 'file',
          size: item.size,
          sha: item.sha,
        });
      }
    }

    // Fetch package.json to analyze dependencies
    let dependencies = { required: [] as string[], missing: [] as string[] };
    const packageJsonItem = relevantItems.find((item: any) => 
      item.path === 'package.json' || item.path.endsWith('/package.json')
    );

    if (packageJsonItem) {
      try {
        const pkgUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${packageJsonItem.path}`;
        const pkgResponse = await fetch(pkgUrl, {
          headers: {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Lovable-Component-Generator",
          },
        });
        
        if (pkgResponse.ok) {
          const pkgData = await pkgResponse.json();
          const pkgContent = atob(pkgData.content);
          const pkg = JSON.parse(pkgContent);
          
          dependencies.required = [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.devDependencies || {}).filter(dep => 
              // Include important dev dependencies
              ['typescript', 'vite', '@types/'].some(keyword => dep.includes(keyword))
            ),
          ];
        }
      } catch (error) {
        console.error("Error fetching package.json:", error);
      }
    }

    // Generate AI summary
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const summaryPrompt = `Analyze this repository structure and provide a concise summary (max 200 words):

Repository: ${owner}/${repoName}
Total Files: ${importantFiles.length}
Components: ${structure.components.length}
Utilities: ${structure.utils.length}
Types: ${structure.types.length}
Styles: ${structure.styles.length}

Key files:
${structure.components.slice(0, 10).join('\n')}
${structure.utils.slice(0, 5).join('\n')}

Dependencies: ${dependencies.required.slice(0, 10).join(', ')}

Provide a brief description of what this codebase does, its main features, and any notable patterns or frameworks used.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a code analysis expert. Provide clear, concise summaries." },
          { role: "user", content: summaryPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "Analysis complete.";

    const result: AnalysisResult = {
      files: importantFiles,
      dependencies,
      structure,
      summary,
    };

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-repository:", error);
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
