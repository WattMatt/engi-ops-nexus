import { describe, it, expect } from 'vitest';
import { calculateCableSize, CableCalculationParams } from './cableSizing';
import { COPPER_CABLE_TABLE } from '../data/cable-specs';

describe('Cable Sizing Logic', () => {
  it('should return null for invalid inputs', () => {
    const result = calculateCableSize({
      loadAmps: 0,
      voltage: 400,
      totalLength: 50,
    });
    expect(result).toBeNull();
  });

  it('should correctly size a simple copper cable (Air)', () => {
    // 20A load, 230V, short distance
    const params: CableCalculationParams = {
      loadAmps: 20,
      voltage: 230,
      totalLength: 10,
      installationMethod: 'air',
      material: 'copper',
    };
    const result = calculateCableSize(params);
    
    expect(result).not.toBeNull();
    // 2.5mm² handles 26A in air (from table), 1.5mm² handles 19A (too small)
    expect(result?.recommendedSize).toBe('2.5mm²');
    expect(result?.cablesInParallel).toBe(1);
  });

  it('should handle voltage drop constraint (Long Cable)', () => {
    // 40A load, 400V, long distance (100m)
    // 6mm² handles 45A in air (capacity OK), but voltage drop might be high
    const params: CableCalculationParams = {
      loadAmps: 40,
      voltage: 400,
      totalLength: 100,
      installationMethod: 'air',
      material: 'copper',
    };
    const result = calculateCableSize(params);
    
    expect(result).not.toBeNull();
    // 6mm² VD = (6.391 * 40 * 100) / 1000 = 25.56V
    // % = (25.56 / 400) * 100 = 6.39% > 5% limit -> Should upsize
    // 10mm² VD = (3.793 * 40 * 100) / 1000 = 15.17V
    // % = (15.17 / 400) * 100 = 3.79% < 5% -> OK
    expect(result?.recommendedSize).toBe('10mm²'); 
  });

  it('should suggest parallel cables for high loads', () => {
    // 600A load (exceeds max single cable 400A limit in params)
    const params: CableCalculationParams = {
      loadAmps: 600,
      voltage: 400,
      totalLength: 50,
      installationMethod: 'air',
      material: 'copper',
      maxAmpsPerCable: 400, 
    };
    const result = calculateCableSize(params);
    
    expect(result).not.toBeNull();
    expect(result?.cablesInParallel).toBeGreaterThan(1);
    // Likely 2x 300mm² or similar
  });

  it('should apply derating factors correctly', () => {
    // 30A load, but 0.5 derating (requires cable for 60A)
    const params: CableCalculationParams = {
      loadAmps: 30,
      voltage: 230,
      totalLength: 10,
      deratingFactor: 0.5,
      installationMethod: 'air',
      material: 'copper',
    };
    const result = calculateCableSize(params);
    
    expect(result).not.toBeNull();
    // Needs capacity for 60A
    // 10mm² handles 62A in air
    expect(result?.recommendedSize).toBe('10mm²');
  });

  it('should validate 16mm² copper cable data against SANS', () => {
    const cable = COPPER_CABLE_TABLE.find(c => c.size === '16mm²');
    expect(cable).toBeDefined();
    // SANS 10142-1 (Table 6.2 approx check)
    expect(cable?.currentRatingAir).toBe(83); 
    expect(cable?.impedance).toBe(1.38);
  });
});
