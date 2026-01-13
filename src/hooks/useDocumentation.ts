import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentationSection {
  id: string;
  section_key: string;
  section_name: string;
  parent_section: string | null;
  component_path: string | null;
  description: string | null;
  readme_content: string | null;
  status: 'pending' | 'in_progress' | 'documented';
  display_order: number;
  last_updated: string | null;
  created_at: string;
}

export function useDocumentation() {
  return useQuery({
    queryKey: ['documentation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_documentation')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as DocumentationSection[];
    },
  });
}

export function useDocumentationSection(sectionKey: string) {
  return useQuery({
    queryKey: ['documentation', sectionKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_documentation')
        .select('*')
        .eq('section_key', sectionKey)
        .single();
      
      if (error) throw error;
      return data as DocumentationSection;
    },
    enabled: !!sectionKey,
  });
}

export function useUpdateDocumentation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sectionKey, 
      updates 
    }: { 
      sectionKey: string; 
      updates: Partial<DocumentationSection> 
    }) => {
      const { data, error } = await supabase
        .from('application_documentation')
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq('section_key', sectionKey)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation'] });
      toast.success('Documentation updated');
    },
    onError: (error) => {
      toast.error('Failed to update documentation');
      console.error(error);
    },
  });
}

export function useUpdateReadmeContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sectionKey, 
      readmeContent 
    }: { 
      sectionKey: string; 
      readmeContent: string 
    }) => {
      const { data, error } = await supabase
        .from('application_documentation')
        .update({ 
          readme_content: readmeContent, 
          status: 'documented',
          last_updated: new Date().toISOString() 
        })
        .eq('section_key', sectionKey)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation'] });
      toast.success('README saved');
    },
    onError: (error) => {
      toast.error('Failed to save README');
      console.error(error);
    },
  });
}

export function generateSpecificationPrompt(section: DocumentationSection): string {
  return `I need to create a detailed README specification for the "${section.section_name}" section of the application.

SECTION: ${section.section_name}
KEY: ${section.section_key}
PATH: ${section.component_path || 'N/A'}
DESCRIPTION: ${section.description || 'No description available'}

Please provide a comprehensive drawdown specification including:

## 1. Section Overview
- Primary purpose and functionality
- Key features and capabilities
- User roles that interact with this section

## 2. Component Breakdown
- List all React components with their file paths
- Component hierarchy and relationships
- Props, state management, and data flow

## 3. Data Model
- Database tables used (list table names)
- Column definitions and types
- Relationships and foreign keys
- RLS policies in place

## 4. User Flows
- Step-by-step user interactions
- CRUD operations available
- Form validations and error handling
- Success/failure states

## 5. Integration Points
- Edge functions called (if any)
- External APIs used
- Shared utilities and hooks
- Events dispatched/listened to

## 6. UI/UX Details
- Layout and navigation structure
- Responsive behavior
- Loading and error states
- Toast notifications and feedback

## 7. Configuration
- Environment variables required
- Settings and preferences
- Feature flags (if any)

## 8. Current State
- Working features (✅)
- Known issues or bugs (⚠️)
- Technical debt (🔧)

## 9. Future Enhancements
- Planned improvements
- Feature requests
- Performance optimizations

---
Format: Use markdown with clear headings and bullet points.
Include code snippets where helpful for understanding.`;
}
