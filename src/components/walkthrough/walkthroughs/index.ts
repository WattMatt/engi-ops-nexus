import { Tour, WalkthroughStep } from "../types";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Settings, 
  MessageSquare,
  FileText,
  Users,
  Cable,
  Zap,
  Building,
  Search,
  Bell,
  HelpCircle,
  Plus,
  Download,
  Table,
  Calculator
} from "lucide-react";

// ============================================
// DASHBOARD TOUR - With target selectors for spotlight
// ============================================
export const dashboardTour: Tour = {
  id: "dashboard-overview",
  name: "Dashboard Overview",
  description: "Learn how to navigate and use the main dashboard",
  route: "/dashboard",
  triggerOnFirstVisit: true,
  autoStart: true,
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
      type: "modal",
    },
    {
      id: "sidebar-navigation",
      title: "Navigation Sidebar",
      description: "Use the sidebar to navigate between different modules. Each section is organized by function for easy access.",
      targetSelector: "[data-testid='sidebar'], .sidebar, nav[role='navigation']",
      placement: "right",
      spotlightPadding: 8,
      icon: FolderKanban,
      iconColor: "text-purple-600",
      iconBgColor: "bg-purple-100 dark:bg-purple-900/30",
      type: "spotlight",
      allowInteraction: true,
    },
    {
      id: "project-header",
      title: "Project Context",
      description: "The header shows your currently selected project. Click on it to switch between projects or access project settings.",
      targetSelector: "[data-testid='project-header'], .project-header, header",
      placement: "bottom",
      spotlightPadding: 4,
      icon: Building,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      type: "spotlight",
    },
    {
      id: "notifications",
      title: "Notifications & Messages",
      description: "Access messages, notifications, and your profile from the top-right corner. Stay updated on project activities.",
      targetSelector: "[data-testid='notifications'], .notifications-bell, button[aria-label*='notification']",
      placement: "bottom-end",
      spotlightPadding: 8,
      icon: Bell,
      iconColor: "text-orange-600",
      iconBgColor: "bg-orange-100 dark:bg-orange-900/30",
      type: "tooltip",
      waitForElement: true,
    },
    {
      id: "help-menu",
      title: "Get Help Anytime",
      description: "Click the help icon to access documentation, replay this tour, or contact support. You can always find assistance here.",
      targetSelector: "[data-testid='help-button'], .help-button, button[aria-label*='help']",
      placement: "bottom-end",
      spotlightPadding: 8,
      icon: HelpCircle,
      iconColor: "text-cyan-600",
      iconBgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      type: "tooltip",
      highlightActions: [
        {
          label: "View Documentation",
          onClick: () => window.open("/docs", "_blank"),
          variant: "outline",
        },
      ],
    },
  ],
};

// ============================================
// PROJECT SELECT TOUR
// ============================================
export const projectSelectTour: Tour = {
  id: "project-select-guide",
  name: "Project Selection",
  description: "Learn how to select and manage projects",
  route: "/projects",
  triggerOnFirstVisit: true,
  autoStart: true,
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
      type: "modal",
    },
    {
      id: "search-filter",
      title: "Search & Filter",
      description: "Use the search bar to quickly find projects by name or number. Filter by status to see active, completed, or archived projects.",
      targetSelector: "[data-testid='project-search'], input[placeholder*='search' i], .search-input",
      placement: "bottom",
      spotlightPadding: 8,
      icon: Search,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      type: "spotlight",
      allowInteraction: true,
    },
    {
      id: "project-card",
      title: "Project Cards",
      description: "Each card shows key project information including status, dates, and progress. Click on a project to open it.",
      targetSelector: "[data-testid='project-card']:first-child, .project-card:first-child, article:first-child",
      placement: "right",
      spotlightPadding: 12,
      icon: Building,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      type: "spotlight",
      allowInteraction: true,
    },
    {
      id: "create-project",
      title: "Create New Project",
      description: "Click this button to create a new project. You'll be guided through setting up project details, team members, and initial documents.",
      targetSelector: "[data-testid='create-project'], button:has-text('New Project'), button:has-text('Create')",
      placement: "bottom",
      spotlightPadding: 8,
      icon: Plus,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-100 dark:bg-green-900/30",
      type: "spotlight",
      highlightActions: [
        {
          label: "Create Project",
          onClick: () => {},
          variant: "default",
          icon: Plus,
        },
      ],
    },
  ],
};

