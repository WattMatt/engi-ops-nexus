import { ToolDefinition, DesignPurpose } from './types';

export const toolDefinitions: ToolDefinition[] = [
  // General tools (available in all modes)
  { id: 'select', name: 'Select', icon: 'MousePointer', category: 'general', purposes: ['Budget mark up', 'Line shop measurements', 'PV design'] },
  { id: 'pan', name: 'Pan', icon: 'Move', category: 'general', purposes: ['Budget mark up', 'Line shop measurements', 'PV design'] },
  { id: 'scale', name: 'Set Scale', icon: 'Ruler', category: 'general', purposes: ['Budget mark up', 'Line shop measurements', 'PV design'] },
  { id: 'text', name: 'Text Annotation', icon: 'Type', category: 'general', purposes: ['Budget mark up', 'Line shop measurements', 'PV design'] },
  
  // Drawing tools
  { id: 'mv-cable', name: 'MV Cable', icon: 'Cable', category: 'drawing', purposes: ['Budget mark up', 'Line shop measurements'] },
  { id: 'lv-cable', name: 'LV/AC Cable', icon: 'Cable', category: 'drawing', purposes: ['Budget mark up', 'Line shop measurements'] },
  { id: 'dc-cable', name: 'DC Cable', icon: 'Cable', category: 'drawing', purposes: ['Budget mark up', 'Line shop measurements'] },
  { id: 'zone', name: 'Zone', icon: 'Pentagon', category: 'drawing', purposes: ['Budget mark up', 'Line shop measurements'] },
  
  // Containment tools
  { id: 'cable-tray', name: 'Cable Tray', icon: 'Box', category: 'containment', purposes: ['Budget mark up', 'Line shop measurements'] },
  { id: 'wire-basket', name: 'Wire Basket', icon: 'Grid3x3', category: 'containment', purposes: ['Budget mark up', 'Line shop measurements'] },
  { id: 'trunking', name: 'Trunking', icon: 'Box', category: 'containment', purposes: ['Budget mark up', 'Line shop measurements'] },
  
  // PV Design tools
  { id: 'pv-config', name: 'Panel Config', icon: 'Settings', category: 'pv', purposes: ['PV design'] },
  { id: 'roof-mask', name: 'Draw Roof Mask', icon: 'Pentagon', category: 'pv', purposes: ['PV design'] },
  { id: 'roof-direction', name: 'Set Roof Direction', icon: 'Navigation', category: 'pv', purposes: ['PV design'] },
  { id: 'place-array', name: 'Place Array', icon: 'Grid3x3', category: 'pv', purposes: ['PV design'] },
];

export function getToolsForPurpose(purpose: DesignPurpose, category?: string): ToolDefinition[] {
  let tools = toolDefinitions.filter(tool => tool.purposes.includes(purpose));
  
  if (category) {
    tools = tools.filter(tool => tool.category === category);
  }
  
  return tools;
}

export function getToolCategories(purpose: DesignPurpose): string[] {
  const tools = getToolsForPurpose(purpose);
  const categories = new Set(tools.map(t => t.category));
  return Array.from(categories);
}
