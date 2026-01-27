import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Map, 
  BarChart3,
  FileText,
  Settings,
  ChevronRight,
  Folder,
  Library,
  Contact,
  User,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserRole } from "@/hooks/useUserRole";

export type ProjectsSection = "projects" | "roadmap-review" | "analytics" | "documentation";

interface ProjectsSidebarProps {
  activeSection: ProjectsSection;
  onSectionChange: (section: ProjectsSection) => void;
}

const sidebarItems = [
  {
    id: "projects" as ProjectsSection,
    title: "All Projects",
    icon: Folder,
    description: "Browse & select projects",
  },
  {
    id: "roadmap-review" as ProjectsSection,
    title: "Roadmap Review",
    icon: Map,
    description: "Progress & health metrics",
  },
  {
    id: "analytics" as ProjectsSection,
    title: "Analytics",
    icon: BarChart3,
    description: "Cross-project insights",
  },
  {
    id: "documentation" as ProjectsSection,
    title: "Documentation",
    icon: FileText,
    description: "Guides & resources",
  },
];

export function ProjectsSidebar({ 
  activeSection, 
  onSectionChange 
}: ProjectsSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {isAdminRoute ? "Admin Portal" : "Projects Hub"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Navigate sections
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto py-3 px-3",
                  isActive && "bg-primary/10 text-primary border-l-2 border-primary rounded-l-none"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon className="h-4 w-4 mr-3 shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Quick Links */}
      <div className="p-3 border-t space-y-1">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground"
          onClick={() => navigate("/settings")}
        >
          <User className="h-4 w-4 mr-2" />
          My Settings
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground"
          onClick={() => navigate("/master-library")}
        >
          <Library className="h-4 w-4 mr-2" />
          Master Library
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground"
          onClick={() => navigate("/contact-library")}
        >
          <Contact className="h-4 w-4 mr-2" />
          Contact Library
        </Button>
        {!isAdminRoute && isAdmin && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground"
            onClick={() => navigate("/admin/projects")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Admin Portal
          </Button>
        )}
      </div>
    </div>
  );
}
