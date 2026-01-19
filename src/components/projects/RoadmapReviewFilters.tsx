import { useMemo } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, FolderKanban, Users, Filter } from "lucide-react";
import { EnhancedProjectSummary } from "@/utils/roadmapReviewCalculations";

export type GroupByMode = "none" | "project" | "role" | "user";

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface ProjectWithMembers {
  projectId: string;
  projectName: string;
}

interface RoleGroup {
  role: string;
  count: number;
}

interface RoadmapReviewFiltersProps {
  enhancedSummaries: EnhancedProjectSummary[];
  groupBy: GroupByMode;
  onGroupByChange: (mode: GroupByMode) => void;
  selectedProject: string;
  onProjectChange: (projectId: string) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  selectedUser: string;
  onUserChange: (userId: string) => void;
}

export function RoadmapReviewFilters({
  enhancedSummaries,
  groupBy,
  onGroupByChange,
  selectedProject,
  onProjectChange,
  selectedRole,
  onRoleChange,
  selectedUser,
  onUserChange,
}: RoadmapReviewFiltersProps) {
  // Extract all unique projects
  const allProjects = useMemo<ProjectWithMembers[]>(() => {
    return enhancedSummaries.map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName,
    })).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [enhancedSummaries]);

  // Extract all unique roles across all projects
  const allRoles = useMemo<RoleGroup[]>(() => {
    const roleMap = new Map<string, number>();
    enhancedSummaries.forEach((project) => {
      project.teamMembers.forEach((member) => {
        const role = member.role || "member";
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      });
    });
    return Array.from(roleMap.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [enhancedSummaries]);

  // Extract all unique team members with their projects
  const allTeamMembers = useMemo<TeamMember[]>(() => {
    const members = new Map<string, TeamMember>();
    enhancedSummaries.forEach((project) => {
      project.teamMembers.forEach((member) => {
        if (member.id && !members.has(member.id)) {
          members.set(member.id, {
            id: member.id,
            name: member.name,
            role: member.role,
          });
        }
      });
    });
    return Array.from(members.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [enhancedSummaries]);

  // Get members for selected project
  const membersForSelectedProject = useMemo(() => {
    if (selectedProject === "all") return [];
    const project = enhancedSummaries.find((p) => p.projectId === selectedProject);
    return project?.teamMembers || [];
  }, [selectedProject, enhancedSummaries]);

  // Get projects for selected user
  const projectsForSelectedUser = useMemo(() => {
    if (selectedUser === "all") return [];
    return enhancedSummaries.filter((p) =>
      p.teamMembers.some((m) => m.id === selectedUser)
    );
  }, [selectedUser, enhancedSummaries]);

  // Get projects for selected role
  const projectsForSelectedRole = useMemo(() => {
    if (selectedRole === "all") return [];
    return enhancedSummaries.filter((p) =>
      p.teamMembers.some((m) => m.role === selectedRole)
    );
  }, [selectedRole, enhancedSummaries]);

  return (
    <div className="space-y-4">
      {/* Group By Selection */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Group By:</span>
          <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupByMode)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select grouping" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  No Grouping
                </div>
              </SelectItem>
              <SelectItem value="project">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  By Project
                </div>
              </SelectItem>
              <SelectItem value="role">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  By Role
                </div>
              </SelectItem>
              <SelectItem value="user">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  By User
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Secondary Filter based on Group By mode */}
        {groupBy === "project" && (
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Project:</span>
            <Select value={selectedProject} onValueChange={onProjectChange}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {allProjects.map((project) => (
                  <SelectItem key={project.projectId} value={project.projectId}>
                    {project.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {groupBy === "role" && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Role:</span>
            <Select value={selectedRole} onValueChange={onRoleChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {allRoles.map((r) => (
                  <SelectItem key={r.role} value={r.role}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="capitalize">{r.role}</span>
                      <Badge variant="secondary" className="text-xs">
                        {r.count}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {groupBy === "user" && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Team Member:</span>
            <Select value={selectedUser} onValueChange={onUserChange}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {allTeamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span>{member.name}</span>
                      <span className="text-muted-foreground text-xs capitalize">
                        ({member.role})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Active Filter Summary */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        {groupBy === "project" && selectedProject !== "all" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Team members on this project:</span>
            <div className="flex gap-1 flex-wrap">
              {membersForSelectedProject.length === 0 ? (
                <Badge variant="outline">No members</Badge>
              ) : (
                membersForSelectedProject.map((m) => (
                  <Badge key={m.id} variant="secondary" className="capitalize">
                    {m.name} <span className="opacity-60">({m.role})</span>
                  </Badge>
                ))
              )}
            </div>
          </div>
        )}

        {groupBy === "role" && selectedRole !== "all" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Projects with {selectedRole}s:</span>
            <Badge variant="secondary">{projectsForSelectedRole.length} projects</Badge>
          </div>
        )}

        {groupBy === "user" && selectedUser !== "all" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Assigned projects:</span>
            <Badge variant="secondary">{projectsForSelectedUser.length} projects</Badge>
          </div>
        )}

        {groupBy === "none" && (
          <span className="text-muted-foreground">
            Showing all {enhancedSummaries.length} projects
          </span>
        )}
      </div>
    </div>
  );
}

// Hook to filter summaries based on the current filter state
export function useFilteredSummaries(
  enhancedSummaries: EnhancedProjectSummary[],
  groupBy: GroupByMode,
  selectedProject: string,
  selectedRole: string,
  selectedUser: string
) {
  return useMemo(() => {
    switch (groupBy) {
      case "project":
        if (selectedProject === "all") return enhancedSummaries;
        return enhancedSummaries.filter((p) => p.projectId === selectedProject);
      
      case "role":
        if (selectedRole === "all") return enhancedSummaries;
        return enhancedSummaries.filter((p) =>
          p.teamMembers.some((m) => m.role === selectedRole)
        );
      
      case "user":
        if (selectedUser === "all") return enhancedSummaries;
        return enhancedSummaries.filter((p) =>
          p.teamMembers.some((m) => m.id === selectedUser)
        );
      
      default:
        return enhancedSummaries;
    }
  }, [enhancedSummaries, groupBy, selectedProject, selectedRole, selectedUser]);
}

// Get filter description for PDF filename
export function getFilterDescription(
  groupBy: GroupByMode,
  selectedProject: string,
  selectedRole: string,
  selectedUser: string,
  enhancedSummaries: EnhancedProjectSummary[]
): string | null {
  switch (groupBy) {
    case "project":
      if (selectedProject !== "all") {
        const project = enhancedSummaries.find((p) => p.projectId === selectedProject);
        return project?.projectName || null;
      }
      break;
    
    case "role":
      if (selectedRole !== "all") {
        return selectedRole;
      }
      break;
    
    case "user":
      if (selectedUser !== "all") {
        for (const project of enhancedSummaries) {
          const member = project.teamMembers.find((m) => m.id === selectedUser);
          if (member) return member.name;
        }
      }
      break;
  }
  return null;
}
