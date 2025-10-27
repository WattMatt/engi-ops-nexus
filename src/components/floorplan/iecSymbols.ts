import { Group, Circle, Rect, Line, Path, Polygon } from "fabric";
import { EquipmentType } from "./types";

// IEC 60617 compliant electrical symbols
// All symbols are created with a standard size and will be scaled based on floor plan scale

export const createIECSymbol = (type: EquipmentType, scale: number = 1): Group => {
  const baseSize = 20; // Base size in pixels
  const scaledSize = baseSize * scale;
  
  switch (type) {
    case "main-board":
    case "sub-board":
    case "distribution-board":
      return createDistributionBoard(scaledSize, type);
    
    case "rmu":
      return createRMU(scaledSize);
    
    case "miniature-substation":
      return createSubstation(scaledSize);
    
    case "generator":
      return createGenerator(scaledSize);
    
    case "inverter":
      return createInverter(scaledSize);
    
    case "16a-socket":
    case "double-socket":
      return createSocket(scaledSize, type === "double-socket");
    
    case "three-phase-outlet":
      return createThreePhaseSocket(scaledSize);
    
    case "light-switch":
    case "two-way-switch":
      return createSwitch(scaledSize, type === "two-way-switch");
    
    case "ceiling-light":
    case "wall-light":
      return createLight(scaledSize, type);
    
    case "recessed-600x600":
    case "recessed-1200x600":
      return createRecessedLight(scaledSize, type);
    
    case "pole-light":
      return createPoleLight(scaledSize);
    
    case "cctv":
      return createCCTV(scaledSize);
    
    case "data-outlet":
      return createDataOutlet(scaledSize);
    
    case "manhole":
      return createManhole(scaledSize);
    
    default:
      return createGenericSymbol(scaledSize);
  }
};

