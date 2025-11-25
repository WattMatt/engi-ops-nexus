export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface RoutePoint extends Point3D {
  id: string;
  label?: string;
}

export interface CableRoute {
  id: string;
  name: string;
  points: RoutePoint[];
  cableType: 'PVC/PVC' | 'PVC/SWA/PVC' | 'XLPE/SWA/PVC' | 'LSZH';
  diameter: number;
  timestamp: string;
  metrics?: RouteMetrics;
}

export interface RouteMetrics {
  totalLength: number;
  totalCost: number;
  supportCount: number;
  bendCount: number;
  complexity: 'Low' | 'Medium' | 'High';
}

export interface BIMObject {
  id: string;
  name: string;
  type: 'beam' | 'column' | 'wall' | 'duct' | 'pipe' | 'conduit' | 'slab' | 'equipment';
  discipline: 'Structural' | 'Mechanical' | 'Electrical' | 'Plumbing' | 'Architectural';
  position: Point3D;
  dimensions: { width: number; height: number; depth: number };
  rotation?: number;
  visible: boolean;
  sourceFile?: string;
}

export interface Clash {
  id: string;
  position: Point3D;
  severity: 'critical' | 'warning' | 'minor';
  penetrationDepth: number;
  objectId: string;
  objectName: string;
  description: string;
}

export interface ComplianceCheck {
  id: string;
  regulation: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export interface Material {
  description: string;
  partNumber: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier: string;
  notes?: string;
}

export interface CostTemplate {
  id: string;
  name: string;
  laborRate: number; // percentage
  materialMultiplier: number;
  installationMultiplier: number;
  supportsMultiplier: number;
}

export interface TestItem {
  id: string;
  category: string;
  regulation: string;
  description: string;
  status: 'pass' | 'fail' | 'na' | 'pending';
  testValue?: string;
  notes?: string;
  photos?: string[];
}

export interface RouteVersion {
  id: string;
  timestamp: string;
  name: string;
  description: string;
  points: RoutePoint[];
  cableType: string;
  diameter: number;
  metrics: RouteMetrics;
  changeType: 'manual' | 'auto' | 'optimization';
}
