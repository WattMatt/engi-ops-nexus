import { CABLE_SIZING_TABLE, ALUMINIUM_CABLE_TABLE } from '../data/cable-specs';

export interface CablePriceSuggestion {
  rate: number;
  unit: string;
  reason: string;
}

export const AISuggestionService = {
  suggestCablePrice: (description: string, length: number = 1): CablePriceSuggestion | null => {
    // Normalize description
    const desc = description.toLowerCase();
    
    // Determine if aluminium is requested
    const isAluminium = desc.includes('alum') || desc.includes('al.') || desc.includes('aluminium');
    const table = isAluminium ? ALUMINIUM_CABLE_TABLE : CABLE_SIZING_TABLE;
    
    // Find matching size
    const match = table.find(cable => {
      // Create variations of the size string for matching (e.g. "16mm", "16mm²", "16 mm")
      const rawSize = cable.size.replace('mm²', '').trim();
      // Match exactly on variations to avoid partial matches (e.g. 150mm matching 50mm)
      const regex = new RegExp(`\\b${rawSize}\\s*(mm²|mm)?\\b`, 'i');
      return regex.test(desc);
    });

    if (match) {
      // Rate per unit (meter)
      const rate = match.supplyCost + match.installCost;
      const type = isAluminium ? 'Aluminium' : 'Copper';
      
      return {
        rate: rate,
        unit: 'm',
        reason: `Based on ${match.size} ${type} specification (Supply R${match.supplyCost} + Install R${match.installCost})`
      };
    }

    return null;
  }
};
