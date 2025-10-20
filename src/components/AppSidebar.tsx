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
  FileStack,
  UsersRound,
  Wallet,
  Image,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
];

const reportsModule = {
  title: "Reports",
  icon: FileCheck,
  items: [
    { title: "Bulk Services", url: "/dashboard/reports/bulk-services" },
    { title: "Metering Specification", url: "/dashboard/reports/metering" },
    { title: "Generator Report", url: "/dashboard/reports/generator" },
    { title: "Electrical Tariffs", url: "/dashboard/reports/tariffs" },
    { title: "Tender Adjudications", url: "/dashboard/reports/tender" },
    { title: "Lighting Specification", url: "/dashboard/reports/lighting" },
    { title: "Handover Documents", url: "/dashboard/reports/handover" },
  ],
};

const singleModules = [
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
];

const budgetsModule = {
  title: "Budgets",
  icon: Wallet,
  items: [
    { title: "Electrical", url: "/dashboard/budgets/electrical" },
    { title: "Solar Proposals", url: "/dashboard/budgets/solar" },
  ],
};

const operationalModules = [
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
    icon: Image,
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

  const isGroupActive = (items: { url: string }[]) => {
    return items.some((item) => currentPath.startsWith(item.url));
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
              {/* Dashboard */}
              {mainModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Reports - Collapsible */}
              <Collapsible defaultOpen={isGroupActive(reportsModule.items)}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="hover:bg-muted/50">
                      <reportsModule.icon className="h-4 w-4" />
                      {!collapsed && <span>{reportsModule.title}</span>}
                      {!collapsed && <ChevronDown className="ml-auto h-4 w-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {reportsModule.items.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink to={item.url} className={getNavCls(item.url)}>
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* AI Tools & Cable Sizing */}
              {singleModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Budgets - Collapsible */}
              <Collapsible defaultOpen={isGroupActive(budgetsModule.items)}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="hover:bg-muted/50">
                      <budgetsModule.icon className="h-4 w-4" />
                      {!collapsed && <span>{budgetsModule.title}</span>}
                      {!collapsed && <ChevronDown className="ml-auto h-4 w-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {budgetsModule.items.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink to={item.url} className={getNavCls(item.url)}>
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Operational Modules */}
              {operationalModules.map((item) => (
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

        {/* Admin Section at Bottom */}
        {isAdmin && (
          <div className="mt-auto">
            <Separator className="my-2" />
            <Collapsible defaultOpen={false}>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="hover:bg-muted/50 cursor-pointer">
                          <Settings className="h-4 w-4" />
                          {!collapsed && <span>Admin</span>}
                          {!collapsed && <ChevronDown className="ml-auto h-4 w-4" />}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {adminModules.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton asChild>
                                <NavLink to={item.url} className={getNavCls(item.url)}>
                                  <item.icon className="h-4 w-4" />
                                  {!collapsed && <span>{item.title}</span>}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </Collapsible>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
