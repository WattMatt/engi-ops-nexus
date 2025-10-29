
import React, { useState, useMemo } from 'react';
import { Layers, LayoutGrid, PlusCircle, CheckCircle, Clock, Circle, ChevronDown } from 'lucide-react';
import { EquipmentItem, SupplyLine, SupplyZone, Containment, EquipmentType, DesignPurpose, PVPanelConfig, PVArrayItem, Task, TaskStatus } from '../types';
import { PurposeConfig } from '../purpose.config';
import { EquipmentIcon } from './EquipmentIcon';
import { getCableColor, getContainmentStyle, calculateLvCableSummary } from '../utils/styleUtils';

interface EquipmentPanelProps {
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: SupplyZone[];
  containment: Containment[];
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  onEquipmentUpdate: (item: EquipmentItem) => void;
  onZoneUpdate: (item: SupplyZone) => void;
  onDeleteItem: () => void;
  purposeConfig: PurposeConfig;
  designPurpose: DesignPurpose;
  // PV Props
  pvPanelConfig: PVPanelConfig | null;
  pvArrays: PVArrayItem[];
  // Task Props
  tasks: Task[];
  onOpenTaskModal: (task: Partial<Task> | null) => void;
}

type EquipmentPanelTab = 'summary' | 'equipment' | 'cables' | 'containment' | 'zones' | 'tasks';


