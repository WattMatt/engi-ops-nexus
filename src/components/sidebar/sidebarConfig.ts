import {
  LayoutDashboard,
  Briefcase,
  Calculator,
  ClipboardCheck,
  FileText,
  Settings,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { 
    title: "Dashboard", 
    url: "/dashboard", 
    icon: LayoutDashboard 
  },
  { 
    title: "Projects", 
    url: "/dashboard/projects", 
    icon: Briefcase 
  },
  { 
    title: "Cable Calculator", 
    url: "/dashboard/tools/cable-calculator", 
    icon: Calculator 
  },
  { 
    title: "Inspections", 
    url: "/dashboard/inspections", 
    icon: ClipboardCheck 
  },
  { 
    title: "Reports", 
    url: "/dashboard/reports", 
    icon: FileText 
  },
  { 
    title: "Settings", 
    url: "/settings", 
    icon: Settings 
  },
];