// Distribution Board (IEC 60617-11-04-02)
const createDistributionBoard = (size: number, type: EquipmentType): Group => {
  const mainRect = new Rect({
    width: size,
    height: size * 1.2,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const crossLine1 = new Line([0, 0, size, size * 1.2], {
    stroke: "#000000",
    strokeWidth: 1.5,
  });
  
  const crossLine2 = new Line([size, 0, 0, size * 1.2], {
    stroke: "#000000",
    strokeWidth: 1.5,
  });
  
  const label = type === "main-board" ? "MB" : type === "sub-board" ? "SB" : "DB";
  
  return new Group([mainRect, crossLine1, crossLine2], {
    selectable: true,
  });
};

// RMU - Ring Main Unit (IEC 60617-11-04-07)
const createRMU = (size: number): Group => {
  const outerRect = new Rect({
    width: size * 1.5,
    height: size,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2.5,
  });
  
  const innerRect = new Rect({
    width: size * 1.2,
    height: size * 0.7,
    left: size * 0.15,
    top: size * 0.15,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 1.5,
  });
  
  const terminal1 = new Circle({
    radius: size * 0.1,
    left: size * 0.25,
    top: size * 0.4,
    fill: "#000000",
  });
  
  const terminal2 = new Circle({
    radius: size * 0.1,
    left: size * 0.75,
    top: size * 0.4,
    fill: "#000000",
  });
  
  const terminal3 = new Circle({
    radius: size * 0.1,
    left: size * 1.15,
    top: size * 0.4,
    fill: "#000000",
  });
  
  return new Group([outerRect, innerRect, terminal1, terminal2, terminal3], {
    selectable: true,
  });
};

// Miniature Substation (IEC 60617-11-04-06)
const createSubstation = (size: number): Group => {
  const building = new Rect({
    width: size * 2,
    height: size * 1.5,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 3,
  });
  
  const roof = new Polygon([
    { x: 0, y: 0 },
    { x: size, y: -size * 0.5 },
    { x: size * 2, y: 0 },
  ], {
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const hvSymbol = new Line([size * 0.5, size * 0.5, size * 1.5, size * 0.5], {
    stroke: "#DC2626",
    strokeWidth: 3,
  });
  
  return new Group([building, roof, hvSymbol], {
    selectable: true,
  });
};

// Generator (IEC 60617-06-08-01)
const createGenerator = (size: number): Group => {
  const circle = new Circle({
    radius: size * 0.5,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const gLetter = new Path("M 0,-10 L 0,10 M 0,0 L 8,0 L 8,10", {
    stroke: "#000000",
    strokeWidth: 2,
    scaleX: size / 20,
    scaleY: size / 20,
  });
  
  return new Group([circle, gLetter], {
    selectable: true,
  });
};

// Inverter (IEC 60617-13-06-05)
const createInverter = (size: number): Group => {
  const rect = new Rect({
    width: size * 1.2,
    height: size,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  // DC symbol (straight lines)
  const dcLine1 = new Line([size * 0.2, size * 0.3, size * 0.2, size * 0.7], {
    stroke: "#EA580C",
    strokeWidth: 2,
  });
  
  const dcLine2 = new Line([size * 0.35, size * 0.35, size * 0.35, size * 0.65], {
    stroke: "#EA580C",
    strokeWidth: 1.5,
  });
  
  // AC symbol (sine wave)
  const acWave = new Path("M 0,0 Q 5,-8 10,0 T 20,0", {
    stroke: "#2563EB",
    strokeWidth: 2,
    left: size * 0.7,
    top: size * 0.5,
    scaleX: size / 40,
    scaleY: size / 40,
  });
  
  return new Group([rect, dcLine1, dcLine2, acWave], {
    selectable: true,
  });
};

// Socket (IEC 60617-11-07-01)
const createSocket = (size: number, isDouble: boolean): Group => {
  const circle1 = new Circle({
    radius: size * 0.3,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const pins1 = [
    new Line([0, -size * 0.15, 0, size * 0.15], {
      stroke: "#000000",
      strokeWidth: 2,
    }),
    new Line([-size * 0.15, 0, size * 0.15, 0], {
      stroke: "#000000",
      strokeWidth: 2,
    }),
  ];
  
  if (!isDouble) {
    return new Group([circle1, ...pins1], {
      selectable: true,
    });
  }
  
  const circle2 = new Circle({
    radius: size * 0.3,
    left: size * 0.7,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const pins2 = [
    new Line([size * 0.7, -size * 0.15, size * 0.7, size * 0.15], {
      stroke: "#000000",
      strokeWidth: 2,
    }),
    new Line([size * 0.55, 0, size * 0.85, 0], {
      stroke: "#000000",
      strokeWidth: 2,
    }),
  ];
  
  return new Group([circle1, ...pins1, circle2, ...pins2], {
    selectable: true,
  });
};

// Three Phase Socket (IEC 60617-11-07-02)
const createThreePhaseSocket = (size: number): Group => {
  const circle = new Circle({
    radius: size * 0.4,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2.5,
  });
  
  const pin1 = new Circle({ radius: size * 0.06, top: -size * 0.2, fill: "#000000" });
  const pin2 = new Circle({ radius: size * 0.06, left: -size * 0.17, top: size * 0.1, fill: "#000000" });
  const pin3 = new Circle({ radius: size * 0.06, left: size * 0.17, top: size * 0.1, fill: "#000000" });
  const earth = new Line([0, size * 0.25, 0, size * 0.35], { stroke: "#008000", strokeWidth: 2 });
  
  return new Group([circle, pin1, pin2, pin3, earth], {
    selectable: true,
  });
};

// Switch (IEC 60617-11-06-01)
const createSwitch = (size: number, isTwoWay: boolean): Group => {
  const base = new Circle({
    radius: size * 0.25,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const lever = new Line([0, 0, size * 0.2, -size * 0.2], {
    stroke: "#000000",
    strokeWidth: 2.5,
  });
  
  if (!isTwoWay) {
    return new Group([base, lever], {
      selectable: true,
    });
  }
  
  const lever2 = new Line([0, 0, -size * 0.2, -size * 0.2], {
    stroke: "#000000",
    strokeWidth: 1.5,
    strokeDashArray: [3, 3],
  });
  
  return new Group([base, lever, lever2], {
    selectable: true,
  });
};

// Light Fixture (IEC 60617-11-05-01)
const createLight = (size: number, type: EquipmentType): Group => {
  if (type === "ceiling-light") {
    const circle = new Circle({
      radius: size * 0.35,
      fill: "transparent",
      stroke: "#000000",
      strokeWidth: 2,
    });
    
    const cross1 = new Line([-size * 0.25, 0, size * 0.25, 0], {
      stroke: "#000000",
      strokeWidth: 1.5,
    });
    
    const cross2 = new Line([0, -size * 0.25, 0, size * 0.25], {
      stroke: "#000000",
      strokeWidth: 1.5,
    });
    
    return new Group([circle, cross1, cross2], {
      selectable: true,
    });
  } else {
    // Wall light
    const arc = new Circle({
      radius: size * 0.3,
      fill: "transparent",
      stroke: "#000000",
      strokeWidth: 2,
      startAngle: 0,
      endAngle: Math.PI,
    });
    
    const base = new Line([0, 0, size * 0.2, 0], {
      stroke: "#000000",
      strokeWidth: 2,
    });
    
    return new Group([arc, base], {
      selectable: true,
    });
  }
};

// Recessed Light (IEC 60617-11-05-03)
const createRecessedLight = (size: number, type: EquipmentType): Group => {
  const isLarge = type === "recessed-1200x600";
  const width = isLarge ? size * 2 : size;
  const height = isLarge ? size : size;
  
  const rect = new Rect({
    width,
    height,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const diag1 = new Line([0, 0, width, height], {
    stroke: "#000000",
    strokeWidth: 1,
  });
  
  const diag2 = new Line([width, 0, 0, height], {
    stroke: "#000000",
    strokeWidth: 1,
  });
  
  return new Group([rect, diag1, diag2], {
    selectable: true,
  });
};

// Pole Light (IEC 60617-11-05-06)
const createPoleLight = (size: number): Group => {
  const pole = new Line([0, 0, 0, size * 1.5], {
    stroke: "#000000",
    strokeWidth: 2.5,
  });
  
  const luminaire = new Circle({
    radius: size * 0.25,
    top: -size * 0.25,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const rays = [
    new Line([-size * 0.4, -size * 0.2, -size * 0.5, -size * 0.3], {
      stroke: "#FFA500",
      strokeWidth: 1.5,
    }),
    new Line([size * 0.4, -size * 0.2, size * 0.5, -size * 0.3], {
      stroke: "#FFA500",
      strokeWidth: 1.5,
    }),
    new Line([-size * 0.35, 0, -size * 0.5, 0], {
      stroke: "#FFA500",
      strokeWidth: 1.5,
    }),
    new Line([size * 0.35, 0, size * 0.5, 0], {
      stroke: "#FFA500",
      strokeWidth: 1.5,
    }),
  ];
  
  return new Group([pole, luminaire, ...rays], {
    selectable: true,
  });
};

// CCTV Camera (IEC 60617-12-04-01)
const createCCTV = (size: number): Group => {
  const body = new Rect({
    width: size * 0.6,
    height: size * 0.4,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const lens = new Circle({
    radius: size * 0.15,
    left: size * 0.6,
    top: size * 0.125,
    fill: "#000000",
  });
  
  const mount = new Line([size * 0.3, size * 0.4, size * 0.3, size * 0.6], {
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  return new Group([body, lens, mount], {
    selectable: true,
  });
};

// Data Outlet (IEC 60617-12-01-01)
const createDataOutlet = (size: number): Group => {
  const rect = new Rect({
    width: size * 0.6,
    height: size * 0.4,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const connector = new Rect({
    width: size * 0.4,
    height: size * 0.15,
    left: size * 0.1,
    top: size * 0.125,
    fill: "#2563EB",
    stroke: "#000000",
    strokeWidth: 1,
  });
  
  return new Group([rect, connector], {
    selectable: true,
  });
};

// Manhole (IEC 60617-11-01-04)
const createManhole = (size: number): Group => {
  const circle = new Circle({
    radius: size * 0.5,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 3,
  });
  
  const cover = new Circle({
    radius: size * 0.4,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
    strokeDashArray: [5, 5],
  });
  
  const mLetter = new Path("M -8,-6 L -8,6 M -8,-6 L 0,0 L 8,-6 L 8,6", {
    stroke: "#000000",
    strokeWidth: 2,
    scaleX: size / 20,
    scaleY: size / 20,
  });
  
  return new Group([circle, cover, mLetter], {
    selectable: true,
  });
};

// Generic Symbol (fallback)
const createGenericSymbol = (size: number): Group => {
  const rect = new Rect({
    width: size,
    height: size,
    fill: "#f0f0f0",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const cross1 = new Line([0, 0, size, size], {
    stroke: "#000000",
    strokeWidth: 1,
  });
  
  const cross2 = new Line([size, 0, 0, size], {
    stroke: "#000000",
    strokeWidth: 1,
  });
  
  return new Group([rect, cross1, cross2], {
    selectable: true,
  });
};
