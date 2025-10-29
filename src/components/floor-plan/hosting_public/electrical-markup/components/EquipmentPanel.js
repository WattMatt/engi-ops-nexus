import React, { useState, useMemo } from 'react';
import { Layers, LayoutGrid, PlusCircle, CheckCircle, Clock, Circle, ChevronDown } from 'lucide-react';
import { DesignPurpose, TaskStatus } from '../types.js';
import { EquipmentIcon } from './EquipmentIcon.js';
import { getCableColor, getContainmentStyle, calculateLvCableSummary } from '../utils/styleUtils.js';

const ItemTasks = ({ itemId, tasks, onOpenTaskModal }) => {
    const itemTasks = useMemo(() => tasks.filter(t => t.linkedItemId === itemId), [tasks, itemId]);
    
    return (
        React.createElement("div", { className: "mt-4 pt-4 border-t border-gray-700/50" },
            React.createElement("div", { className: "flex justify-between items-center mb-2" },
                React.createElement("h4", { className: "text-sm font-semibold text-gray-300" }, "Tasks (", itemTasks.length, ")"),
                React.createElement("button", { 
                    onClick: () => onOpenTaskModal({ linkedItemId: itemId, status: TaskStatus.TODO }),
                    className: "flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                },
                    React.createElement(PlusCircle, { size: 14 }), " Add Task"
                )
            ),
            React.createElement("div", { className: "space-y-1.5 max-h-32 overflow-y-auto pr-1" },
                itemTasks.length > 0 ? itemTasks.map(task => (
                    React.createElement("button", { key: task.id, onClick: () => onOpenTaskModal(task), className: "w-full text-left bg-gray-700/50 p-2 rounded-md text-xs hover:bg-gray-700 transition-colors" },
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("span", { className: "font-medium text-gray-200 truncate" }, task.title),
                            React.createElement("span", { className: `text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                task.status === TaskStatus.DONE ? 'bg-green-500/20 text-green-400' :
                                task.status === TaskStatus.IN_PROGRESS ? 'bg-amber-500/20 text-amber-400' :
                                'bg-gray-600 text-gray-300'
                            }` }, task.status)
                        )
                    )
                )) : (
                    React.createElement("p", { className: "text-gray-500 text-xs text-center py-2" }, "No tasks for this item.")
                )
            )
        )
    );
};


const SelectionDetails = ({ item, onUpdate, onDelete, tasks, onOpenTaskModal }) => {
    return (
        React.createElement("div", { className: "mb-6 p-3 bg-gray-900 rounded-lg" },
            React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" }, "Selection Details"),
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement(EquipmentIcon, { type: item.type, className: "h-5 w-5 text-amber-400 flex-shrink-0" }),
                React.createElement("span", { className: "text-gray-300 font-bold" }, item.type)
            ),
            React.createElement("div", null,
                React.createElement("label", { htmlFor: "equipmentName", className: "block text-sm font-medium text-gray-300 mb-1" },
                    "Equipment Name"
                ),
                React.createElement("input", {
                    type: "text",
                    id: "equipmentName",
                    value: item.name || '',
                    onChange: (e) => onUpdate({ ...item, name: e.target.value }),
                    className: "w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm",
                    placeholder: "e.g., DB-GF-01"
                })
            ),
            React.createElement(ItemTasks, { itemId: item.id, tasks: tasks, onOpenTaskModal: onOpenTaskModal }),
            React.createElement("div", { className: "mt-4" },
                React.createElement("button", { onClick: onDelete, className: "w-full text-center px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md text-sm font-semibold transition-colors" },
                    "Delete Item"
                )
            )
        )
    )
}

