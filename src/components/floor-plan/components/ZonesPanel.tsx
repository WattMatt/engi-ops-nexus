import React, { useMemo } from 'react';
import { MapPin, Trash2, Eye } from 'lucide-react';
import { SupplyZone, Task, TaskStatus } from '../types';
import { PlusCircle } from 'lucide-react';

interface ZonesPanelProps {
  zones: SupplyZone[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  onUpdateZone: (zone: SupplyZone) => void;
  onDeleteZone: () => void;
  onJumpToZone: (zone: SupplyZone) => void;
  tasks: Task[];
  onOpenTaskModal: (task: Partial<Task> | null) => void;
}

const ItemTasks: React.FC<{
  itemId: string;
  tasks: Task[];
  onOpenTaskModal: (task: Partial<Task> | null) => void;
}> = ({ itemId, tasks, onOpenTaskModal }) => {
  const itemTasks = useMemo(() => tasks.filter(t => t.linkedItemId === itemId), [tasks, itemId]);
  
  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-foreground">Tasks ({itemTasks.length})</h4>
        <button 
          onClick={() => onOpenTaskModal({ linkedItemId: itemId, status: TaskStatus.TODO })}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <PlusCircle size={14} /> Add Task
        </button>
      </div>
      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
        {itemTasks.length > 0 ? itemTasks.map(task => (
          <button 
            key={task.id} 
            onClick={() => onOpenTaskModal(task)} 
            className="w-full text-left bg-muted p-2 rounded-md text-xs hover:bg-accent transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground truncate">{task.title}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                task.status === TaskStatus.DONE ? 'bg-green-500/20 text-green-400' :
                task.status === TaskStatus.IN_PROGRESS ? 'bg-amber-500/20 text-amber-400' :
                'bg-muted-foreground/20 text-muted-foreground'
              }`}>
                {task.status}
              </span>
            </div>
          </button>
        )) : (
          <p className="text-muted-foreground text-xs text-center py-2">No tasks for this zone.</p>
        )}
      </div>
    </div>
  );
};

const ZoneDetails: React.FC<{
  zone: SupplyZone;
  onUpdate: (zone: SupplyZone) => void;
  onDelete: () => void;
  onJumpTo: () => void;
  tasks: Task[];
  onOpenTaskModal: (task: Partial<Task> | null) => void;
}> = ({ zone, onUpdate, onDelete, onJumpTo, tasks, onOpenTaskModal }) => {
  return (
    <div className="mb-6 p-3 bg-muted rounded-lg border border-border">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Zone Details
      </h3>
      
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="h-5 w-5 rounded flex-shrink-0 border border-border" 
          style={{ backgroundColor: zone.color }}
        />
        <span className="text-foreground font-bold">{zone.name}</span>
      </div>

      <div className="mb-3">
        <label htmlFor="zoneName" className="block text-sm font-medium text-foreground mb-1">
          Zone Name
        </label>
        <input
          type="text"
          id="zoneName"
          value={zone.name}
          onChange={(e) => onUpdate({ ...zone, name: e.target.value })}
          className="w-full px-3 py-1.5 bg-background border border-input rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
          placeholder="e.g., Roof Area 1"
        />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Area:</span>
          <span className="font-semibold text-foreground">{zone.area.toFixed(2)} m²</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Points:</span>
          <span className="font-semibold text-foreground">{zone.points.length}</span>
        </div>
      </div>

      <button
        onClick={onJumpTo}
        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm font-semibold transition-colors"
      >
        <Eye size={16} />
        Jump to Zone
      </button>

      <ItemTasks itemId={zone.id} tasks={tasks} onOpenTaskModal={onOpenTaskModal} />

      <div className="mt-4">
        <button 
          onClick={onDelete} 
          className="w-full text-center px-4 py-2 bg-destructive/20 text-destructive hover:bg-destructive/40 rounded-md text-sm font-semibold transition-colors"
        >
          <Trash2 size={16} className="inline mr-2" />
          Delete Zone
        </button>
      </div>
    </div>
  );
};

const ZonesPanel: React.FC<ZonesPanelProps> = ({ 
  zones, 
  selectedZoneId, 
  onSelectZone, 
  onUpdateZone, 
  onDeleteZone, 
  onJumpToZone,
  tasks,
  onOpenTaskModal
}) => {
  const selectedZone = useMemo(
    () => zones.find(z => z.id === selectedZoneId),
    [zones, selectedZoneId]
  );

  const totalArea = useMemo(
    () => zones.reduce((sum, zone) => sum + zone.area, 0),
    [zones]
  );

  return (
    <div className="h-full flex flex-col">
      {selectedZone && (
        <ZoneDetails
          zone={selectedZone}
          onUpdate={onUpdateZone}
          onDelete={onDeleteZone}
          onJumpTo={() => onJumpToZone(selectedZone)}
          tasks={tasks}
          onOpenTaskModal={onOpenTaskModal}
        />
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold text-foreground">All Zones ({zones.length})</h3>
          <div className="text-xs text-muted-foreground">
            Total: {totalArea.toFixed(2)} m²
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {zones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No zones drawn yet</p>
              <p className="text-xs mt-1">Use the Zone tool to draw zones</p>
            </div>
          ) : (
            zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => onSelectZone(zone.id)}
                onDoubleClick={() => onJumpToZone(zone)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedZoneId === zone.id
                    ? 'bg-accent border-primary shadow-sm'
                    : 'bg-card border-border hover:bg-accent/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="h-4 w-4 rounded mt-0.5 flex-shrink-0 border border-border" 
                    style={{ backgroundColor: zone.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm mb-1 truncate">
                      {zone.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {zone.area.toFixed(2)} m² • {zone.points.length} points
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToZone(zone);
                    }}
                    className="text-primary hover:text-primary/80 transition-colors p-1"
                    title="Jump to zone"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ZonesPanel;