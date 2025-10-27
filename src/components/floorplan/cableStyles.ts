import { CableType } from "./types";

export interface CableStyle {
  color: string;
  strokeWidth: number;
  dashArray?: number[];
  label: string;
}

// IEC color coding for cables with different line styles
export const CABLE_STYLES: Record<CableType, CableStyle> = {
  "1.5mm": { 
    color: "#8B4513", // Brown
    strokeWidth: 1.5, 
    dashArray: undefined,
    label: "1.5mm²"
  },
  "2.5mm": { 
    color: "#4169E1", // Royal Blue
    strokeWidth: 2, 
    dashArray: undefined,
    label: "2.5mm²"
  },
  "4mm": { 
    color: "#32CD32", // Lime Green
    strokeWidth: 2.5, 
    dashArray: undefined,
    label: "4mm²"
  },
  "6mm": { 
    color: "#FFD700", // Gold
    strokeWidth: 3, 
    dashArray: undefined,
    label: "6mm²"
  },
  "10mm": { 
    color: "#FF4500", // Orange Red
    strokeWidth: 3.5, 
    dashArray: [10, 5],
    label: "10mm²"
  },
  "16mm": { 
    color: "#DC143C", // Crimson
    strokeWidth: 4, 
    dashArray: [10, 5],
    label: "16mm²"
  },
  "25mm": { 
    color: "#9932CC", // Dark Orchid
    strokeWidth: 4.5, 
    dashArray: [15, 5],
    label: "25mm²"
  },
  "35mm": { 
    color: "#FF1493", // Deep Pink
    strokeWidth: 5, 
    dashArray: [15, 5],
    label: "35mm²"
  },
};

// MV/HV/DC cable types
export const SPECIAL_CABLE_STYLES = {
  mv: {
    color: "#DC2626", // Red
    strokeWidth: 6,
    dashArray: [20, 10],
    label: "MV Cable"
  },
  dc: {
    color: "#EA580C", // Orange
    strokeWidth: 4,
    dashArray: [5, 5, 15, 5],
    label: "DC Cable"
  },
};
