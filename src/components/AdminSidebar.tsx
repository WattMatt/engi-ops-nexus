import { Users, Settings, Building2, FolderKanban, Receipt, MessageSquareWarning, Database, BarChart3, FileText } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Projects", url: "/admin/projects", icon: FolderKanban },
  { title: "Invoicing", url: "/admin/invoicing", icon: Receipt },
  { title: "Staff Management", url: "/admin/staff", icon: Users },
  { title: "User Management", url: "/admin/users", icon: Users },
  { title: "Backup & Recovery", url: "/admin/backup", icon: Database },
  { title: "Feedback", url: "/admin/feedback", icon: MessageSquareWarning },
  { title: "Feedback Analytics", url: "/admin/feedback-analytics", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const getNavCls = (isActive: boolean) =>
    isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={getNavCls(isActive)}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