const ZoneDetails = ({ item, onUpdate, onDelete, tasks, onOpenTaskModal }) => {
    return (
        React.createElement("div", { className: "mb-6 p-3 bg-gray-900 rounded-lg" },
            React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" }, "Selection Details"),
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement(Layers, { className: "h-5 w-5 text-yellow-400 flex-shrink-0" }),
                React.createElement("span", { className: "text-gray-300 font-bold" }, "Supply Zone")
            ),
            React.createElement("div", null,
                React.createElement("label", { htmlFor: "zoneName", className: "block text-sm font-medium text-gray-300 mb-1" },
                    "Zone Name"
                ),
                React.createElement("input", {
                    type: "text",
                    id: "zoneName",
                    value: item.name || '',
                    onChange: (e) => onUpdate({ ...item, name: e.target.value }),
                    className: "w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm",
                    placeholder: "e.g., Office Area",
                    autoFocus: true,
                    onFocus: (e) => e.target.select()
                })
            ),
            React.createElement(ItemTasks, { itemId: item.id, tasks: tasks, onOpenTaskModal: onOpenTaskModal }),
            React.createElement("div", { className: "mt-4" },
                React.createElement("button", { onClick: onDelete, className: "w-full text-center px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md text-sm font-semibold transition-colors" },
                    "Delete Zone"
                )
            )
        )
    )
}

const PvArrayDetails = ({ item, pvPanelConfig, onDelete }) => {
    const totalPanels = item.rows * item.columns;
    const totalWattage = pvPanelConfig ? totalPanels * pvPanelConfig.wattage : 0;
    return (
        React.createElement("div", { className: "mb-6 p-3 bg-gray-900 rounded-lg" },
            React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" }, "Selection Details"),
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement(LayoutGrid, { className: "h-5 w-5 text-sky-400 flex-shrink-0" }),
                React.createElement("span", { className: "text-gray-300 font-bold" }, "PV Array")
            ),
            React.createElement("div", { className: "text-sm text-gray-300 space-y-1" },
                React.createElement("div", { className: "flex justify-between" }, React.createElement("span", null, "Layout:"), React.createElement("span", { className: "font-mono" }, item.rows, " rows \u00D7 ", item.columns, " cols")),
                React.createElement("div", { className: "flex justify-between" }, React.createElement("span", null, "Orientation:"), React.createElement("span", { className: "font-mono capitalize" }, item.orientation)),
                React.createElement("div", { className: "flex justify-between" }, React.createElement("span", null, "Total Panels:"), React.createElement("span", { className: "font-mono" }, totalPanels)),
                pvPanelConfig && React.createElement("div", { className: "flex justify-between" }, React.createElement("span", null, "Total Power:"), React.createElement("span", { className: "font-mono" }, (totalWattage/1000).toFixed(2), " kWp"))
            ),
             React.createElement("div", { className: "mt-4" },
                React.createElement("button", { onClick: onDelete, className: "w-full text-center px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md text-sm font-semibold transition-colors" },
                    "Delete Array"
                )
            )
        )
    );
};

const DetailedCableSchedule = ({ lines }) => {
    const lvLines = useMemo(() => lines.filter(l => l.type === 'lv'), [lines]);

    if (lvLines.length === 0) {
        return React.createElement("p", { className: "text-gray-500 text-xs p-4 text-center" }, "No LV/AC cables drawn.");
    }
    
    return (
        React.createElement("div", { className: "space-y-2 text-sm max-h-[60vh] overflow-y-auto pr-2" },
            lvLines.map(line => {
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
                    React.createElement("div", { key: line.id, className: "bg-gray-700/50 p-2 rounded-md text-xs" },
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("div", { className: "flex items-center gap-2" },
                                React.createElement("div", { className: "w-3 h-3 rounded-full", style: {backgroundColor: line.cableType ? getCableColor(line.cableType) : 'gray'} }),
                                React.createElement("span", { className: "font-bold text-gray-200" }, line.cableType || 'N/A')
                            ),
                            React.createElement("div", { className: "flex items-center gap-3" },
                              line.terminationCount && line.terminationCount > 0 && React.createElement("span", { className: "font-mono text-amber-400" }, line.terminationCount, "x Term."),
                              React.createElement("span", { className: "font-mono text-gray-300" },
                                  calculatedLength.toFixed(2), "m",
                                  lengthBreakdown && React.createElement("span", { className: "text-gray-500 text-[10px] ml-1" }, lengthBreakdown)
                              )
                            )
                        ),
                        React.createElement("div", { className: "text-gray-400 mt-1 pl-5" },
                            React.createElement("span", { className: "font-semibold" }, "From:"), " ", line.from, " \u2192 ", React.createElement("span", { className: "font-semibold" }, "To:"), " ", line.to
                        )
                    )
                )
            })
        )
    );
};


