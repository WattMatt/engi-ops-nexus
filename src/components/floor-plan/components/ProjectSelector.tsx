import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Project {
  id: string;
  project_name: string;
  project_number: string;
}

interface ProjectSelectorProps {
  value: string | null;
  onChange: (projectId: string | null) => void;
  userId: string;
}

export const ProjectSelector = ({ value, onChange, userId }: ProjectSelectorProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('project_id, projects(id, project_name, project_number)');

      if (!error && data) {
        const projectList = data
          .map(pm => pm.projects as unknown as Project)
          .filter(Boolean);
        setProjects(projectList);
      }
      setLoading(false);
    };

    if (userId) {
      fetchProjects();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="text-gray-300">Project (Optional)</Label>
        <div className="text-sm text-gray-400">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-gray-300">Link to Project (Optional)</Label>
      <Select value={value || 'none'} onValueChange={(val) => onChange(val === 'none' ? null : val)}>
        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Project</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.project_number} - {project.project_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-400">
        Link this floor plan to a project to access cable schedules
      </p>
    </div>
  );
};