const ItemTasks: React.FC<{
    itemId: string;
    tasks: Task[];
    onOpenTaskModal: (task: Partial<Task> | null) => void;
}> = ({ itemId, tasks, onOpenTaskModal }) => {
    const itemTasks = useMemo(() => tasks.filter(t => t.linkedItemId === itemId), [tasks, itemId]);
    
    return (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-gray-300">Tasks ({itemTasks.length})</h4>
                <button 
                    onClick={() => onOpenTaskModal({ linkedItemId: itemId, status: TaskStatus.TODO })}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                    <PlusCircle size={14} /> Add Task
                </button>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {itemTasks.length > 0 ? itemTasks.map(task => (
                    <button key={task.id} onClick={() => onOpenTaskModal(task)} className="w-full text-left bg-gray-700/50 p-2 rounded-md text-xs hover:bg-gray-700 transition-colors">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-200 truncate">{task.title}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                task.status === TaskStatus.DONE ? 'bg-green-500/20 text-green-400' :
                                task.status === TaskStatus.IN_PROGRESS ? 'bg-amber-500/20 text-amber-400' :
                                'bg-gray-600 text-gray-300'
                            }`}>{task.status}</span>
                        </div>
                    </button>
                )) : (
                    <p className="text-gray-500 text-xs text-center py-2">No tasks for this item.</p>
                )}
            </div>
        </div>
    );
};


const SelectionDetails: React.FC<{
    item: EquipmentItem;
    onUpdate: (item: EquipmentItem) => void;
    onDelete: () => void;
    tasks: Task[];
    onOpenTaskModal: (task: Partial<Task> | null) => void;
}> = ({ item, onUpdate, onDelete, tasks, onOpenTaskModal }) => {
    return (
        <div className="mb-6 p-3 bg-gray-900 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Selection Details</h3>
            <div className='flex items-center gap-3 mb-3'>
                <EquipmentIcon type={item.type} className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <span className="text-gray-300 font-bold">{item.type}</span>
            </div>
            <div>
                <label htmlFor="equipmentName" className="block text-sm font-medium text-gray-300 mb-1">
                    Equipment Name
                </label>
                <input
                    type="text"
                    id="equipmentName"
                    value={item.name || ''}
                    onChange={(e) => onUpdate({ ...item, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    placeholder="e.g., DB-GF-01"
                />
            </div>
            <ItemTasks itemId={item.id} tasks={tasks} onOpenTaskModal={onOpenTaskModal} />
            <div className="mt-4">
                <button onClick={onDelete} className="w-full text-center px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md text-sm font-semibold transition-colors">
                    Delete Item
                </button>
            </div>
        </div>
    )
}

const ZoneDetails: React.FC<{
    item: SupplyZone;
    onUpdate: (item: SupplyZone) => void;
    onDelete: () => void;
    tasks: Task[];
    onOpenTaskModal: (task: Partial<Task> | null) => void;
}> = ({ item, onUpdate, onDelete, tasks, onOpenTaskModal }) => {
    return (
        <div className="mb-6 p-3 bg-gray-900 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Selection Details</h3>
            <div className='flex items-center gap-3 mb-3'>
                <Layers className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <span className="text-gray-300 font-bold">Supply Zone</span>
            </div>
            <div>
                <label htmlFor="zoneName" className="block text-sm font-medium text-gray-300 mb-1">
                    Zone Name
                </label>
                <input
                    type="text"
                    id="zoneName"
                    value={item.name || ''}
                    onChange={(e) => onUpdate({ ...item, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    placeholder="e.g., Office Area"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                />
            </div>
            <ItemTasks itemId={item.id} tasks={tasks} onOpenTaskModal={onOpenTaskModal} />
            <div className="mt-4">
                <button onClick={onDelete} className="w-full text-center px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md text-sm font-semibold transition-colors">
                    Delete Zone
                </button>
            </div>
        </div>
    )
}

const PvArrayDetails: React.FC<{
    item: PVArrayItem;
    pvPanelConfig: PVPanelConfig | null;
    onDelete: () => void;
}> = ({ item, pvPanelConfig, onDelete }) => {
    const totalPanels = item.rows * item.columns;
    const totalWattage = pvPanelConfig ? totalPanels * pvPanelConfig.wattage : 0;
    return (
        <div className="mb-6 p-3 bg-gray-900 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Selection Details</h3>
            <div className='flex items-center gap-3 mb-3'>
                <LayoutGrid className="h-5 w-5 text-sky-400 flex-shrink-0" />
                <span className="text-gray-300 font-bold">PV Array</span>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
                <div className="flex justify-between"><span>Layout:</span> <span className='font-mono'>{item.rows} rows &times; {item.columns} cols</span></div>
                <div className="flex justify-between"><span>Orientation:</span> <span className='font-mono capitalize'>{item.orientation}</span></div>
                <div className="flex justify-between"><span>Total Panels:</span> <span className='font-mono'>{totalPanels}</span></div>
                {pvPanelConfig && <div className="flex justify-between"><span>Total Power:</span> <span className='font-mono'>{(totalWattage/1000).toFixed(2)} kWp</span></div>}
            </div>
             <div className="mt-4">
                <button onClick={onDelete} className="w-full text-center px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md text-sm font-semibold transition-colors">
                    Delete Array
                </button>
            </div>
        </div>
    );
};

const DetailedCableSchedule: React.FC<{ lines: SupplyLine[] }> = ({ lines }) => {
    const lvLines = useMemo(() => lines.filter(l => l.type === 'lv'), [lines]);

    if (lvLines.length === 0) {
        return <p className="text-gray-500 text-xs p-4 text-center">No LV/AC cables drawn.</p>;
    }
    
    return (
        <div className="space-y-2 text-sm max-h-[60vh] overflow-y-auto pr-2">
            {lvLines.map(line => {
                const isGpWire = line.cableType?.includes('GP');
                const pathLen = line.pathLength ?? line.length;
                const startH = line.startHeight ?? 0;
                const endH = line.endHeight ?? 0;

                const calculatedLength = isGpWire ? (pathLen * 3) + startH + endH : line.length;
                let lengthBreakdown = '';

                if (line.pathLength !== undefined) {
                    if (isGpWire) {
                        lengthBreakdown = `(${(pathLen).toFixed(2)}m×3 + ${startH}m + ${endH}m)`;
                    } else {
                        lengthBreakdown = `(${(pathLen).toFixed(2)}m + ${startH}m + ${endH}m)`;
                    }
                } else if (isGpWire) {
                    lengthBreakdown = `(${line.length.toFixed(2)}m×3)`;
                }

                return (
                    <div key={line.id} className="bg-gray-700/50 p-2 rounded-md text-xs">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{backgroundColor: line.cableType ? getCableColor(line.cableType) : 'gray'}}></div>
                                <span className="font-bold text-gray-200">{line.cableType || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {line.terminationCount && line.terminationCount > 0 && <span className="font-mono text-amber-400">{line.terminationCount}x Term.</span>}
                              <span className="font-mono text-gray-300">
                                  {calculatedLength.toFixed(2)}m
                                  {lengthBreakdown && <span className="text-gray-500 text-[10px] ml-1">{lengthBreakdown}</span>}
                              </span>
                            </div>
                        </div>
                        <div className="text-gray-400 mt-1 pl-5">
                            <span className="font-semibold">From:</span> {line.from} &rarr; <span className="font-semibold">To:</span> {line.to}
                        </div>
                    </div>
                )
            })}
        </div>
    );
};


const LvCableSummary: React.FC<{lines: SupplyLine[]}> = ({ lines }) => {
    const { lvLines, cableSummary, terminationSummary } = useMemo(() => {
        const lvLines = lines.filter(l => l.type === 'lv');
        const { summary, terminationSummary } = calculateLvCableSummary(lvLines);
        return { lvLines, cableSummary: Array.from(summary.entries()), terminationSummary: Array.from(terminationSummary.entries()) };
    }, [lines]);

    if(lvLines.length === 0) return null;

    return (
        <>
            <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">LV/AC Cable Summary</h3>
                <div className="space-y-1.5 text-sm">
                    {cableSummary.length > 0 ? cableSummary.map(([type, {totalLength, color}]) => (
                        <div key={type} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full" style={{backgroundColor: color}}></div>
                                <span className="text-gray-300 text-xs">{type}</span>
                            </div>
                            <span className="font-mono font-bold text-indigo-400">{totalLength.toFixed(2)}m</span>
                        </div>
                    )) : <p className="text-gray-500 text-xs">No cables to summarize.</p>}
                </div>
            </div>

            {terminationSummary.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Termination Summary</h3>
                    <div className="space-y-1.5 text-sm">
                        {terminationSummary.map(([type, count]) => (
                            <div key={type} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: getCableColor(type)}}></div>
                                    <span className="text-gray-300 text-xs">{type}</span>
                                </div>
                                <span className="font-mono font-bold text-amber-400">{count}x Terminations</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

const ZoneSummary: React.FC<{ zones: SupplyZone[] }> = ({ zones }) => {
    const totalZoneArea = useMemo(() => zones.reduce((sum, z) => sum + z.area, 0), [zones]);

    if (zones.length === 0) return null;

    return (
        <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Zone Summary</h3>
            <div className="space-y-2 text-sm">
                <div className="bg-gray-700/50 p-2 rounded-md">
                    <div className="flex justify-between items-center">
                        <span className="text-yellow-400">Total Zones</span>
                        <span className="font-mono font-bold text-yellow-400">{zones.length}</span>
                    </div>
                </div>
                <div className="bg-gray-700/50 p-2 rounded-md">
                    <div className="flex justify-between items-center">
                        <span className="text-yellow-400">Total Zoned Area</span>
                        <span className="font-mono font-bold text-yellow-400">{totalZoneArea.toFixed(2)}m²</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BudgetMarkupSummary: React.FC<{lines: SupplyLine[], zones: SupplyZone[]}> = ({ lines, zones }) => {
    const { mvLines, mvTotalLength } = useMemo(() => {
        const mvLines = lines.filter(l => l.type === 'mv');
        const mvTotalLength = mvLines.reduce((sum, l) => sum + l.length, 0);
        return { mvLines, mvTotalLength };
    }, [lines]);

    return (
        <>
            <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">MV Supply Routes</h3>
                <div className="space-y-2 text-sm">
                    <div className="bg-gray-700/50 p-2 rounded-md">
                        <div className="flex justify-between items-center">
                            <span className="text-red-400">MV Lines</span>
                            <span className="font-mono font-bold text-red-400">{mvLines.length}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Total Length: {mvTotalLength.toFixed(2)}m</div>
                    </div>
                </div>
            </div>
            <LvCableSummary lines={lines} />
            <ZoneSummary zones={zones} />
        </>
    );
};

const LineShopSummary: React.FC<{lines: SupplyLine[], containment: Containment[], zones: SupplyZone[]}> = ({ lines, containment, zones }) => {
    const containmentSummary = useMemo(() => {
        const summary = new Map<string, number>();
        containment.forEach(item => {
            const currentLength = summary.get(item.type) || 0;
            summary.set(item.type, currentLength + item.length);
        });
        return Array.from(summary.entries());
    }, [containment]);

    return (
    <>
        <LvCableSummary lines={lines} />
        <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Containment Summary</h3>
            <div className="space-y-1.5 text-sm">
                {containmentSummary.length > 0 ? containmentSummary.map(([type, totalLength]) => {
                    const style = getContainmentStyle(type as any, type as any);
                    return (
                        <div key={type} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                            <div className="flex items-center gap-3">
                                 <svg width="24" height="4" className="flex-shrink-0">
                                    <line x1="0" y1="2" x2="24" y2="2" style={{ stroke: style.color, strokeWidth: 2, strokeDasharray: style.dash.join(' '), strokeLinecap: 'round' }} />
                                </svg>
                                <span className="text-gray-300 text-xs">{type}</span>
                            </div>
                            <span className="font-mono font-bold text-indigo-400">{totalLength.toFixed(2)}m</span>
                        </div>
                    )
                }) : <p className="text-gray-500 text-xs">No containment systems drawn.</p>}
            </div>
        </div>
        <ZoneSummary zones={zones} />
    </>
    )
};


const PVDesignSummary: React.FC<{lines: SupplyLine[], pvPanelConfig: PVPanelConfig | null, pvArrays: PVArrayItem[], zones: SupplyZone[]}> = ({ lines, pvPanelConfig, pvArrays, zones }) => {
    const { dcTotalLength, acTotalLength } = useMemo(() => {
        const dcLines = lines.filter(l => l.type === 'dc');
        const acLines = lines.filter(l => l.type === 'lv'); // 'lv' is used for AC
        return { 
            dcTotalLength: dcLines.reduce((sum, l) => sum + l.length, 0),
            acTotalLength: acLines.reduce((sum, l) => sum + l.length, 0)
        };
    }, [lines]);

    const { totalPanels, totalWattage } = useMemo(() => {
        if (!pvPanelConfig) return { totalPanels: 0, totalWattage: 0 };
        const totalPanels = pvArrays.reduce((sum, arr) => sum + arr.rows * arr.columns, 0);
        return {
            totalPanels,
            totalWattage: totalPanels * pvPanelConfig.wattage
        };
    }, [pvArrays, pvPanelConfig]);

    return (
        <>
            <div className="mb-6 p-3 bg-gray-900/70 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">PV Panel Configuration</h3>
                 {pvPanelConfig ? (
                    <div className="text-xs text-gray-300 space-y-1">
                        <div className="flex justify-between"><span>Dimensions:</span> <span className='font-mono'>{pvPanelConfig.length}m x {pvPanelConfig.width}m</span></div>
                        <div className="flex justify-between"><span>Wattage:</span> <span className='font-mono'>{pvPanelConfig.wattage} Wp</span></div>
                    </div>
                ) : (
                    <p className="text-gray-500 text-xs">Not configured.</p>
                )}
            </div>

            <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">PV Array Summary</h3>
                <div className="space-y-2 text-sm">
                    <div className="bg-gray-700/50 p-2 rounded-md">
                        <div className="flex justify-between items-center">
                            <span className="text-sky-400">Total Arrays</span>
                            <span className="font-mono font-bold text-sky-400">{pvArrays.length}</span>
                        </div>
                    </div>
                     <div className="bg-gray-700/50 p-2 rounded-md">
                        <div className="flex justify-between items-center">
                            <span className="text-sky-400">Total Panels</span>
                            <span className="font-mono font-bold text-sky-400">{totalPanels}</span>
                        </div>
                    </div>
                     <div className="bg-gray-700/50 p-2 rounded-md">
                        <div className="flex justify-between items-center">
                            <span className="text-green-400">Total DC Power</span>
                            <span className="font-mono font-bold text-green-400">{(totalWattage / 1000).toFixed(2)} kWp</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">PV Line Summary</h3>
                <div className="space-y-2 text-sm">
                    <div className="bg-gray-700/50 p-2 rounded-md">
                        <div className="flex justify-between items-center">
                            <span className="text-orange-400">DC Line Total Length</span>
                            <span className="font-mono font-bold text-orange-400">{dcTotalLength.toFixed(2)}m</span>
                        </div>
                    </div>
                    <div className="bg-gray-700/50 p-2 rounded-md">
                        <div className="flex justify-between items-center">
                            <span className="text-blue-400">AC Line Total Length</span>
                            <span className="font-mono font-bold text-blue-400">{acTotalLength.toFixed(2)}m</span>
                        </div>
                    </div>
                </div>
            </div>
            <LvCableSummary lines={lines} />
            <ZoneSummary zones={zones} />
        </>
    );
};

const EquipmentPanel: React.FC<EquipmentPanelProps> = ({ 
    equipment, lines, zones, containment, selectedItemId, setSelectedItemId,
    onEquipmentUpdate, onZoneUpdate, onDeleteItem, purposeConfig, designPurpose,
    pvPanelConfig, pvArrays, tasks, onOpenTaskModal,
}) => {
  const [activeTab, setActiveTab] = useState<EquipmentPanelTab>('summary');
  const [expandedAssignees, setExpandedAssignees] = useState<Record<string, boolean>>({});

  const toggleAssigneeExpansion = (assigneeName: string) => {
    setExpandedAssignees(prev => ({
        ...prev,
        [assigneeName]: !prev[assigneeName],
    }));
  };

  const {itemDictionary, equipmentCounts, containmentSummary, tasksByStatus, tasksByAssignee} = useMemo(() => {
    const eqCounts = new Map<EquipmentType, number>();
    purposeConfig.availableEquipment.forEach(type => eqCounts.set(type, 0));
    equipment.forEach(item => {
      if (eqCounts.has(item.type)) {
        eqCounts.set(item.type, (eqCounts.get(item.type) || 0) + 1);
      }
    });

    const contSummary = new Map<string, Map<string, number>>();
    containment.forEach(item => {
        if(item.type === item.size) return; // Exclude line-shop trunking with no sizes
        const typeKey = item.type.toString();
        if (!contSummary.has(typeKey)) {
            contSummary.set(typeKey, new Map<string, number>());
        }
        const typeMap = contSummary.get(typeKey)!;
        const currentLength = typeMap.get(item.size) || 0;
        typeMap.set(item.size, currentLength + item.length);
    });
    
    const tasksByStatus = {
        [TaskStatus.TODO]: tasks.filter(t => t.status === TaskStatus.TODO),
        [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
        [TaskStatus.DONE]: tasks.filter(t => t.status === TaskStatus.DONE),
    };

    // FIX: Correctly type the accumulator for the reduce function.
    const tasksByAssignee = tasks.reduce<Record<string, Task[]>>((acc, task) => {
        const assignee = task.assignedTo?.trim() || 'Unassigned';
        if (!acc[assignee]) {
            acc[assignee] = [];
        }
        acc[assignee].push(task);
        return acc;
    }, {});

    const itemDict = new Map<string, string>();
    equipment.forEach(e => itemDict.set(e.id, e.name || e.type));
    zones.forEach(z => itemDict.set(z.id, z.name));

    return {
        equipmentCounts: Array.from(eqCounts.entries()),
        containmentSummary: Array.from(contSummary.entries()).map(([type, sizeMap]) => ({
            type: type as any,
            sizes: Array.from(sizeMap.entries()).map(([size, totalLength]) => ({ size, totalLength }))
                .sort((a,b) => (parseInt(a.size) || 0) - (parseInt(b.size) || 0))
        })),
        tasksByStatus,
        tasksByAssignee,
        itemDictionary: itemDict,
    };
  }, [equipment, containment, purposeConfig, tasks, zones]);


  const selectedEquipment = useMemo(() => {
      if (!selectedItemId) return null;
      return equipment.find(e => e.id === selectedItemId) || null;
  }, [selectedItemId, equipment]);
  
  const selectedZone = useMemo(() => {
      if (!selectedItemId) return null;
      return zones.find(z => z.id === selectedItemId) || null;
  }, [selectedItemId, zones]);
  
  const selectedPvArray = useMemo(() => {
      if (!selectedItemId) return null;
      return pvArrays.find(p => p.id === selectedItemId) || null;
  }, [selectedItemId, pvArrays]);

  const hasLvCables = useMemo(() => lines.some(l => l.type === 'lv' && l.cableType), [lines]);

  const renderSummaryTab = () => {
    switch(designPurpose) {
        case DesignPurpose.PV_DESIGN:
            return <PVDesignSummary lines={lines} pvPanelConfig={pvPanelConfig} pvArrays={pvArrays} zones={zones} />;
        case DesignPurpose.LINE_SHOP_MEASUREMENTS:
            return <LineShopSummary lines={lines} containment={containment} zones={zones} />;
        default:
            return <BudgetMarkupSummary lines={lines} zones={zones} />;
    }
  }

  const TabButton: React.FC<{ tabId: EquipmentPanelTab; label: string, count?: number, disabled?: boolean }> = ({ tabId, label, count, disabled = false }) => (
    <button
        onClick={() => setActiveTab(tabId)}
        disabled={disabled}
        className={`px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none flex items-center gap-2 ${
            activeTab === tabId
                ? 'border-b-2 border-indigo-500 text-white'
                : 'border-b-2 border-transparent text-gray-400 hover:text-white hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {label}
        {typeof count !== 'undefined' && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === tabId ? 'bg-indigo-500/30 text-indigo-200' : 'bg-gray-700 text-gray-300'}`}>{count}</span>}
    </button>
  );

  return (
    <aside className="w-96 bg-gray-800 flex flex-col shadow-2xl z-10 border-l border-gray-700">
        <div className='p-4 flex-shrink-0'>
            <h2 className="text-lg font-semibold text-white mb-4">Project Overview</h2>
            {selectedEquipment && <SelectionDetails item={selectedEquipment} onUpdate={onEquipmentUpdate} onDelete={onDeleteItem} tasks={tasks} onOpenTaskModal={onOpenTaskModal} />}
            {selectedZone && <ZoneDetails item={selectedZone} onUpdate={onZoneUpdate} onDelete={onDeleteItem} tasks={tasks} onOpenTaskModal={onOpenTaskModal} />}
            {selectedPvArray && <PvArrayDetails item={selectedPvArray} pvPanelConfig={pvPanelConfig} onDelete={onDeleteItem} />}
        </div>
        
        <div className="border-b border-gray-700 px-2 flex-shrink-0">
            <nav className="-mb-px flex flex-wrap" aria-label="Tabs">
                <TabButton tabId="summary" label="Summary" />
                <TabButton tabId="equipment" label="Equipment" />
                <TabButton tabId="cables" label="Cables" disabled={!hasLvCables} />
                <TabButton tabId="containment" label="Containment" />
                <TabButton tabId="zones" label="Zones" />
                <TabButton tabId="tasks" label="Tasks" count={tasks.length} />
            </nav>
        </div>

        <div className="flex-grow overflow-y-auto p-4">
            <div style={{display: activeTab === 'summary' ? 'block' : 'none'}}>{renderSummaryTab()}</div>
            <div style={{display: activeTab === 'equipment' ? 'block' : 'none'}}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Equipment Quantities</h3>
                <div className="space-y-1.5 text-sm max-h-[60vh] overflow-y-auto pr-1">
                    {equipmentCounts.filter(([, count]) => count > 0).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                            <div className="flex items-center gap-3">
                                <EquipmentIcon type={type} className="h-5 w-5 text-amber-400" />
                                <span className="text-gray-300 text-xs flex-1">{type}</span>
                            </div>
                            <span className="font-mono font-bold text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded">{count}</span>
                        </div>
                    ))}
                    {equipmentCounts.filter(([_, count]) => count > 0).length === 0 && <p className="text-gray-500 text-xs text-center p-4">No equipment placed.</p>}
                </div>
            </div>
             <div style={{display: activeTab === 'cables' ? 'block' : 'none'}}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">LV/AC Cable Schedule</h3>
                <DetailedCableSchedule lines={lines} />
            </div>
             <div style={{display: activeTab === 'containment' ? 'block' : 'none'}}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Containment Schedule</h3>
                <div className="space-y-4">
                    {containmentSummary.length > 0 ? containmentSummary.map(({ type, sizes }) => (
                        <div key={type}><h4 className="font-bold text-sm text-gray-300 mb-2">{type}</h4><div className="space-y-1.5 text-xs">
                            {sizes.map(({ size, totalLength }) => {
                                const style = getContainmentStyle(type, size);
                                return (<div key={size} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md"><div className="flex items-center gap-3">
                                        <svg width="24" height="4" className="flex-shrink-0"><line x1="0" y1="2" x2="24" y2="2" style={{ stroke: style.color, strokeWidth: 2, strokeDasharray: style.dash.map(d => d*2).join(' '), strokeLinecap: 'round' }} /></svg>
                                        <span className="text-gray-300 w-32">{size}</span></div>
                                    <span className="font-mono font-bold text-indigo-400">{totalLength.toFixed(2)}m</span></div>)
                            })}</div></div>
                    )) : <p className="text-gray-500 text-xs text-center p-4">No containment systems drawn.</p>}
                </div>
            </div>
             <div style={{display: activeTab === 'zones' ? 'block' : 'none'}}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Supply Zones ({zones.length})</h3>
                <div className="space-y-1.5 text-sm max-h-[60vh] overflow-y-auto pr-2">
                    {zones.length > 0 ? zones.map(zone => (
                         <button key={zone.id} onClick={() => setSelectedItemId(zone.id)}
                            className={`w-full text-left flex justify-between items-center p-2 rounded-md transition-colors ${selectedItemId === zone.id ? 'bg-indigo-600/30 ring-1 ring-indigo-400' : 'bg-gray-700/50 hover:bg-gray-700'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: zone.color }}></div>
                                <span className="text-gray-300 font-medium">{zone.name}</span></div>
                            <span className="font-mono font-bold text-yellow-400">{zone.area > 0 ? `${zone.area.toFixed(2)}m²` : '--'}</span></button>
                    )) : <p className="text-gray-500 text-xs text-center p-4">No supply zones defined.</p>}
                </div>
            </div>
            <div style={{display: activeTab === 'tasks' ? 'block' : 'none'}}>
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tasks by Assignee</h3>
                     <div className="space-y-2">
                        {Object.keys(tasksByAssignee).sort((a, b) => { if (a === 'Unassigned') return 1; if (b === 'Unassigned') return -1; return a.localeCompare(b); }).map(assignee => (
                            <div key={assignee} className="bg-gray-700/50 rounded-md overflow-hidden">
                                <button onClick={() => toggleAssigneeExpansion(assignee)} className="w-full flex justify-between items-center p-2 text-left hover:bg-gray-700 transition-colors">
                                    <span className="font-semibold text-sm text-gray-200">{assignee}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-gray-600 text-indigo-300 font-bold px-2 py-0.5 rounded-full">{tasksByAssignee[assignee].length}</span>
                                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedAssignees[assignee] ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                {expandedAssignees[assignee] && (
                                    <div className="p-2 border-t border-gray-600/50 space-y-1.5">
                                        {tasksByAssignee[assignee].map(task => (
                                            <button key={task.id} onClick={() => onOpenTaskModal(task)} className="w-full text-left bg-gray-900/40 p-2 rounded-md hover:bg-gray-900/80 transition-colors">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold text-gray-200 text-xs truncate">{task.title}</p>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                          task.status === TaskStatus.DONE ? 'bg-green-500/20 text-green-400' :
                                                          task.status === TaskStatus.IN_PROGRESS ? 'bg-amber-500/20 text-amber-400' :
                                                          'bg-gray-600 text-gray-300'
                                                      }`}>{task.status}</span>
                                                </div>
                                                <p className="text-gray-400 text-[10px] truncate mt-1">For: {itemDictionary.get(task.linkedItemId) || 'Unknown Item'}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="border-gray-700 my-4"/>

                {Object.entries(tasksByStatus).map(([status, tasksInStatus]) => (
                    <div key={status} className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            {status === TaskStatus.TODO && <Circle size={14} className="text-gray-400" />}
                            {status === TaskStatus.IN_PROGRESS && <Clock size={14} className="text-amber-400" />}
                            {status === TaskStatus.DONE && <CheckCircle size={14} className="text-green-400" />}
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{status} ({tasksInStatus.length})</h3>
                        </div>
                        <div className="space-y-1.5 text-sm">
                            {tasksInStatus.length > 0 ? tasksInStatus.map(task => (
                                <button key={task.id} onClick={() => onOpenTaskModal(task)} className="w-full text-left bg-gray-700/50 p-2 rounded-md hover:bg-gray-700 transition-colors">
                                    <p className="font-semibold text-gray-200 text-xs truncate">{task.title}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-gray-400 text-[10px] truncate">For: {itemDictionary.get(task.linkedItemId) || 'Unknown Item'}</p>
                                        {task.assignedTo && <p className="text-gray-400 text-[10px]">@{task.assignedTo}</p>}
                                    </div>
                                </button>
                            )) : <p className="text-gray-500 text-xs text-center p-2">No tasks in this category.</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </aside>
  );
};

export default EquipmentPanel;
