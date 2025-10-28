import { Group, Circle, Rect, Line, Path, Polygon, Text } from "fabric";
import { EquipmentType } from "./types";

// Simplified IEC 60617 symbols matching the original Gemini Studio implementation
// These use basic geometric shapes for clarity at all zoom levels

export const createIECSymbol = (type: EquipmentType, scale: number = 1): Group => {
  const size = 30 * scale; // Base size in pixels (matching original)
  
  switch (type) {
    case "rmu":
      return createRMU(size);
    
    case "miniature-substation":
      return createSubstation(size);
    
    case "main-board":
    case "sub-board":
    case "distribution-board":
      return createDistributionBoard(size, type);
    
    case "generator":
      return createGenerator(size);
    
    case "inverter":
      return createInverter(size);
    
    case "dc-combiner-box":
      return createDCCombiner(size);
    
    case "ac-disconnect":
      return createACDisconnect(size);
    
    case "16a-socket":
    case "double-socket":
      return createSocket(size, type === "double-socket");
    
    case "three-phase-outlet":
      return createThreePhaseSocket(size);
    
    case "light-switch":
    case "two-way-switch":
      return createSwitch(size, type === "two-way-switch");
    
    case "ceiling-light":
    case "wall-light":
      return createLight(size, type);
    
    case "recessed-600x600":
    case "recessed-1200x600":
      return createRecessedLight(size, type);
    
    case "pole-light":
      return createPoleLight(size);
    
    case "cctv":
      return createCCTV(size);
    
    case "data-outlet":
      return createDataOutlet(size);
    
    case "manhole":
      return createManhole(size);
    
    default:
      return createGenericSymbol(size);
  }
};