// ============================================
// CABLE SCHEDULE TOUR - With infographics
// ============================================
export const cableScheduleTour: Tour = {
  id: "cable-schedule-guide",
  name: "Cable Schedule Guide",
  description: "Learn how to create and manage cable schedules",
  route: "/cable-schedule",
  triggerOnFirstVisit: true,
  autoStart: true,
  showOnce: true,
  priority: 5,
  steps: [
    {
      id: "overview",
      title: "Cable Schedule Overview",
      description: "This module helps you create, manage, and track cable schedules for your electrical projects. It automatically calculates sizing, voltage drop, and costs.",
      icon: Cable,
      iconColor: "text-amber-600",
      iconBgColor: "bg-amber-100 dark:bg-amber-900/30",
      type: "modal",
      // Example infographic - would need actual image
      // infographic: {
      //   type: "image",
      //   src: "/images/cable-schedule-overview.png",
      //   alt: "Cable schedule interface overview",
      // },
    },
    {
      id: "schedule-list",
      title: "Schedule List",
      description: "View all cable schedules for this project. Each schedule can contain multiple cable entries organized by circuit type.",
      targetSelector: "[data-testid='schedule-list'], .schedule-list, table",
      placement: "right",
      spotlightPadding: 8,
      icon: Table,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      type: "spotlight",
    },
    {
      id: "add-cable",
      title: "Add Cable Entry",
      description: "Click to add a new cable entry. Enter from/to locations, load details, and the system will recommend cable sizing.",
      targetSelector: "[data-testid='add-cable'], button:has-text('Add Cable'), button:has-text('New Entry')",
      placement: "bottom",
      spotlightPadding: 8,
      icon: Plus,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-100 dark:bg-green-900/30",
      type: "spotlight",
      allowInteraction: true,
    },
    {
      id: "calculations",
      title: "Automatic Calculations",
      description: "Voltage drop, cable sizing, and cost estimates are calculated automatically based on SANS 10142 standards and your project settings.",
      targetSelector: "[data-testid='calculations'], .calculation-panel, .voltage-drop",
      placement: "left",
      spotlightPadding: 8,
      icon: Calculator,
      iconColor: "text-purple-600",
      iconBgColor: "bg-purple-100 dark:bg-purple-900/30",
      type: "tooltip",
    },
    {
      id: "export",
      title: "Export & Reports",
      description: "Generate professional PDF reports and export schedules to Excel for sharing with your team and clients.",
      targetSelector: "[data-testid='export-button'], button:has-text('Export'), button:has-text('Download')",
      placement: "bottom",
      spotlightPadding: 8,
      icon: Download,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-100 dark:bg-green-900/30",
      type: "spotlight",
      highlightActions: [
        {
          label: "Export to PDF",
          onClick: () => {},
          variant: "outline",
          icon: Download,
        },
        {
          label: "Export to Excel",
          onClick: () => {},
          variant: "outline",
          icon: Table,
        },
      ],
    },
  ],
};

// ============================================
// SETTINGS TOUR
// ============================================
export const settingsTour: Tour = {
  id: "settings-guide",
  name: "Settings Guide",
  description: "Learn how to configure your project settings",
  route: "/settings",
  triggerOnFirstVisit: true,
  autoStart: true,
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
      type: "modal",
    },
    {
      id: "tabs",
      title: "Settings Tabs",
      description: "Navigate between different setting categories using these tabs. Changes are saved automatically.",
      targetSelector: "[role='tablist'], .tabs-list",
      placement: "bottom",
      spotlightPadding: 8,
      icon: FolderKanban,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      type: "spotlight",
      allowInteraction: true,
    },
    {
      id: "team",
      title: "Team Management",
      description: "Manage team members, assign roles, and control access permissions for different project areas.",
      icon: Users,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      type: "modal",
    },
  ],
};

// ============================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================
export const dashboardWalkthrough = dashboardTour;
export const projectSelectWalkthrough = projectSelectTour;
export const cableScheduleWalkthrough = cableScheduleTour;
export const settingsWalkthrough = settingsTour;

// All tours registry
export const allTours: Tour[] = [
  dashboardTour,
  projectSelectTour,
  cableScheduleTour,
  settingsTour,
];

// Legacy export
export const allWalkthroughs = allTours;

// Get tour by ID
export function getTourById(id: string): Tour | undefined {
  return allTours.find((t) => t.id === id);
}

// Legacy export
export const getWalkthroughById = getTourById;

// Get tours for a specific route
export function getToursForRoute(route: string): Tour[] {
  return allTours
    .filter((t) => !t.route || route.includes(t.route))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

// Legacy export
export const getWalkthroughsForRoute = getToursForRoute;
