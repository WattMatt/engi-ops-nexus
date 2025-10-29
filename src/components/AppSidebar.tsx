import { NavLink, useLocation } from "react-router-dom";
import {
  FileText,
  FileCheck,
  DollarSign,
  Package,
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
  Map,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const mainModules = [
  {
    title: "Tenant Tracker",
    url: "/dashboard",
    icon: UsersRound,
  },
  {
    title: "Project Settings",
    url: "/dashboard/project-settings",
    icon: Settings,
  },
];

const reportsModule = {
  title: "Cost Reports",
  icon: PieChart,
  items: [
    { title: "All Cost Reports", url: "/dashboard/cost-reports" },
  ],
};

const singleModules = [
  {
    title: "AI Tools",
    url: "/dashboard/ai-tools",
    icon: Zap,
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

const specificationsModule = {
  title: "Specifications",
  icon: FileStack,
  items: [
    { title: "All Specifications", url: "/dashboard/specifications" },
  ],
};

const cableSchedulesModule = {
  title: "Cable Schedules",
  icon: Cable,
  items: [
    { title: "All Cable Schedules", url: "/dashboard/cable-schedules" },
  ],
};

const operationalModules = [
  {
    title: "Site Diary",
    url: "/dashboard/site-diary",
    icon: FileText,
  },
  {
    title: "Floor Plan Markup",
    url: "/dashboard/floor-plan",
    icon: Map,
  },
];


export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
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

              {/* Specifications - Collapsible */}
              <Collapsible defaultOpen={isGroupActive(specificationsModule.items)}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="hover:bg-muted/50">
                      <specificationsModule.icon className="h-4 w-4" />
                      {!collapsed && <span>{specificationsModule.title}</span>}
                      {!collapsed && <ChevronDown className="ml-auto h-4 w-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {specificationsModule.items.map((item) => (
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

              {/* Cable Schedules - Collapsible */}
              <Collapsible defaultOpen={isGroupActive(cableSchedulesModule.items)}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="hover:bg-muted/50">
                      <cableSchedulesModule.icon className="h-4 w-4" />
                      {!collapsed && <span>{cableSchedulesModule.title}</span>}
                      {!collapsed && <ChevronDown className="ml-auto h-4 w-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {cableSchedulesModule.items.map((item) => (
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
      </SidebarContent>
    </Sidebar>
  );
}