const LvCableSummary = ({ lines }) => {
    const { lvLines, cableSummary, terminationSummary } = useMemo(() => {
        const lvLines = lines.filter(l => l.type === 'lv');
        const { summary, terminationSummary } = calculateLvCableSummary(lvLines);
        return { lvLines, cableSummary: Array.from(summary.entries()), terminationSummary: Array.from(terminationSummary.entries()) };
    }, [lines]);

    if(lvLines.length === 0) return null;

    return (
        React.createElement(React.Fragment, null,
            React.createElement("div", { className: "mb-6" },
                React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "LV/AC Cable Summary"),
                React.createElement("div", { className: "space-y-1.5 text-sm" },
                    cableSummary.length > 0 ? cableSummary.map(([type, {totalLength, color}]) => (
                        React.createElement("div", { key: type, className: "flex justify-between items-center bg-gray-700/50 p-2 rounded-md" },
                            React.createElement("div", { className: "flex items-center gap-3" },
                                React.createElement("div", { className: "w-4 h-4 rounded-full", style: {backgroundColor: color} }),
                                React.createElement("span", { className: "text-gray-300 text-xs" }, type)
                            ),
                            React.createElement("span", { className: "font-mono font-bold text-indigo-400" }, totalLength.toFixed(2), "m")
                        )
                    )) : React.createElement("p", { className: "text-gray-500 text-xs" }, "No cables to summarize.")
                )
            ),

            terminationSummary.length > 0 && (
                React.createElement("div", { className: "mb-6" },
                    React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "Termination Summary"),
                    React.createElement("div", { className: "space-y-1.5 text-sm" },
                        terminationSummary.map(([type, count]) => (
                            React.createElement("div", { key: type, className: "flex justify-between items-center bg-gray-700/50 p-2 rounded-md" },
                                React.createElement("div", { className: "flex items-center gap-3" },
                                    React.createElement("div", { className: "w-4 h-4 rounded-full", style: {backgroundColor: getCableColor(type)} }),
                                    React.createElement("span", { className: "text-gray-300 text-xs" }, type)
                                ),
                                React.createElement("span", { className: "font-mono font-bold text-amber-400" }, count, "x Terminations")
                            )
                        ))
                    )
                )
            )
        )
    );
}

const ZoneSummary = ({ zones }) => {
    const totalZoneArea = useMemo(() => zones.reduce((sum, z) => sum + z.area, 0), [zones]);

    if (zones.length === 0) return null;

    return (
        React.createElement("div", { className: "mb-6" },
            React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "Zone Summary"),
            React.createElement("div", { className: "space-y-2 text-sm" },
                React.createElement("div", { className: "bg-gray-700/50 p-2 rounded-md" },
                    React.createElement("div", { className: "flex justify-between items-center" },
                        React.createElement("span", { className: "text-yellow-400" }, "Total Zones"),
                        React.createElement("span", { className: "font-mono font-bold text-yellow-400" }, zones.length)
                    )
                ),
                React.createElement("div", { className: "bg-gray-700/50 p-2 rounded-md" },
                    React.createElement("div", { className: "flex justify-between items-center" },
                        React.createElement("span", { className: "text-yellow-400" }, "Total Zoned Area"),
                        React.createElement("span", { className: "font-mono font-bold text-yellow-400" }, totalZoneArea.toFixed(2), "m²")
                    )
                )
            )
        )
    );
};

