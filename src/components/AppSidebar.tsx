import { useLocation } from "react-router-dom";
import { Building2 } from "lucide-react";
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
import { navItems } from "@/components/sidebar/sidebarConfig";
import { ScrollArea } from "@/components/ui/scroll-area";

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

        {/* Navigation Items */}
        <ScrollArea className="flex-1">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
