import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FileContent {
  path: string;
  content: string;
  size: number;
}

interface ProcessedFile extends FileContent {
  projectPath: string;
  updatedContent: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the session
    const { data: session, error } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      throw new Error("Session not found");
    }

    const files: FileContent[] = session.files_content || [];
    const processedFiles: ProcessedFile[] = [];

    // Process each file
    for (const file of files) {
      const projectPath = mapToProjectPath(file.path);
      if (!projectPath) continue; // Skip files we don't want

      const updatedContent = updateImportPaths(file.content, file.path, projectPath);
      
      processedFiles.push({
        ...file,
        projectPath,
        updatedContent,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        files: processedFiles,
        dependencies: session.dependencies,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-import-session:", error);
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

function mapToProjectPath(originalPath: string): string | null {
  // Skip Firebase functions and hosting_public duplicates
  if (originalPath.startsWith('functions/')) return null;
  if (originalPath.startsWith('hosting_public/')) return null;
  
  // Skip config files
  if (originalPath.includes('package.json') || 
      originalPath.includes('tsconfig') ||
      originalPath.includes('.gitignore') ||
      originalPath.includes('firebase.json')) {
    return null;
  }

  // Map to project structure
  if (originalPath.startsWith('components/')) {
    return `src/components/floor-plan/${originalPath}`;
  }
  
  if (originalPath.startsWith('utils/')) {
    return `src/${originalPath}`;
  }
  
  // Main app files
  if (originalPath === 'App.tsx') {
    return 'src/components/floor-plan/FloorPlanApp.tsx';
  }
  
  if (originalPath === 'types.ts') {
    return 'src/types/floor-plan.ts';
  }
  
  if (originalPath === 'constants.ts') {
    return 'src/lib/floor-plan-constants.ts';
  }
  
  if (originalPath === 'purpose.config.ts') {
    return 'src/lib/floor-plan-purpose.config.ts';
  }
  
  return null;
}

function updateImportPaths(content: string, originalPath: string, projectPath: string): string {
  let updated = content;
  
  // Update relative imports to use @/ aliases
  // ./types -> @/types/floor-plan
  updated = updated.replace(/from ['"]\.\/types['"]/g, "from '@/types/floor-plan'");
  
  // ./constants -> @/lib/floor-plan-constants
  updated = updated.replace(/from ['"]\.\/constants['"]/g, "from '@/lib/floor-plan-constants'");
  
  // ./purpose.config -> @/lib/floor-plan-purpose.config
  updated = updated.replace(/from ['"]\.\/purpose\.config['"]/g, "from '@/lib/floor-plan-purpose.config'");
  
  // ./components/* -> @/components/floor-plan/components/*
  updated = updated.replace(/from ['"]\.\/components\/([^'"]+)['"]/g, "from '@/components/floor-plan/components/$1'");
  
  // ./utils/* -> @/utils/*
  updated = updated.replace(/from ['"]\.\/utils\/([^'"]+)['"]/g, "from '@/utils/$1'");
  
  // For files in components/, update parent references
  if (originalPath.startsWith('components/')) {
    updated = updated.replace(/from ['"]\.\./g, "from '@/components/floor-plan");
  }
  
  // Remove any Firebase/Gemini specific imports that won't work
  updated = updated.replace(/import.*from.*['"]@google\/genai['"];?\n?/g, '');
  updated = updated.replace(/import.*from.*['"]firebase.*['"];?\n?/g, '');
  
  return updated;
}