const BudgetMarkupSummary = ({ lines, zones }) => {
    const { mvLines, mvTotalLength } = useMemo(() => {
        const mvLines = lines.filter(l => l.type === 'mv');
        const mvTotalLength = mvLines.reduce((sum, l) => sum + l.length, 0);
        return { mvLines, mvTotalLength };
    }, [lines]);

    return (
        React.createElement(React.Fragment, null,
            React.createElement("div", { className: "mb-6" },
                React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "MV Supply Routes"),
                React.createElement("div", { className: "space-y-2 text-sm" },
                    React.createElement("div", { className: "bg-gray-700/50 p-2 rounded-md" },
                        React.createElement("div", { className: "flex justify-between items-center" },
                            React.createElement("span", { className: "text-red-400" }, "MV Lines"),
                            React.createElement("span", { className: "font-mono font-bold text-red-400" }, mvLines.length)
                        ),
                        React.createElement("div", { className: "text-xs text-gray-400 mt-1" }, "Total Length: ", mvTotalLength.toFixed(2), "m")
                    )
                )
            ),
            React.createElement(LvCableSummary, { lines: lines }),
            React.createElement(ZoneSummary, { zones: zones })
        )
    );
};

const LineShopSummary = ({ lines, containment, zones }) => {
    const containmentSummary = useMemo(() => {
        const summary = new Map();
        containment.forEach(item => {
            const currentLength = summary.get(item.type) || 0;
            summary.set(item.type, currentLength + item.length);
        });
        return Array.from(summary.entries());
    }, [containment]);

    return (
    React.createElement(React.Fragment, null,
        React.createElement(LvCableSummary, { lines: lines }),
        React.createElement("div", { className: "mb-6" },
            React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "Containment Summary"),
            React.createElement("div", { className: "space-y-1.5 text-sm" },
                containmentSummary.length > 0 ? containmentSummary.map(([type, totalLength]) => {
                    const style = getContainmentStyle(type, type);
                    return (
                        React.createElement("div", { key: type, className: "flex justify-between items-center bg-gray-700/50 p-2 rounded-md" },
                            React.createElement("div", { className: "flex items-center gap-3" },
                                 React.createElement("svg", { width: "24", height: "4", className: "flex-shrink-0" },
                                    React.createElement("line", { x1: "0", y1: "2", x2: "24", y2: "2", style: { stroke: style.color, strokeWidth: 2, strokeDasharray: style.dash.join(' '), strokeLinecap: 'round' } })
                                ),
                                React.createElement("span", { className: "text-gray-300 text-xs" }, type)
                            ),
                            React.createElement("span", { className: "font-mono font-bold text-indigo-400" }, totalLength.toFixed(2), "m")
                        )
                    )
                }) : React.createElement("p", { className: "text-gray-500 text-xs" }, "No containment systems drawn.")
            )
        ),
        React.createElement(ZoneSummary, { zones: zones })
    )
    )
};


