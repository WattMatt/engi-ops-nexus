import { Walkthrough } from "../types";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Settings, 
  MessageSquare,
  FileText,
  Users,
  Cable,
  Zap,
  Building
} from "lucide-react";

// Dashboard Walkthrough
export const dashboardWalkthrough: Walkthrough = {
  id: "dashboard-overview",
  name: "Dashboard Overview",
  description: "Learn how to navigate and use the main dashboard",
  route: "/dashboard",
  triggerOnFirstVisit: true,
  showOnce: true,
  priority: 10,
  steps: [
    {
      id: "welcome",
      title: "Welcome to Your Dashboard",
      description: "This is your central hub for managing projects, documents, and team activities. Let's take a quick tour of the key features.",
      icon: LayoutDashboard,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      id: "navigation",
      title: "Navigation Sidebar",
      description: "Use the sidebar on the left to navigate between different modules. Each section is organized by function for easy access.",
      icon: FolderKanban,
      iconColor: "text-purple-600",
      iconBgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      id: "project-context",
      title: "Project Context",
      description: "The header shows your currently selected project. Click on it to switch between projects or access project settings.",
      icon: Building,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      id: "quick-actions",
      title: "Quick Actions & Notifications",
      description: "Access messages, notifications, and your profile from the top-right corner. Stay updated on project activities and team communications.",
      icon: MessageSquare,
      iconColor: "text-orange-600",
      iconBgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      id: "settings",
      title: "Customize Your Experience",
      description: "Visit Settings to configure project preferences, manage team access, and customize your workspace. You can always revisit this guide from the help menu.",
      icon: Settings,
      iconColor: "text-cyan-600",
      iconBgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    },
  ],
};

// Project Select Walkthrough
export const projectSelectWalkthrough: Walkthrough = {
  id: "project-select-guide",
  name: "Project Selection",
  description: "Learn how to select and manage projects",
  route: "/projects",
  triggerOnFirstVisit: true,
  showOnce: true,
  priority: 9,
  steps: [
    {
      id: "welcome",
      title: "Select Your Project",
      description: "This is where you choose which project to work on. Each project has its own documents, team, and settings.",
      icon: FolderKanban,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/10",
    },
    {
      id: "search-filter",
      title: "Search & Filter",
      description: "Use the search bar to quickly find projects by name or number. Filter by status to see active, completed, or archived projects.",
      icon: FileText,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      id: "project-card",
      title: "Project Details",
      description: "Each card shows key project information including status, dates, and progress. Click on a project to open it.",
      icon: Building,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
  ],
};

// Cable Schedule Walkthrough
export const cableScheduleWalkthrough: Walkthrough = {
  id: "cable-schedule-guide",
  name: "Cable Schedule Guide",
  description: "Learn how to create and manage cable schedules",
  route: "/cable-schedule",
  triggerOnFirstVisit: true,
  showOnce: true,
  priority: 5,
  steps: [
    {
      id: "overview",
      title: "Cable Schedule Overview",
      description: "This module helps you create, manage, and track cable schedules for your electrical projects.",
      icon: Cable,
      iconColor: "text-amber-600",
      iconBgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      id: "create-schedule",
      title: "Creating Schedules",
      description: "Click 'New Schedule' to start. Enter schedule details, add cable entries, and the system will calculate quantities automatically.",
      icon: FileText,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      id: "calculations",
      title: "Automatic Calculations",
      description: "Voltage drop, cable sizing, and cost estimates are calculated automatically based on your inputs and project settings.",
      icon: Zap,
      iconColor: "text-yellow-600",
      iconBgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    {
      id: "export",
      title: "Export & Reports",
      description: "Generate professional PDF reports and export schedules to Excel for sharing with your team and clients.",
      icon: FileText,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-100 dark:bg-green-900/30",
    },
  ],
};

// Settings Walkthrough
export const settingsWalkthrough: Walkthrough = {
  id: "settings-guide",
  name: "Settings Guide",
  description: "Learn how to configure your project settings",
  route: "/settings",
  triggerOnFirstVisit: true,
  showOnce: true,
  priority: 4,
  steps: [
    {
      id: "overview",
      title: "Project Settings",
      description: "Configure all aspects of your project from this central settings hub. Each tab focuses on a specific area.",
      icon: Settings,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/10",
    },
    {
      id: "general",
      title: "General Settings",
      description: "Update project information, client details, and core project parameters that affect the entire project.",
      icon: Building,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      id: "team",
      title: "Team Management",
      description: "Manage team members, assign roles, and control access permissions for different project areas.",
      icon: Users,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
  ],
};

// All walkthroughs registry
export const allWalkthroughs: Walkthrough[] = [
  dashboardWalkthrough,
  projectSelectWalkthrough,
  cableScheduleWalkthrough,
  settingsWalkthrough,
];

// Get walkthrough by ID
export function getWalkthroughById(id: string): Walkthrough | undefined {
  return allWalkthroughs.find((w) => w.id === id);
}

// Get walkthroughs for a specific route
export function getWalkthroughsForRoute(route: string): Walkthrough[] {
  return allWalkthroughs
    .filter((w) => !w.route || route.includes(w.route))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}
