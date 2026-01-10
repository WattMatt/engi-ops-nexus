// Baseline project roadmap template based on electrical engineering project workflow
export interface RoadmapTemplateItem {
  title: string;
  phase: string;
  sort_order: number;
  children?: { title: string; sort_order: number }[];
}

export const defaultRoadmapTemplate: RoadmapTemplateItem[] = [
  // Phase 1: External Bulk / Preparation
  {
    title: "External Bulk",
    phase: "Planning & Preparation",
    sort_order: 1,
    children: [
      { title: "Bulk Services Documentation", sort_order: 1 },
      { title: "Supply Authority Confirmation", sort_order: 2 },
    ],
  },
  
  // Phase 2: Budget Preparation / Assessment
  {
    title: "Project Budget Preparation",
    phase: "Budget & Assessment",
    sort_order: 2,
  },
  {
    title: "Budget Preparation",
    phase: "Budget & Assessment",
    sort_order: 3,
    children: [
      { title: "Note Applicable Area Schedules", sort_order: 1 },
      { title: "Confirm Supply Zoning for Transformers", sort_order: 2 },
      { title: "Mark Up Basic Design Principal", sort_order: 3 },
    ],
  },
  
  // Phase 3: Tender & Procurement
  {
    title: "Tender Specifications Compilation",
    phase: "Tender & Procurement",
    sort_order: 4,
  },
  {
    title: "Bills of Quantities",
    phase: "Tender & Procurement",
    sort_order: 5,
  },
  {
    title: "Tender Adjudication/Evaluation",
    phase: "Tender & Procurement",
    sort_order: 6,
  },
  
  // Phase 4: Documentation
  {
    title: "Documentation",
    phase: "Documentation",
    sort_order: 7,
    children: [
      { title: "Generator Reports", sort_order: 1 },
      { title: "Metering Schedules", sort_order: 2 },
      { title: "Lighting Reports", sort_order: 3 },
      { title: "Utility Recovery Reports", sort_order: 4 },
      { title: "Cable Schedules & Cable Tag Reports", sort_order: 5 },
      { title: "Tenant Tracking", sort_order: 6 },
    ],
  },
  
  // Phase 5: Construction & Tracking
  {
    title: "Equipment Ordering & Tracking",
    phase: "Construction",
    sort_order: 8,
  },
  {
    title: "Monthly Cost Reports",
    phase: "Construction",
    sort_order: 9,
  },
  {
    title: "Final Account",
    phase: "Construction",
    sort_order: 10,
  },
  
  // Phase 6: Handover
  {
    title: "Inspections",
    phase: "Handover",
    sort_order: 11,
  },
  {
    title: "Handover & Document Gathering",
    phase: "Handover",
    sort_order: 12,
  },
];