const PVDesignSummary = ({ lines, pvPanelConfig, pvArrays, zones }) => {
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
        React.createElement(React.Fragment, null,
            React.createElement("div", { className: "mb-6 p-3 bg-gray-900/70 rounded-lg" },
                React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "PV Panel Configuration"),
                 pvPanelConfig ? (
                    React.createElement("div", { className: "text-xs text-gray-300 space-y-1" },
                        React.createElement("div", { className: "flex justify-between" }, React.createElement("span", null, "Dimensions:"), React.createElement("span", { className: "font-mono" }, pvPanelConfig.length, "m x ", pvPanelConfig.width, "m")),
                        React.createElement("div", { className: "flex justify-between" }, React.createElement("span", null, "Wattage:"), React.createElement("span", { className: "font-mono" }, pvPanelConfig.wattage, " Wp"))
                    )
                ) : (
                    React.createElement("p", { className: "text-gray-500 text-xs" }, "Not configured.")
                )
            ),

            React.createElement("div", { className: "mb-6" },
                React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "PV Array Summary"),
                React.createElement("div", { className: "space-y-2 text-sm" },
                    React.createElement("div", { className: "bg-gray-700/50 p-2 rounded-md" },
                        React.createElement("div", { className: "flex justify-between items-center" },
                            React.createElement("span", { className: "text-sky-400" }, "Total Arrays"),
                            React.createElement("span", { className: "font-mono font-bold text-sky-400" }, pvArrays.length)
                        )
                    ),
                     React.createElement("div", { className: "bg-gray-700/50 p-2 rounded-md" },
                        React.createElement("div", { className: "flex justify-between items-center" },
                            React.createElement("span", { className: "text-sky-400" }, "Total Panels"),
                            React.createElement("span", { className: "font-mono font-bold text-sky-400" }, totalPanels)
                        )
                    ),
                     React.createElement("div", { className: "bg-gray-700/50 p-2 rounded-md" },
                        React.createElement("div", { className: "flex justify-between items-center" },
                            React.createElement("span", { className: "text-green-400" }, "Total DC Power"),
                            React.createElement("span", { className: "font-mono font-bold text-green-400" }, (totalWattage / 1000).toFixed(2), " kWp")
                        )
                    )
                )
            ),

            React.createElement("div", { className: "mb-6" },
                React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "PV Line Summary"),
                React.createElement("div", { className: "space-y-2 text-sm" },
                    React.createElement("div", { className: "bg-gray-700/50 p-2 rounded-md" },
                        React.createElement("div", { className: "flex justify-between items-center" },
                            React.createElement("span", { className: "text-orange-400" }, "DC Line Total Length"),
                            React.createElement("span", { className: "font-mono font-bold text-orange-400" }, dcTotalLength.toFixed(2), "m")
                        )
                    ),
                    React.createElement("div", { className: "bg-gray-700/50 p-2 rounded-md" },
                        React.createElement("div", { className: "flex justify-between items-center" },
                            React.createElement("span", { className: "text-blue-400" }, "AC Line Total Length"),
                            React.createElement("span", { className: "font-mono font-bold text-blue-400" }, acTotalLength.toFixed(2), "m")
                        )
                    )
                )
            ),
            React.createElement(LvCableSummary, { lines: lines }),
            React.createElement(ZoneSummary, { zones: zones })
        )
    );
};

