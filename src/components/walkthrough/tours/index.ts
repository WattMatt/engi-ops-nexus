// Export all tours from individual files
export { projectsTour } from "./ProjectsTour";
export { dashboardTour } from "./DashboardTour";
export { librariesTour } from "./LibrariesTour";
export { reportsTour } from "./ReportsTour";
export { generatorTour } from "./GeneratorTour";
export { clientPortalTour } from "./ClientPortalTour";
export { floorPlanTour } from "./FloorPlanTour";
export { adminPortalTour } from "./AdminPortalTour";
export { settingsTour } from "./SettingsTour";
export { cableScheduleTour } from "./CableScheduleTour";

// Import all tours for registry
import { projectsTour } from "./ProjectsTour";
import { dashboardTour } from "./DashboardTour";
import { librariesTour } from "./LibrariesTour";
import { reportsTour } from "./ReportsTour";
import { generatorTour } from "./GeneratorTour";
import { clientPortalTour } from "./ClientPortalTour";
import { floorPlanTour } from "./FloorPlanTour";
import { adminPortalTour } from "./AdminPortalTour";
import { settingsTour } from "./SettingsTour";
import { cableScheduleTour } from "./CableScheduleTour";

import { Tour } from "../types";

/**
 * Complete registry of all available tours
 */
export const allPageTours: Tour[] = [
  projectsTour,
  dashboardTour,
  librariesTour,
  reportsTour,
  generatorTour,
  clientPortalTour,
  floorPlanTour,
  adminPortalTour,
  settingsTour,
  cableScheduleTour,
];

/**
 * Get a tour by its ID
 */
export function getPageTourById(id: string): Tour | undefined {
  return allPageTours.find((tour) => tour.id === id);
}

/**
 * Get tours relevant to a specific route
 */
export function getPageToursForRoute(route: string): Tour[] {
  return allPageTours
    .filter((tour) => {
      if (!tour.route) return false;
      // Match exact route or route prefix
      return route === tour.route || route.startsWith(tour.route + "/");
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Get all tours organized by category
 */
export function getToursByCategory(): Record<string, Tour[]> {
  return {
    "Getting Started": [projectsTour, dashboardTour],
    "Core Features": [cableScheduleTour, librariesTour, floorPlanTour],
    "Reports & Documents": [reportsTour, generatorTour],
    "Collaboration": [clientPortalTour],
    "Administration": [adminPortalTour, settingsTour],
  };
}