// RMU - Ring Main Unit (simplified box with terminals)
const createRMU = (size: number): Group => {
  const rect = new Rect({
    width: size,
    height: size / 2,
    left: -size / 2,
    top: -size / 4,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const line = new Line([-size / 2, -size / 12, size / 2, -size / 12], {
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  return new Group([rect, line], {
    selectable: true,
  });
};

// Distribution Board (simplified square with cross)
const createDistributionBoard = (size: number, type: EquipmentType): Group => {
  const rect = new Rect({
    width: size,
    height: size,
    left: -size / 2,
    top: -size / 2,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const line1 = new Line([-size / 2, -size / 2, size / 2, size / 2], {
    stroke: "#000000",
    strokeWidth: 1.5,
  });
  
  const line2 = new Line([size / 2, -size / 2, -size / 2, size / 2], {
    stroke: "#000000",
    strokeWidth: 1.5,
  });
  
  return new Group([rect, line1, line2], {
    selectable: true,
  });
};


// Miniature Substation (simplified building symbol)
const createSubstation = (size: number): Group => {
  const rect = new Rect({
    width: size * 1.5,
    height: size,
    left: -size * 0.75,
    top: -size / 2,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 3,
  });
  
  const roof = new Polygon([
    { x: -size * 0.75, y: -size / 2 },
    { x: 0, y: -size },
    { x: size * 0.75, y: -size / 2 },
  ], {
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  return new Group([rect, roof], {
    selectable: true,
  });
};

// Generator (circle with G)
const createGenerator = (size: number): Group => {
  const circle = new Circle({
    radius: size / 2,
    left: -size / 2,
    top: -size / 2,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const text = new Text("G", {
    fontSize: size * 0.6,
    left: -size * 0.15,
    top: -size * 0.25,
    fill: "#000000",
    fontFamily: "Arial",
    fontWeight: "bold",
  });
  
  return new Group([circle, text], {
    selectable: true,
  });
};

// Inverter (box with DC/AC symbols)
const createInverter = (size: number): Group => {
  const rect = new Rect({
    width: size,
    height: size / 1.5,
    left: -size / 2,
    top: -size / 3,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const dcLine = new Line([-size / 4, 0, -size / 4, 0], {
    stroke: "#EA580C",
    strokeWidth: 3,
  });
  
  const acLine = new Path("M 0,0 Q 3,-5 6,0", {
    stroke: "#2563EB",
    strokeWidth: 2,
    left: size / 6,
    scaleX: 1.5,
  });
  
  return new Group([rect, dcLine, acLine], {
    selectable: true,
  });
};

// DC Combiner Box
const createDCCombiner = (size: number): Group => {
  const rect = new Rect({
    width: size * 0.8,
    height: size * 0.8,
    left: -size * 0.4,
    top: -size * 0.4,
    fill: "transparent",
    stroke: "#EA580C",
    strokeWidth: 2,
  });
  
  const plus = new Line([-size / 6, -size / 6, size / 6, size / 6], {
    stroke: "#EA580C",
    strokeWidth: 2,
  });
  
  return new Group([rect, plus], {
    selectable: true,
  });
};

// AC Disconnect
const createACDisconnect = (size: number): Group => {
  const circle = new Circle({
    radius: size / 2.5,
    left: -size / 2.5,
    top: -size / 2.5,
    fill: "transparent",
    stroke: "#2563EB",
    strokeWidth: 2,
  });
  
  const slash = new Line([-size / 4, -size / 4, size / 4, size / 4], {
    stroke: "#2563EB",
    strokeWidth: 2,
  });
  
  return new Group([circle, slash], {
    selectable: true,
  });
};

// Socket (simplified circle)
const createSocket = (size: number, isDouble: boolean): Group => {
  const circle1 = new Circle({
    radius: size / 3,
    left: -size / 3,
    top: -size / 3,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  if (!isDouble) {
    return new Group([circle1], {
      selectable: true,
    });
  }
  
  const circle2 = new Circle({
    radius: size / 3,
    left: size / 6,
    top: -size / 3,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  return new Group([circle1, circle2], {
    selectable: true,
  });
};

// Three Phase Socket (circle with 3P)
const createThreePhaseSocket = (size: number): Group => {
  const circle = new Circle({
    radius: size / 2.5,
    left: -size / 2.5,
    top: -size / 2.5,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const text = new Text("3P", {
    fontSize: size * 0.4,
    left: -size * 0.2,
    top: -size * 0.15,
    fill: "#000000",
    fontFamily: "Arial",
  });
  
  return new Group([circle, text], {
    selectable: true,
  });
};

// Switch (simple S symbol)
const createSwitch = (size: number, isTwoWay: boolean): Group => {
  const rect = new Rect({
    width: size / 2,
    height: size / 2,
    left: -size / 4,
    top: -size / 4,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const text = new Text(isTwoWay ? "2W" : "S", {
    fontSize: size * 0.4,
    left: isTwoWay ? -size * 0.18 : -size * 0.1,
    top: -size * 0.12,
    fill: "#000000",
    fontFamily: "Arial",
  });
  
  return new Group([rect, text], {
    selectable: true,
  });
};

// Light Fixture (simple circle with cross)
const createLight = (size: number, type: EquipmentType): Group => {
  const circle = new Circle({
    radius: size / 3,
    left: -size / 3,
    top: -size / 3,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const cross1 = new Line([-size / 4, 0, size / 4, 0], {
    stroke: "#000000",
    strokeWidth: 1.5,
  });
  
  const cross2 = new Line([0, -size / 4, 0, size / 4], {
    stroke: "#000000",
    strokeWidth: 1.5,
  });
  
  return new Group([circle, cross1, cross2], {
    selectable: true,
  });
};

// Recessed Light (rectangle with diagonals)
const createRecessedLight = (size: number, type: EquipmentType): Group => {
  const isLarge = type === "recessed-1200x600";
  const width = isLarge ? size * 1.5 : size * 0.8;
  const height = isLarge ? size * 0.6 : size * 0.8;
  
  const rect = new Rect({
    width,
    height,
    left: -width / 2,
    top: -height / 2,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const diag1 = new Line([-width / 2, -height / 2, width / 2, height / 2], {
    stroke: "#000000",
    strokeWidth: 1,
  });
  
  const diag2 = new Line([width / 2, -height / 2, -width / 2, height / 2], {
    stroke: "#000000",
    strokeWidth: 1,
  });
  
  return new Group([rect, diag1, diag2], {
    selectable: true,
  });
};

// Pole Light (vertical line with circle on top)
const createPoleLight = (size: number): Group => {
  const pole = new Line([0, -size, 0, size / 2], {
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const luminaire = new Circle({
    radius: size / 4,
    left: -size / 4,
    top: -size - size / 4,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  return new Group([pole, luminaire], {
    selectable: true,
  });
};

// CCTV Camera (triangle with circle)
const createCCTV = (size: number): Group => {
  const triangle = new Polygon([
    { x: -size / 3, y: 0 },
    { x: size / 3, y: -size / 6 },
    { x: size / 3, y: size / 6 },
  ], {
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
  });
  
  const lens = new Circle({
    radius: size / 6,
    left: size / 4,
    top: -size / 6,
    fill: "#000000",
  });
  
  return new Group([triangle, lens], {
    selectable: true,
  });
};

// Data Outlet (square with D)
const createDataOutlet = (size: number): Group => {
  const rect = new Rect({
    width: size / 2,
    height: size / 2,
    left: -size / 4,
    top: -size / 4,
    fill: "transparent",
    stroke: "#2563EB",
    strokeWidth: 2,
  });
  
  const text = new Text("D", {
    fontSize: size * 0.4,
    left: -size * 0.1,
    top: -size * 0.12,
    fill: "#2563EB",
    fontFamily: "Arial",
  });
  
  return new Group([rect, text], {
    selectable: true,
  });
};

// Manhole (double circle with MH)
const createManhole = (size: number): Group => {
  const outerCircle = new Circle({
    radius: size / 2,
    left: -size / 2,
    top: -size / 2,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 3,
  });
  
  const innerCircle = new Circle({
    radius: size / 3,
    left: -size / 3,
    top: -size / 3,
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 1.5,
  });
  
  return new Group([outerCircle, innerCircle], {
    selectable: true,
  });
};

// Generic Symbol (fallback)
const createGenericSymbol = (size: number): Group => {
  const rect = new Rect({
    width: size,
    height: size,
    left: -size / 2,
    top: -size / 2,
    fill: "transparent",
    stroke: "#666666",
    strokeWidth: 2,
    strokeDashArray: [5, 5],
  });
  
  return new Group([rect], {
    selectable: true,
  });
};