const EquipmentPanel = ({ 
    equipment, lines, zones, containment, selectedItemId, setSelectedItemId,
    onEquipmentUpdate, onZoneUpdate, onDeleteItem, purposeConfig, designPurpose,
    pvPanelConfig, pvArrays, tasks, onOpenTaskModal,
}) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedAssignees, setExpandedAssignees] = useState({});

  const toggleAssigneeExpansion = (assigneeName) => {
    setExpandedAssignees(prev => ({
        ...prev,
        [assigneeName]: !prev[assigneeName],
    }));
  };

  const {itemDictionary, equipmentCounts, containmentSummary, tasksByStatus, tasksByAssignee} = useMemo(() => {
    const eqCounts = new Map();
    purposeConfig.availableEquipment.forEach(type => eqCounts.set(type, 0));
    equipment.forEach(item => {
      if (eqCounts.has(item.type)) {
        eqCounts.set(item.type, (eqCounts.get(item.type) || 0) + 1);
      }
    });

    const contSummary = new Map();
    containment.forEach(item => {
        if(item.type === item.size) return; // Exclude line-shop trunking with no sizes
        const typeKey = item.type.toString();
        if (!contSummary.has(typeKey)) {
            contSummary.set(typeKey, new Map());
        }
        const typeMap = contSummary.get(typeKey);
        const currentLength = typeMap.get(item.size) || 0;
        typeMap.set(item.size, currentLength + item.length);
    });
    
    const tasksByStatus = {
        [TaskStatus.TODO]: tasks.filter(t => t.status === TaskStatus.TODO),
        [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
        [TaskStatus.DONE]: tasks.filter(t => t.status === TaskStatus.DONE),
    };

    const tasksByAssignee = tasks.reduce((acc, task) => {
        const assignee = task.assignedTo?.trim() || 'Unassigned';
        if (!acc[assignee]) {
            acc[assignee] = [];
        }
        acc[assignee].push(task);
        return acc;
    }, {});

    const itemDict = new Map();
    equipment.forEach(e => itemDict.set(e.id, e.name || e.type));
    zones.forEach(z => itemDict.set(z.id, z.name));

    return {
        equipmentCounts: Array.from(eqCounts.entries()),
        containmentSummary: Array.from(contSummary.entries()).map(([type, sizeMap]) => ({
            type: type,
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
            return React.createElement(PVDesignSummary, { lines: lines, pvPanelConfig: pvPanelConfig, pvArrays: pvArrays, zones: zones });
        case DesignPurpose.LINE_SHOP_MEASUREMENTS:
            return React.createElement(LineShopSummary, { lines: lines, containment: containment, zones: zones });
        default:
            return React.createElement(BudgetMarkupSummary, { lines: lines, zones: zones });
    }
  }

  const TabButton = ({ tabId, label, count, disabled = false }) => (
    React.createElement("button", {
        onClick: () => setActiveTab(tabId),
        disabled: disabled,
        className: `px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none flex items-center gap-2 ${
            activeTab === tabId
                ? 'border-b-2 border-indigo-500 text-white'
                : 'border-b-2 border-transparent text-gray-400 hover:text-white hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
    },
        label,
        typeof count !== 'undefined' && React.createElement("span", { className: `text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === tabId ? 'bg-indigo-500/30 text-indigo-200' : 'bg-gray-700 text-gray-300'}` }, count)
    )
  );

  return (
    React.createElement("aside", { className: "w-96 bg-gray-800 flex flex-col shadow-2xl z-10 border-l border-gray-700" },
        React.createElement("div", { className: "p-4 flex-shrink-0" },
            React.createElement("h2", { className: "text-lg font-semibold text-white mb-4" }, "Project Overview"),
            selectedEquipment && React.createElement(SelectionDetails, { item: selectedEquipment, onUpdate: onEquipmentUpdate, onDelete: onDeleteItem, tasks: tasks, onOpenTaskModal: onOpenTaskModal }),
            selectedZone && React.createElement(ZoneDetails, { item: selectedZone, onUpdate: onZoneUpdate, onDelete: onDeleteItem, tasks: tasks, onOpenTaskModal: onOpenTaskModal }),
            selectedPvArray && React.createElement(PvArrayDetails, { item: selectedPvArray, pvPanelConfig: pvPanelConfig, onDelete: onDeleteItem })
        ),
        
        React.createElement("div", { className: "border-b border-gray-700 px-2 flex-shrink-0" },
            React.createElement("nav", { className: "-mb-px flex flex-wrap", "aria-label": "Tabs" },
                React.createElement(TabButton, { tabId: "summary", label: "Summary" }),
                React.createElement(TabButton, { tabId: "equipment", label: "Equipment" }),
                React.createElement(TabButton, { tabId: "cables", label: "Cables", disabled: !hasLvCables }),
                React.createElement(TabButton, { tabId: "containment", label: "Containment" }),
                React.createElement(TabButton, { tabId: "zones", label: "Zones" }),
                React.createElement(TabButton, { tabId: "tasks", label: "Tasks", count: tasks.length })
            )
        ),

        React.createElement("div", { className: "flex-grow overflow-y-auto p-4" },
            React.createElement("div", { style: {display: activeTab === 'summary' ? 'block' : 'none'} }, renderSummaryTab()),
            React.createElement("div", { style: {display: activeTab === 'equipment' ? 'block' : 'none'} },
                React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "Equipment Quantities"),
                React.createElement("div", { className: "space-y-1.5 text-sm max-h-[60vh] overflow-y-auto pr-1" },
                    equipmentCounts.filter(([, count]) => count > 0).map(([type, count]) => (
                        React.createElement("div", { key: type, className: "flex justify-between items-center bg-gray-700/50 p-2 rounded-md" },
                            React.createElement("div", { className: "flex items-center gap-3" },
                                React.createElement(EquipmentIcon, { type: type, className: "h-5 w-5 text-amber-400" }),
                                React.createElement("span", { className: "text-gray-300 text-xs flex-1" }, type)
                            ),
                            React.createElement("span", { className: "font-mono font-bold text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded" }, count)
                        )
                    )),
                    equipmentCounts.filter(([_, count]) => count > 0).length === 0 && React.createElement("p", { className: "text-gray-500 text-xs text-center p-4" }, "No equipment placed.")
                )
            ),
             React.createElement("div", { style: {display: activeTab === 'cables' ? 'block' : 'none'} },
                React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "LV/AC Cable Schedule"),
                React.createElement(DetailedCableSchedule, { lines: lines })
            ),
             React.createElement("div", { style: {display: activeTab === 'containment' ? 'block' : 'none'} },
                React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "Containment Schedule"),
                React.createElement("div", { className: "space-y-4" },
                    containmentSummary.length > 0 ? containmentSummary.map(({ type, sizes }) => (
                        React.createElement("div", { key: type }, React.createElement("h4", { className: "font-bold text-sm text-gray-300 mb-2" }, type), React.createElement("div", { className: "space-y-1.5 text-xs" },
                            sizes.map(({ size, totalLength }) => {
                                const style = getContainmentStyle(type, size);
                                return (React.createElement("div", { key: size, className: "flex justify-between items-center bg-gray-700/50 p-2 rounded-md" }, React.createElement("div", { className: "flex items-center gap-3" },
                                        React.createElement("svg", { width: "24", height: "4", className: "flex-shrink-0" }, React.createElement("line", { x1: "0", y1: "2", x2: "24", y2: "2", style: { stroke: style.color, strokeWidth: 2, strokeDasharray: style.dash.map(d => d*2).join(' '), strokeLinecap: 'round' } })),
                                        React.createElement("span", { className: "text-gray-300 w-32" }, size)),
                                    React.createElement("span", { className: "font-mono font-bold text-indigo-400" }, totalLength.toFixed(2), "m")))
                            })))
                    )) : React.createElement("p", { className: "text-gray-500 text-xs text-center p-4" }, "No containment systems drawn.")
                )
            ),
             React.createElement("div", { style: {display: activeTab === 'zones' ? 'block' : 'none'} },
                React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "Supply Zones (", zones.length, ")"),
                React.createElement("div", { className: "space-y-1.5 text-sm max-h-[60vh] overflow-y-auto pr-2" },
                    zones.length > 0 ? zones.map(zone => (
                         React.createElement("button", { key: zone.id, onClick: () => setSelectedItemId(zone.id),
                            className: `w-full text-left flex justify-between items-center p-2 rounded-md transition-colors ${selectedItemId === zone.id ? 'bg-indigo-600/30 ring-1 ring-indigo-400' : 'bg-gray-700/50 hover:bg-gray-700'}` },
                            React.createElement("div", { className: "flex items-center gap-3" },
                                React.createElement("div", { className: "w-4 h-4 rounded", style: { backgroundColor: zone.color } }),
                                React.createElement("span", { className: "text-gray-300 font-medium" }, zone.name)),
                            React.createElement("span", { className: "font-mono font-bold text-yellow-400" }, zone.area > 0 ? `${zone.area.toFixed(2)}m²` : '--'))
                    )) : React.createElement("p", { className: "text-gray-500 text-xs text-center p-4" }, "No supply zones defined.")
                )
            ),
            React.createElement("div", { style: {display: activeTab === 'tasks' ? 'block' : 'none'} },
                React.createElement("div", { className: "mb-6" },
                    React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" }, "Tasks by Assignee"),
                     React.createElement("div", { className: "space-y-2" },
                        Object.keys(tasksByAssignee).sort((a, b) => { if (a === 'Unassigned') return 1; if (b === 'Unassigned') return -1; return a.localeCompare(b); }).map(assignee => (
                            React.createElement("div", { key: assignee, className: "bg-gray-700/50 rounded-md overflow-hidden" },
                                React.createElement("button", { onClick: () => toggleAssigneeExpansion(assignee), className: "w-full flex justify-between items-center p-2 text-left hover:bg-gray-700 transition-colors" },
                                    React.createElement("span", { className: "font-semibold text-sm text-gray-200" }, assignee),
                                    React.createElement("div", { className: "flex items-center gap-2" },
                                        React.createElement("span", { className: "text-xs bg-gray-600 text-indigo-300 font-bold px-2 py-0.5 rounded-full" }, tasksByAssignee[assignee].length),
                                        React.createElement(ChevronDown, { size: 16, className: `text-gray-400 transition-transform ${expandedAssignees[assignee] ? 'rotate-180' : ''}` })
                                    )
                                ),
                                expandedAssignees[assignee] && (
                                    React.createElement("div", { className: "p-2 border-t border-gray-600/50 space-y-1.5" },
                                        tasksByAssignee[assignee].map(task => (
                                            React.createElement("button", { key: task.id, onClick: () => onOpenTaskModal(task), className: "w-full text-left bg-gray-900/40 p-2 rounded-md hover:bg-gray-900/80 transition-colors" },
                                                React.createElement("div", { className: "flex justify-between items-center" },
                                                    React.createElement("p", { className: "font-semibold text-gray-200 text-xs truncate" }, task.title),
                                                    React.createElement("span", { className: `text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                          task.status === TaskStatus.DONE ? 'bg-green-500/20 text-green-400' :
                                                          task.status === TaskStatus.IN_PROGRESS ? 'bg-amber-500/20 text-amber-400' :
                                                          'bg-gray-600 text-gray-300'
                                                      }` }, task.status)
                                                ),
                                                React.createElement("p", { className: "text-gray-400 text-[10px] truncate mt-1" }, "For: ", itemDictionary.get(task.linkedItemId) || 'Unknown Item')
                                            )
                                        ))
                                    )
                                )
                            )
                        ))
                    )
                ),

                React.createElement("hr", { className: "border-gray-700 my-4" }),

                Object.entries(tasksByStatus).map(([status, tasksInStatus]) => (
                    React.createElement("div", { key: status, className: "mb-6" },
                        React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                            status === TaskStatus.TODO && React.createElement(Circle, { size: 14, className: "text-gray-400" }),
                            status === TaskStatus.IN_PROGRESS && React.createElement(Clock, { size: 14, className: "text-amber-400" }),
                            status === TaskStatus.DONE && React.createElement(CheckCircle, { size: 14, className: "text-green-400" }),
                            React.createElement("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider" }, status, " (", tasksInStatus.length, ")")
                        ),
                        React.createElement("div", { className: "space-y-1.5 text-sm" },
                            tasksInStatus.length > 0 ? tasksInStatus.map(task => (
                                React.createElement("button", { key: task.id, onClick: () => onOpenTaskModal(task), className: "w-full text-left bg-gray-700/50 p-2 rounded-md hover:bg-gray-700 transition-colors" },
                                    React.createElement("p", { className: "font-semibold text-gray-200 text-xs truncate" }, task.title),
                                    React.createElement("div", { className: "flex justify-between items-center mt-1" },
                                        React.createElement("p", { className: "text-gray-400 text-[10px] truncate" }, "For: ", itemDictionary.get(task.linkedItemId) || 'Unknown Item'),
                                        task.assignedTo && React.createElement("p", { className: "text-gray-400 text-[10px]" }, "@", task.assignedTo)
                                    )
                                )
                            )) : React.createElement("p", { className: "text-gray-500 text-xs text-center p-2" }, "No tasks in this category.")
                        )
                    )
                ))
            )
        )
    )
  );
};

export default EquipmentPanel;
