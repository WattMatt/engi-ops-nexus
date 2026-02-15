import { NavLink, useLocation } from "react-router-dom";
import { Building2, User, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { WorkspaceGroup } from "@/components/sidebar/WorkspaceGroup";
import { workspaces, settingsItems } from "@/components/sidebar/sidebarConfig";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string) =>
    isActive(path)
      ? "bg-primary/10 text-primary font-medium hover:bg-primary/20"
      : "hover:bg-muted/50";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm truncate">WM Office</h2>
                <p className="text-xs text-muted-foreground truncate">
                  Engineering Platform
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Workspace Navigation */}
        <ScrollArea className="flex-1">
          <SidebarGroup>
            <SidebarGroupContent className="space-y-1 p-2">
              {workspaces.map((workspace) => (
                <WorkspaceGroup
                  key={workspace.id}
                  title={workspace.title}
                  icon={workspace.icon}
                  items={workspace.items}
                  defaultOpen={workspace.defaultOpen}
                />
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>

        {/* Settings at bottom */}
        <div className="shrink-0 border-t">
          <Separator className="mb-0" />
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="p-2">
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls(item.url)}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
