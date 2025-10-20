import { NavLink, useLocation } from "react-router-dom";
import {
  FileText,
  FileCheck,
  DollarSign,
  Package,
  Users,
  Settings,
  Building2,
  LayoutDashboard,
  TrendingUp,
  ChevronDown,
  Zap,
  Cable,
  ClipboardList,
  PieChart,
  Layers,
  FileStack,
  UsersRound,
} from "lucide-react";
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
import { useUserRole } from "@/hooks/useUserRole";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const mainModules = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Reports",
    url: "/dashboard/reports",
    icon: FileCheck,
  },
  {
    title: "AI Tools",
    url: "/dashboard/ai-tools",
    icon: Zap,
  },
  {
    title: "Cable Sizing",
    url: "/dashboard/cable-sizing",
    icon: Cable,
  },
  {
    title: "Budgets",
    url: "/dashboard/budgets",
    icon: DollarSign,
  },
  {
    title: "Bills of Quantities",
    url: "/dashboard/boq",
    icon: ClipboardList,
  },
  {
    title: "Progress Payments",
    url: "/dashboard/progress-payments",
    icon: TrendingUp,
  },
  {
    title: "Cost Reporting",
    url: "/dashboard/cost-reporting",
    icon: PieChart,
  },
  {
    title: "Floor Plan Markup",
    url: "/dashboard/floor-plan",
    icon: Layers,
  },
  {
    title: "Site Diary",
    url: "/dashboard/site-diary",
    icon: FileText,
  },
  {
    title: "Equipment Tracking",
    url: "/dashboard/equipment",
    icon: Package,
  },
  {
    title: "Tenant Tracker",
    url: "/dashboard/tenant-tracker",
    icon: UsersRound,
  },
];

const adminModules = [
  {
    title: "Finance",
    url: "/dashboard/finance",
    icon: DollarSign,
  },
  {
    title: "Staff Details",
    url: "/dashboard/staff",
    icon: FileStack,
  },
  {
    title: "User Management",
    url: "/dashboard/users",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const currentPath = location.pathname;

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

  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b">
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

        {/* Main Modules */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/dashboard"} className={getNavCls(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section at Bottom */}
        {isAdmin && (
          <div className="mt-auto">
            <Separator className="my-2" />
            <Collapsible defaultOpen={false}>
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {!collapsed && <span>Admin</span>}
                    </div>
                    {!collapsed && <ChevronDown className="h-4 w-4" />}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {adminModules.map((item) => (
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
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
