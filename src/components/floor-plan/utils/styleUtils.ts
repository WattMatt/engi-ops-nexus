/**
 * Get color for a zone based on its index
 */
export function getZoneColor(index: number): string {
  const colors = [
    'rgba(255, 107, 107, 0.3)',
    'rgba(78, 205, 196, 0.3)',
    'rgba(149, 225, 211, 0.3)',
    'rgba(255, 195, 113, 0.3)',
    'rgba(196, 229, 56, 0.3)',
  ];
  return colors[index % colors.length];
}

/**
 * Get color for a cable based on its type
 */
export function getCableColor(cableType: string): string {
  const lowerType = cableType.toLowerCase();
  if (lowerType.includes('hv') || lowerType.includes('high')) return '#4ECDC4';
  if (lowerType.includes('data')) return '#95E1D3';
  if (lowerType.includes('fire') || lowerType.includes('alarm')) return '#F38181';
  return '#FF6B6B'; // default LV color
}

/**
 * Get style for containment based on type and size
 */
export function getContainmentStyle(type: string, size?: string): { color: string; dash: number[] } {
  const colorMap: Record<string, string> = {
    tray: '#9B59B6',
    trunking: '#3498DB',
    conduit: '#E67E22',
  };
  
  return {
    color: colorMap[type] || '#999999',
    dash: type === 'conduit' ? [5, 5] : [],
  };
}