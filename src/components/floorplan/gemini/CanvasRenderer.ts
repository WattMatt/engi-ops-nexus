import { Point, EquipmentItem, SupplyLine, Zone, Containment, RoofMask, PVArray, ScaleCalibration } from './types';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private pdfImage: HTMLImageElement | null = null;
  private pdfScale: number = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  setPDFImage(image: HTMLImageElement, scale: number) {
    this.pdfImage = image;
    this.pdfScale = scale;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(
    equipment: EquipmentItem[],
    lines: SupplyLine[],
    zones: Zone[],
    containment: Containment[],
    roofMasks: RoofMask[],
    pvArrays: PVArray[],
    scale: ScaleCalibration,
    zoom: number,
    offset: Point
  ) {
    this.clear();
    
    this.ctx.save();
    this.ctx.translate(offset.x, offset.y);
    this.ctx.scale(zoom, zoom);

    // Draw PDF background
    if (this.pdfImage) {
      this.ctx.drawImage(
        this.pdfImage,
        20,
        20,
        this.pdfImage.width * this.pdfScale,
        this.pdfImage.height * this.pdfScale
      );
    }

    // Draw zones
    zones.forEach(zone => this.drawZone(zone));

    // Draw roof masks
    roofMasks.forEach(mask => this.drawRoofMask(mask));

    // Draw containment
    containment.forEach(cont => this.drawContainment(cont));

    // Draw supply lines
    lines.forEach(line => this.drawLine(line));

    // Draw equipment
    equipment.forEach(eq => this.drawEquipment(eq));

    // Draw PV arrays
    pvArrays.forEach(arr => this.drawPVArray(arr, scale));

    // Draw scale indicator
    if (scale.isSet && scale.point1 && scale.point2) {
      this.drawScaleIndicator(scale);
    }

    this.ctx.restore();
  }

  private drawZone(zone: Zone) {
    if (zone.points.length < 3) return;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(zone.points[0].x, zone.points[0].y);
    zone.points.forEach((p, i) => {
      if (i > 0) this.ctx.lineTo(p.x, p.y);
    });
    this.ctx.closePath();

    // Fill
    this.ctx.fillStyle = zone.color || this.getZoneColor(zone.type);
    this.ctx.globalAlpha = 0.3;
    this.ctx.fill();

    // Stroke
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = this.getZoneStrokeColor(zone.type);
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Label
    const centroid = this.calculateCentroid(zone.points);
    this.ctx.fillStyle = this.getZoneStrokeColor(zone.type);
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const label = `${zone.name}\n${zone.areaSqm?.toFixed(2) || '0'} m²`;
    this.ctx.fillText(label, centroid.x, centroid.y);

    this.ctx.restore();
  }

  private drawRoofMask(mask: RoofMask) {
    if (mask.points.length < 3) return;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(mask.points[0].x, mask.points[0].y);
    mask.points.forEach((p, i) => {
      if (i > 0) this.ctx.lineTo(p.x, p.y);
    });
    this.ctx.closePath();

    // Fill with pattern
    this.ctx.fillStyle = 'rgba(255, 165, 0, 0.2)';
    this.ctx.fill();

    // Stroke
    this.ctx.strokeStyle = '#ff9800';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Label with direction arrow
    const centroid = this.calculateCentroid(mask.points);
    this.ctx.fillStyle = '#ff9800';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    const label = `${mask.name}\nPitch: ${mask.pitch || 0}° | Dir: ${mask.direction || 0}°`;
    this.ctx.fillText(label, centroid.x, centroid.y);

    this.ctx.restore();
  }

  private drawLine(line: SupplyLine) {
    if (line.points.length < 2) return;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(line.points[0].x, line.points[0].y);
    line.points.forEach((p, i) => {
      if (i > 0) this.ctx.lineTo(p.x, p.y);
    });

    const color = line.color || this.getLineColor(line.type);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.getLineWidth(line.type);
    this.ctx.stroke();

    // Draw label at midpoint
    if (line.label || line.cableSize) {
      const mid = this.getMidpoint(line.points);
      this.ctx.fillStyle = color;
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      const label = line.label || `${line.cableSize || ''}`;
      this.ctx.fillText(label, mid.x, mid.y - 5);
    }

    this.ctx.restore();
  }

  private drawContainment(cont: Containment) {
    if (cont.points.length < 2) return;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(cont.points[0].x, cont.points[0].y);
    cont.points.forEach((p, i) => {
      if (i > 0) this.ctx.lineTo(p.x, p.y);
    });

    this.ctx.strokeStyle = this.getContainmentColor(cont.type);
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.restore();
  }

  private drawEquipment(eq: EquipmentItem) {
    this.ctx.save();
    this.ctx.translate(eq.x, eq.y);
    this.ctx.rotate((eq.rotation * Math.PI) / 180);

    // Draw symbol based on type
    this.ctx.fillStyle = '#2563eb';
    this.ctx.strokeStyle = '#1e40af';
    this.ctx.lineWidth = 2;

    // Simple circle for now (will be replaced with IEC symbols)
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Label
    this.ctx.fillStyle = '#000';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.getEquipmentLabel(eq.type), 0, 20);

    this.ctx.restore();
  }

  private drawPVArray(arr: PVArray, scale: ScaleCalibration) {
    if (!scale.isSet) return;

    this.ctx.save();
    this.ctx.translate(arr.x, arr.y);
    this.ctx.rotate((arr.rotation * Math.PI) / 180);

    // Draw grid of panels
    const panelWidth = arr.orientation === 'portrait' ? 1 : 2; // meters
    const panelHeight = arr.orientation === 'portrait' ? 2 : 1;
    const pixelWidth = panelWidth / scale.metersPerPixel;
    const pixelHeight = panelHeight / scale.metersPerPixel;

    for (let row = 0; row < arr.rows; row++) {
      for (let col = 0; col < arr.columns; col++) {
        const x = col * pixelWidth;
        const y = row * pixelHeight;
        
        this.ctx.fillStyle = 'rgba(30, 64, 175, 0.3)';
        this.ctx.strokeStyle = '#1e40af';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(x, y, pixelWidth, pixelHeight);
        this.ctx.strokeRect(x, y, pixelWidth, pixelHeight);
      }
    }

    this.ctx.restore();
  }

  private drawScaleIndicator(scale: ScaleCalibration) {
    if (!scale.point1 || !scale.point2) return;

    this.ctx.save();
    this.ctx.strokeStyle = '#22c55e';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    
    this.ctx.beginPath();
    this.ctx.moveTo(scale.point1.x, scale.point1.y);
    this.ctx.lineTo(scale.point2.x, scale.point2.y);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }

  private getZoneColor(type: string): string {
    switch (type) {
      case 'supply': return 'rgba(34, 197, 94, 0.3)';
      case 'exclusion': return 'rgba(239, 68, 68, 0.3)';
      case 'roof': return 'rgba(59, 130, 246, 0.3)';
      default: return 'rgba(156, 163, 175, 0.3)';
    }
  }

  private getZoneStrokeColor(type: string): string {
    switch (type) {
      case 'supply': return '#22c55e';
      case 'exclusion': return '#ef4444';
      case 'roof': return '#3b82f6';
      default: return '#9ca3af';
    }
  }

  private getLineColor(type: string): string {
    switch (type) {
      case 'mv': return '#ef4444';
      case 'lv': return '#3b82f6';
      case 'dc': return '#22c55e';
      case 'ac': return '#f59e0b';
      default: return '#6b7280';
    }
  }

  private getLineWidth(type: string): number {
    switch (type) {
      case 'mv': return 4;
      case 'lv': return 3;
      case 'dc': return 3;
      case 'ac': return 3;
      default: return 2;
    }
  }

  private getContainmentColor(type: string): string {
    return '#8b5cf6';
  }

  private getEquipmentLabel(type: string): string {
    return type.split('-').map(w => w[0].toUpperCase()).join('');
  }

  private calculateCentroid(points: Point[]): Point {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  private getMidpoint(points: Point[]): Point {
    const mid = Math.floor(points.length / 2);
    return points[mid];
  }
}
