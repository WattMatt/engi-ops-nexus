import { 
  LayoutDashboard, 
  Map, 
  BarChart3,
  FileText,
  Settings,
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type OverviewSection = "overview" | "roadmap-review" | "analytics" | "documents";

interface ProjectOverviewSidebarProps {
  activeSection: OverviewSection;
  onSectionChange: (section: OverviewSection) => void;
  projectName?: string;
}

const sidebarItems = [
  {
    id: "overview" as OverviewSection,
    title: "Project Overview",
    icon: LayoutDashboard,
    description: "Summary & quick stats",
  },
  {
    id: "roadmap-review" as OverviewSection,
    title: "Roadmap Review",
    icon: Map,
    description: "Progress & health metrics",
  },
  {
    id: "analytics" as OverviewSection,
    title: "Analytics",
    icon: BarChart3,
    description: "Charts & insights",
  },
  {
    id: "documents" as OverviewSection,
    title: "Documents",
    icon: FileText,
    description: "Project documents",
  },
];

export function ProjectOverviewSidebar({ 
  activeSection, 
  onSectionChange,
  projectName 
}: ProjectOverviewSidebarProps) {
  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Overview Sections
        </h3>
        {projectName && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {projectName}
          </p>
        )}
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

      {/* Footer */}
      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground"
          onClick={() => {/* Could link to project settings */}}
        >
          <Settings className="h-4 w-4 mr-2" />
          Project Settings
        </Button>
      </div>
    </div>
  );
}
