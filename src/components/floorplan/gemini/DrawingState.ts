import { EquipmentItem, SupplyLine, Zone, Containment, RoofMask, PVArray, Point, HistoryAction, ScaleCalibration } from './types';

export class DrawingState {
  equipment: EquipmentItem[] = [];
  lines: SupplyLine[] = [];
  zones: Zone[] = [];
  containment: Containment[] = [];
  roofMasks: RoofMask[] = [];
  pvArrays: PVArray[] = [];
  
  undoStack: HistoryAction[] = [];
  redoStack: HistoryAction[] = [];
  maxStackSize = 50;

  scale: ScaleCalibration = {
    point1: null,
    point2: null,
    realMeters: 0,
    metersPerPixel: 0,
    isSet: false,
  };

  // Drawing state
  currentPoints: Point[] = [];
  selectedId: string | null = null;
  selectedType: string | null = null;

  addEquipment(item: EquipmentItem) {
    this.equipment.push(item);
    this.pushHistory({ type: 'add', target: 'equipment', id: item.id, data: item });
  }

  addLine(line: SupplyLine) {
    this.lines.push(line);
    this.pushHistory({ type: 'add', target: 'line', id: line.id, data: line });
  }

  addZone(zone: Zone) {
    this.zones.push(zone);
    this.pushHistory({ type: 'add', target: 'zone', id: zone.id, data: zone });
  }

  addContainment(cont: Containment) {
    this.containment.push(cont);
    this.pushHistory({ type: 'add', target: 'containment', id: cont.id, data: cont });
  }

  addRoofMask(mask: RoofMask) {
    this.roofMasks.push(mask);
    this.pushHistory({ type: 'add', target: 'roof-mask', id: mask.id, data: mask });
  }

  addPVArray(array: PVArray) {
    this.pvArrays.push(array);
    this.pushHistory({ type: 'add', target: 'pv-array', id: array.id, data: array });
  }

  deleteSelected() {
    if (!this.selectedId || !this.selectedType) return;

    let deleted: any = null;
    
    switch (this.selectedType) {
      case 'equipment':
        deleted = this.equipment.find(e => e.id === this.selectedId);
        this.equipment = this.equipment.filter(e => e.id !== this.selectedId);
        break;
      case 'line':
        deleted = this.lines.find(l => l.id === this.selectedId);
        this.lines = this.lines.filter(l => l.id !== this.selectedId);
        break;
      case 'zone':
        deleted = this.zones.find(z => z.id === this.selectedId);
        this.zones = this.zones.filter(z => z.id !== this.selectedId);
        break;
      case 'containment':
        deleted = this.containment.find(c => c.id === this.selectedId);
        this.containment = this.containment.filter(c => c.id !== this.selectedId);
        break;
      case 'roof-mask':
        deleted = this.roofMasks.find(r => r.id === this.selectedId);
        this.roofMasks = this.roofMasks.filter(r => r.id !== this.selectedId);
        break;
      case 'pv-array':
        deleted = this.pvArrays.find(p => p.id === this.selectedId);
        this.pvArrays = this.pvArrays.filter(p => p.id !== this.selectedId);
        break;
    }

    if (deleted) {
      this.pushHistory({ 
        type: 'delete', 
        target: this.selectedType as any, 
        id: this.selectedId, 
        data: deleted 
      });
    }

    this.selectedId = null;
    this.selectedType = null;
  }

  undo() {
    const action = this.undoStack.pop();
    if (!action) return;

    this.redoStack.push(action);
    this.applyHistoryAction(action, true);
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) return;

    this.undoStack.push(action);
    this.applyHistoryAction(action, false);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private pushHistory(action: HistoryAction) {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private applyHistoryAction(action: HistoryAction, reverse: boolean) {
    const isAdd = reverse ? action.type === 'add' : action.type === 'delete';
    const isDelete = reverse ? action.type === 'delete' : action.type === 'add';

    if (isDelete) {
      switch (action.target) {
        case 'equipment':
          this.equipment = this.equipment.filter(e => e.id !== action.id);
          break;
        case 'line':
          this.lines = this.lines.filter(l => l.id !== action.id);
          break;
        case 'zone':
          this.zones = this.zones.filter(z => z.id !== action.id);
          break;
        case 'containment':
          this.containment = this.containment.filter(c => c.id !== action.id);
          break;
        case 'roof-mask':
          this.roofMasks = this.roofMasks.filter(r => r.id !== action.id);
          break;
        case 'pv-array':
          this.pvArrays = this.pvArrays.filter(p => p.id !== action.id);
          break;
      }
    } else if (isAdd) {
      switch (action.target) {
        case 'equipment':
          this.equipment.push(action.data);
          break;
        case 'line':
          this.lines.push(action.data);
          break;
        case 'zone':
          this.zones.push(action.data);
          break;
        case 'containment':
          this.containment.push(action.data);
          break;
        case 'roof-mask':
          this.roofMasks.push(action.data);
          break;
        case 'pv-array':
          this.pvArrays.push(action.data);
          break;
      }
    }
  }

  setScale(point1: Point, point2: Point, realMeters: number) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const pixels = Math.sqrt(dx * dx + dy * dy);
    const metersPerPixel = realMeters / pixels;

    this.scale = {
      point1,
      point2,
      realMeters,
      metersPerPixel,
      isSet: true,
    };
  }

  calculateDistance(p1: Point, p2: Point): number {
    if (!this.scale.isSet) return 0;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const pixels = Math.sqrt(dx * dx + dy * dy);
    return pixels * this.scale.metersPerPixel;
  }

  calculateArea(points: Point[]): number {
    if (!this.scale.isSet || points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area / 2);
    
    // Convert to square meters
    return area * this.scale.metersPerPixel * this.scale.metersPerPixel;
  }

  clear() {
    this.equipment = [];
    this.lines = [];
    this.zones = [];
    this.containment = [];
    this.roofMasks = [];
    this.pvArrays = [];
    this.undoStack = [];
    this.redoStack = [];
    this.currentPoints = [];
    this.selectedId = null;
    this.selectedType = null;
  }
}
