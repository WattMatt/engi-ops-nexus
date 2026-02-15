import {
  LayoutDashboard,
  CheckSquare,
  PenTool,
  PieChart,
  ClipboardList,
  UsersRound,
  Cable,
  Layers,
  Zap,
  Lightbulb,
  Wallet,
  FileStack,
  FileText,
  Map,
  FileSpreadsheet,
  FileCheck,
  MessageSquare,
  FolderOpen,
  User,
  Settings,
  Package,
  ClipboardCheck,
  CircuitBoard,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface WorkspaceConfig {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  defaultOpen?: boolean;
}

// Core Project Workspace - Main project overview and planning
export const coreProjectItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Project Roadmap", url: "/dashboard/roadmap", icon: CheckSquare },
  { title: "Project Outline", url: "/dashboard/project-outline", icon: ClipboardList },
  { title: "Tenant Tracker", url: "/dashboard/tenant-tracker", icon: UsersRound },
];

// Technical Design Workspace - Engineering and technical documentation
export const technicalDesignItems: NavItem[] = [
  { title: "Drawing Register", url: "/dashboard/drawings", icon: PenTool },
  { title: "Cable Schedules", url: "/dashboard/cable-schedules", icon: Cable },
  { title: "Bulk Services", url: "/dashboard/bulk-services", icon: Layers },
  { title: "Specifications", url: "/dashboard/specifications", icon: FileStack },
  { title: "Electrical Budget", url: "/dashboard/budgets/electrical", icon: Wallet },
];

// Field Operations Workspace - Site work and construction
export const fieldOperationsItems: NavItem[] = [
  { title: "Site Diary", url: "/dashboard/site-diary", icon: FileText },
  { title: "Floor Plan Markup", url: "/dashboard/floor-plan", icon: Map },
  { title: "BOQ", url: "/dashboard/boqs", icon: FileSpreadsheet },
  { title: "Final Accounts", url: "/dashboard/final-accounts", icon: FileCheck },
  { title: "Procurement", url: "/dashboard/procurement", icon: Package },
  { title: "Inspections", url: "/dashboard/inspections", icon: ClipboardCheck },
  { title: "DB Legend Cards", url: "/dashboard/db-legend-cards", icon: CircuitBoard },
];

// AI & Reports Workspace - AI tools and reporting
export const aiReportsItems: NavItem[] = [
  { title: "AI Tools", url: "/dashboard/ai-tools", icon: Zap },
  { title: "AI Skills", url: "/dashboard/ai-skills", icon: Zap },
  { title: "Generator Report", url: "/dashboard/projects-report/generator", icon: Zap },
  { title: "Lighting Report", url: "/dashboard/projects-report/lighting", icon: Lightbulb },
  { title: "Cost Reports", url: "/dashboard/cost-reports", icon: PieChart },
];

// Communication Workspace - Messaging and handover
export const communicationItems: NavItem[] = [
  { title: "Messages", url: "/dashboard/messages", icon: MessageSquare },
  { title: "Handover Documents", url: "/dashboard/projects-report/handover", icon: FolderOpen },
];

// Settings items (not a workspace, shown at bottom)
export const settingsItems: NavItem[] = [
  { title: "My Settings", url: "/settings", icon: User },
  { title: "Project Settings", url: "/dashboard/project-settings", icon: Settings },
];

// All workspaces configuration
export const workspaces: WorkspaceConfig[] = [
  {
    id: "core-project",
    title: "Core Project",
    icon: LayoutDashboard,
    items: coreProjectItems,
    defaultOpen: true,
  },
  {
    id: "technical-design",
    title: "Technical Design",
    icon: PenTool,
    items: technicalDesignItems,
  },
  {
    id: "field-operations",
    title: "Field Operations",
    icon: FileText,
    items: fieldOperationsItems,
  },
  {
    id: "ai-reports",
    title: "AI & Reports",
    icon: Zap,
    items: aiReportsItems,
  },
  {
    id: "communication",
    title: "Communication",
    icon: MessageSquare,
    items: communicationItems,
  },
];
