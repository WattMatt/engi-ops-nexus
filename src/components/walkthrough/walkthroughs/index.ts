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

// Import comprehensive page tours
import {
  projectsTour,
  dashboardTour as dashboardPageTour,
  librariesTour,
  reportsTour,
  generatorTour,
  clientPortalTour,
  floorPlanTour,
  adminPortalTour,
  settingsTour as settingsPageTour,
  cableScheduleTour as cableSchedulePageTour,
  allPageTours,
  getPageTourById,
  getPageToursForRoute,
  getToursByCategory,
} from "../tours";

// ============================================
// LEGACY TOURS (for backward compatibility)
// Keep these for existing integrations
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
      description: "Click the help icon to access documentation, replay this tour, or contact support.",
      targetSelector: "[data-testid='help-button'], .help-button, button[aria-label*='help']",
      placement: "bottom-end",
      spotlightPadding: 8,
      icon: HelpCircle,
      iconColor: "text-cyan-600",
      iconBgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      type: "tooltip",
    },
  ],
};

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
      description: "Use the search bar to quickly find projects by name or number.",
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
      id: "create-project",
      title: "Create New Project",
      description: "Click this button to create a new project.",
      targetSelector: "[data-testid='create-project'], button:has(svg.lucide-plus)",
      placement: "bottom",
      spotlightPadding: 8,
      icon: Plus,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-100 dark:bg-green-900/30",
      type: "spotlight",
    },
  ],
};

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
      description: "This module helps you create, manage, and track cable schedules for your electrical projects.",
      icon: Cable,
      iconColor: "text-amber-600",
      iconBgColor: "bg-amber-100 dark:bg-amber-900/30",
      type: "modal",
    },
    {
      id: "add-cable",
      title: "Add Cable Entry",
      description: "Click to add a new cable entry with automatic sizing calculations.",
      targetSelector: "[data-testid='add-cable'], button:has(svg.lucide-plus)",
      placement: "bottom",
      spotlightPadding: 8,
      icon: Plus,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-100 dark:bg-green-900/30",
      type: "spotlight",
      allowInteraction: true,
    },
  ],
};

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
      description: "Configure all aspects of your project from this central settings hub.",
      icon: Settings,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/10",
      type: "modal",
    },
    {
      id: "tabs",
      title: "Settings Tabs",
      description: "Navigate between different setting categories using these tabs.",
      targetSelector: "[role='tablist'], .tabs-list",
      placement: "bottom",
      spotlightPadding: 8,
      icon: FolderKanban,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      type: "spotlight",
      allowInteraction: true,
    },
  ],
};

// ============================================
// COMBINED TOURS REGISTRY
// ============================================

// Legacy aliases
export const dashboardWalkthrough = dashboardTour;
export const projectSelectWalkthrough = projectSelectTour;
export const cableScheduleWalkthrough = cableScheduleTour;
export const settingsWalkthrough = settingsTour;

// Combined all tours (legacy + new comprehensive)
export const allTours: Tour[] = [
  // Comprehensive page tours
  ...allPageTours,
];

// Legacy export
export const allWalkthroughs = allTours;

// Get tour by ID - checks both legacy and new tours
export function getTourById(id: string): Tour | undefined {
  // Check comprehensive tours first
  const pageTour = getPageTourById(id);
  if (pageTour) return pageTour;
  
  // Fallback to legacy tours
  const legacyTours = [dashboardTour, projectSelectTour, cableScheduleTour, settingsTour];
  return legacyTours.find((t) => t.id === id);
}

// Legacy export
export const getWalkthroughById = getTourById;

// Get tours for a specific route
export function getToursForRoute(route: string): Tour[] {
  // Use comprehensive tours
  const pageTours = getPageToursForRoute(route);
  if (pageTours.length > 0) return pageTours;
  
  // Fallback to all tours
  return allTours
    .filter((t) => !t.route || route.includes(t.route))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

// Legacy export
export const getWalkthroughsForRoute = getToursForRoute;

// Re-export from tours
export { getToursByCategory };
