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
  Lightbulb,
  FolderOpen,
  UsersRound,
  Wallet,
  Map,
  CheckSquare,
  BarChart3,
  MessageSquare,
  Layers,
  FileSpreadsheet,
  Users,
  PenTool,
  User,
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
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Project Roadmap",
    url: "/dashboard/roadmap",
    icon: CheckSquare,
  },
  {
    title: "Drawing Register",
    url: "/dashboard/drawings",
    icon: PenTool,
  },
  {
    title: "Cost Reports",
    url: "/dashboard/cost-reports",
    icon: PieChart,
  },
  {
    title: "Project Outline",
    url: "/dashboard/project-outline",
    icon: ClipboardList,
  },
  {
    title: "Tenant Tracker",
    url: "/dashboard/tenant-tracker",
    icon: UsersRound,
  },
  {
    title: "Cable Schedules",
    url: "/dashboard/cable-schedules",
    icon: Cable,
  },
  {
    title: "Bulk Services",
    url: "/dashboard/bulk-services",
    icon: Layers,
  },
];




const singleModules = [
  {
    title: "AI Tools",
    url: "/dashboard/ai-tools",
    icon: Zap,
  },
  {
    title: "AI Skills",
    url: "/dashboard/ai-skills",
    icon: Zap,
  },
];

const reportModules = [
  {
    title: "Generator Report",
    url: "/dashboard/projects-report/generator",
    icon: Zap,
  },
  {
    title: "Lighting Report",
    url: "/dashboard/projects-report/lighting",
    icon: Lightbulb,
  },
  {
    title: "Handover Documents",
    url: "/dashboard/projects-report/handover",
    icon: FolderOpen,
  },
];

const budgetsModule = {
  title: "Budgets",
  icon: Wallet,
  items: [
    { title: "Electrical", url: "/dashboard/budgets/electrical" },
  ],
};

const specificationsModule = {
  title: "Specifications",
  icon: FileStack,
  items: [
    { title: "All Specifications", url: "/dashboard/specifications" },
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
  {
    title: "BOQ",
    url: "/dashboard/boqs",
    icon: FileSpreadsheet,
  },
  {
    title: "Final Accounts",
    url: "/dashboard/final-accounts",
    icon: FileCheck,
  },
  {
    title: "Messages",
    url: "/dashboard/messages",
    icon: MessageSquare,
  },
];

const settingsModules = [
  {
    title: "My Settings",
    url: "/settings",
    icon: User,
  },
  {
    title: "Project Settings",
    url: "/dashboard/project-settings",
    icon: Settings,
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
              {/* Main Modules */}
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

              {/* Report Modules */}
              {reportModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Electrical Budget - Direct Link */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/dashboard/budgets/electrical" 
                    className={getNavCls("/dashboard/budgets/electrical")}
                  >
                    <Wallet className="h-4 w-4" />
                    {!collapsed && <span>Electrical Budget</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

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

        {/* Settings at the bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsModules.map((item) => (
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
