/**
 * Drawing History Manager
 * Handles undo/redo stack for all drawing operations
 */

export interface HistoryAction {
  type: 'add' | 'delete' | 'modify' | 'move';
  target: 'equipment' | 'cable' | 'zone' | 'containment';
  id: string;
  data: any;
  previousData?: any;
}

export class DrawingHistory {
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private maxStackSize = 50;

  push(action: HistoryAction) {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    // Clear redo stack when new action is performed
    this.redoStack = [];
  }

  undo(): HistoryAction | null {
    const action = this.undoStack.pop();
    if (action) {
      this.redoStack.push(action);
    }
    return action || null;
  }

  redo(): HistoryAction | null {
    const action = this.redoStack.pop();
    if (action) {
      this.undoStack.push(action);
    }
    return action || null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoStack(): HistoryAction[] {
    return [...this.undoStack];
  }

  getRedoStack(): HistoryAction[] {
    return [...this.redoStack];
  }
}
