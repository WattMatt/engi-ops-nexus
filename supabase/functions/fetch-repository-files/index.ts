import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FileWithContent {
  path: string;
  content: string;
  size: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoUrl, filePaths, repoName: providedRepoName, dependencies } = await req.json();
    
    if (!repoUrl || !filePaths || !Array.isArray(filePaths)) {
      throw new Error("Repository URL and file paths are required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Fetching ${filePaths.length} files from repository:`, repoUrl);

    // Parse GitHub URL
    let owner: string, repoName: string;
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    const shortMatch = repoUrl.match(/^([^\/\s]+)\/([^\/\s]+)$/);
    const cliMatch = repoUrl.match(/gh\s+repo\s+clone\s+([^\/\s]+)\/([^\/\s]+)/);

    if (urlMatch) {
      [, owner, repoName] = urlMatch;
      repoName = repoName.replace(/\.git$/, '');
    } else if (shortMatch) {
      [, owner, repoName] = shortMatch;
    } else if (cliMatch) {
      [, owner, repoName] = cliMatch;
    } else {
      throw new Error("Invalid repository format");
    }

    // Fetch files in batches to avoid rate limits
    const filesWithContent: FileWithContent[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (filePath: string) => {
        try {
          const fileUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`;
          const response = await fetch(fileUrl, {
            headers: {
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "Lovable-Component-Generator",
            },
          });

          if (!response.ok) {
            console.error(`Failed to fetch ${filePath}:`, response.statusText);
            return null;
          }

          const data = await response.json();
          
          if (data.type === 'file' && data.content) {
            const content = atob(data.content.replace(/\n/g, ''));
            return {
              path: filePath,
              content,
              size: data.size,
            };
          }
          
          return null;
        } catch (error) {
          console.error(`Error fetching ${filePath}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      filesWithContent.push(...batchResults.filter((f): f is FileWithContent => f !== null));
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < filePaths.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Successfully fetched ${filesWithContent.length} files`);

    // Store the import session in Supabase
    const { data: session, error: dbError } = await supabase
      .from('import_sessions')
      .insert({
        repo_url: repoUrl,
        repo_name: providedRepoName || `${owner}/${repoName}`,
        selected_files: filePaths,
        files_content: filesWithContent,
        dependencies: dependencies || { required: [], missing: [] },
        status: 'ready'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Import session created:', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        files: filesWithContent,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in fetch-repository-files:", error);
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
