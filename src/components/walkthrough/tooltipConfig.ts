// Export all tooltip utilities for easy integration
export { NavTooltip } from "./NavTooltip";
export { FormFieldTooltip, FormLabelWithHelp } from "./FormFieldTooltip";
export { SearchTooltip, FilterTooltip, RefreshTooltip } from "./SearchTooltips";

// Pre-defined tooltip configurations for common buttons
export const buttonTooltips = {
  masterLibrary: {
    title: "Master Library",
    description: "Access your centralized library of materials, contacts, and rates. Data here is shared across all projects.",
    shortcut: "Ctrl+L",
  },
  contactLibrary: {
    title: "Contact Library",
    description: "Manage clients, suppliers, and team contacts. Quick access to contact information for all projects.",
    shortcut: "Ctrl+Shift+C",
  },
  adminPortal: {
    title: "Admin Portal",
    description: "System administration: manage users, permissions, settings, and view activity logs. Admin access required.",
    shortcut: "Ctrl+Shift+A",
  },
  createProject: {
    title: "Create Project",
    description: "Start a new project. You'll set up project details, assign team members, and configure initial settings.",
    shortcut: "Ctrl+N",
  },
  export: {
    title: "Export",
    description: "Download data as PDF or Excel. Choose format based on your needs: PDF for sharing, Excel for analysis.",
    shortcut: "Ctrl+E",
  },
  save: {
    title: "Save Changes",
    description: "Save your current work. Changes are also auto-saved periodically.",
    shortcut: "Ctrl+S",
  },
  delete: {
    title: "Delete",
    description: "Remove this item permanently. This action cannot be undone.",
    shortcut: "Delete",
  },
  duplicate: {
    title: "Duplicate",
    description: "Create a copy of this item with all its settings and data.",
    shortcut: "Ctrl+D",
  },
  settings: {
    title: "Settings",
    description: "Configure options and preferences for this feature or project.",
    shortcut: "Ctrl+,",
  },
  help: {
    title: "Help & Support",
    description: "Access documentation, tutorials, and support. Start guided tours from here.",
    shortcut: "F1",
  },
  notifications: {
    title: "Notifications",
    description: "View alerts, messages, and updates about your projects and team activity.",
  },
  search: {
    title: "Search",
    description: "Find anything quickly. Search across projects, documents, and data.",
    shortcut: "Ctrl+K",
  },
  filter: {
    title: "Filter",
    description: "Narrow down results by status, date, category, or custom criteria.",
  },
  refresh: {
    title: "Refresh",
    description: "Reload data to see the latest updates.",
    shortcut: "Ctrl+R",
  },
};
