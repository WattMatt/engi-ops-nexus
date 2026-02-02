import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface WorkspaceGroupProps {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  defaultOpen?: boolean;
}

export function WorkspaceGroup({ 
  title, 
  icon: GroupIcon, 
  items, 
  defaultOpen = false 
}: WorkspaceGroupProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };
  
  const isGroupActive = items.some(item => isActive(item.url));
  
  const getNavCls = (path: string) =>
    isActive(path)
      ? "bg-primary/10 text-primary font-medium hover:bg-primary/20"
      : "hover:bg-muted/50";

  return (
    <Collapsible defaultOpen={defaultOpen || isGroupActive}>
      <CollapsibleTrigger asChild>
        <div 
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium cursor-pointer rounded-md transition-colors",
            "hover:bg-muted/50",
            isGroupActive && "text-primary"
          )}
        >
          <GroupIcon className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1">{title}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenu className={cn(!collapsed && "ml-4 border-l border-border/50 pl-2")}>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink 
                  to={item.url} 
                  end={item.url === "/dashboard"}
                  className={cn("text-sm", getNavCls(item.url))}
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
}
