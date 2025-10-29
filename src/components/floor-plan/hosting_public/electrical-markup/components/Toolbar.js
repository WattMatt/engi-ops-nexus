import React, { useMemo, useState } from 'react';
import { MousePointer, Hand, Ruler, Route, Layers, Save, FolderOpen, Network, Shield, Server, RotateCw, Printer, Square, LayoutGrid, Sun, Magnet, LogIn, LogOut, Cloud, User as UserIcon, Sparkles, Wrench, Edit, ShieldQuestion, Power, Plug, Undo2, Redo2 } from 'lucide-react';
import { Tool, DesignPurpose, MARKUP_TOOL_CATEGORIES } from '../types.js';
import { EquipmentIcon } from './EquipmentIcon.js';

const GlobalToolButton = ({ icon: Icon, label, onClick, disabled }) => (
  React.createElement("button", {
    onClick: onClick,
    disabled: disabled,
    className: `flex items-center w-full text-left p-2.5 rounded-md transition-colors duration-200 hover:bg-gray-700 text-gray-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    title: label
  },
    React.createElement(Icon, { className: "h-5 w-5 mr-3 flex-shrink-0" }),
    React.createElement("span", { className: "flex-grow text-sm font-medium" }, label)
  )
);


const MarkupToolButton = ({ icon: Icon, label, isActive, onClick, badge, disabled }) => (
  React.createElement("button", {
    onClick: onClick,
    disabled: disabled,
    className: `flex items-center w-full text-left p-2.5 rounded-md transition-colors duration-200 ${
      isActive ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-700 text-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    title: label
  },
    React.createElement(Icon, { className: "h-5 w-5 mr-3 flex-shrink-0" }),
    React.createElement("span", { className: "flex-grow text-sm font-medium" }, label),
    badge && React.createElement("span", { className: "text-xs bg-gray-600 text-indigo-300 font-bold px-2 py-0.5 rounded-full" }, badge)
  )
);


const toolIconMap = {
    [Tool.SELECT]: MousePointer, [Tool.PAN]: Hand, [Tool.SCALE]: Ruler, 
    [Tool.LINE_MV]: Route, [Tool.LINE_LV]: Route, [Tool.LINE_DC]: Route, [Tool.ZONE]: Layers,
    [Tool.TOOL_TELKOM_BASKET]: Network, [Tool.TOOL_SECURITY_BASKET]: Shield, [Tool.TOOL_CABLE_TRAY]: Server,
    [Tool.TOOL_SLEEVES]: Route, [Tool.TOOL_POWERSKIRTING]: Route,
    [Tool.TOOL_P2000_TRUNKING]: Route, [Tool.TOOL_P8000_TRUNKING]: Route, [Tool.TOOL_P9000_TRUNKING]: Route,
    [Tool.TOOL_ROOF_MASK]: Square, [Tool.TOOL_PV_ARRAY]: LayoutGrid,
};

const categoryLabels = {
    general: { label: 'General', icon: Wrench },
    drawing: { label: 'Drawing', icon: Edit },
    equipment: { label: 'Equipment', icon: Power },
    containment: { label: 'Containment', icon: Server },
    lighting_sockets: { label: 'Lighting & Sockets', icon: Plug },
    other_equipment: { label: 'Other', icon: ShieldQuestion },
};

const Toolbar = ({ 
  activeTool, onToolSelect, onFileChange, onSaveToCloud, isSaving, onLoadFromCloud, onPrint, isPdfLoaded,
  placementRotation, onRotationChange, purposeConfig, isPvDesignReady, isSnappingEnabled, setIsSnappingEnabled,
  onGenerateBoq, isFirebaseAvailable, user, onSignIn, onSignOut,
  onUndo, onRedo, canUndo, canRedo
}) => {
  const [activeMarkupTab, setActiveMarkupTab] = useState('general');
  
  const isPlacementToolActive = purposeConfig && (Object.values(purposeConfig.equipmentToToolMap).includes(activeTool) || activeTool === Tool.TOOL_PV_ARRAY);

  const handleRotation = () => onRotationChange(prev => (prev + 45) % 360);

  const allPurposeTools = useMemo(() => {
    if (!purposeConfig) return new Set();
    const equipmentTools = purposeConfig.availableEquipment
        .map(eq => purposeConfig.equipmentToToolMap[eq])
        .filter((t) => !!t);

    return new Set([
        Tool.SELECT, Tool.PAN,
        ...purposeConfig.availableDrawingTools,
        ...equipmentTools
    ]);
  }, [purposeConfig]);

  const categorizedTools = useMemo(() => {
    if (!purposeConfig) return {};
    const result = {};

    for (const tool of allPurposeTools) {
        const category = purposeConfig.toolCategories[tool];
        if (category) {
            if (!result[category]) {
                result[category] = [];
            }
            if(!result[category].includes(tool)){
                result[category].push(tool);
            }
        }
    }
    return result;
  }, [purposeConfig, allPurposeTools]);

  return (
    React.createElement("aside", { className: "w-72 bg-gray-800 p-4 flex flex-col space-y-4 overflow-y-auto shadow-2xl z-10" },
      /* --- Global Header & Actions --- */
      React.createElement("div", null,
        React.createElement("h1", { className: "text-xl font-bold text-white mb-2" }, "Floor Plan Markup"),
        React.createElement("p", { className: "text-sm text-indigo-300 h-5" }, purposeConfig?.label || '')
      ),

      React.createElement("div", { className: "space-y-2" },
        React.createElement("label", { htmlFor: "pdf-upload", className: "flex items-center w-full text-left p-2.5 rounded-md transition-colors duration-200 hover:bg-gray-700 text-gray-300 cursor-pointer" },
            React.createElement(FolderOpen, { className: "h-5 w-5 mr-3 flex-shrink-0" }),
            React.createElement("span", { className: "flex-grow text-sm font-medium" }, "Load PDF")
        ),
        React.createElement("input", { id: "pdf-upload", type: "file", className: "hidden", onChange: onFileChange, accept: ".pdf" }),
        
        React.createElement("hr", { className: "border-gray-600" }),
        isFirebaseAvailable ? (
          React.createElement(React.Fragment, null,
            user ? (
              React.createElement(React.Fragment, null,
                  React.createElement("div", { className: "flex items-center w-full text-left p-2 rounded-md bg-gray-700/50" },
                      React.createElement("img", { src: user.photoURL || undefined, alt: "user", className: "h-6 w-6 rounded-full mr-3" }),
                      React.createElement("span", { className: "flex-grow text-sm font-medium text-gray-200 truncate", title: user.displayName || 'User' }, user.displayName || 'Logged In'),
                      React.createElement("button", { onClick: onSignOut, title: "Sign Out" },
                          React.createElement(LogOut, { className: "h-5 w-5 text-gray-400 hover:text-white" })
                      )
                  ),
                  React.createElement(GlobalToolButton, { icon: Cloud, label: isSaving ? "Saving..." : "Save to Cloud", onClick: onSaveToCloud, disabled: !isPdfLoaded || isSaving }),
                  React.createElement(GlobalToolButton, { icon: FolderOpen, label: "Load from Cloud", onClick: onLoadFromCloud })
              )
            ) : (
              React.createElement(GlobalToolButton, { icon: LogIn, label: "Sign in with Google", onClick: onSignIn })
            )
          )
        ) : (
            React.createElement("div", { className: "p-2.5 rounded-md bg-gray-700/50 text-gray-400 text-xs" },
                "Cloud features are disabled. This widget must be hosted to connect to a Firebase project."
            )
        ),
        React.createElement("hr", { className: "border-gray-600" }),

        React.createElement(GlobalToolButton, { icon: Printer, label: "Export as PDF", onClick: onPrint, disabled: !isPdfLoaded }),
        React.createElement(GlobalToolButton, { icon: Sparkles, label: "Generate BoQ (AI)", onClick: onGenerateBoq, disabled: !isPdfLoaded })
      ),
      
      /* --- Markup Tools --- */
      isPdfLoaded && purposeConfig && (
        React.createElement("div", { className: "flex-grow flex flex-col min-h-0" },
          React.createElement("h2", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2" }, "Markup Tools"),
          
          /* Tab Navigation */
          React.createElement("nav", { className: "flex-shrink-0 grid grid-cols-3 gap-1 mb-3" },
            MARKUP_TOOL_CATEGORIES.map(cat => {
              const categoryInfo = categoryLabels[cat];
              const hasTools = (categorizedTools[cat]?.length ?? 0) > 0 || (cat === 'general');
              if (!hasTools) return null;

              return (
                React.createElement("button", {
                  key: cat,
                  onClick: () => setActiveMarkupTab(cat),
                  className: `flex flex-col items-center justify-center p-2 rounded-md text-xs font-medium transition-colors duration-200 focus:outline-none ${
                      activeMarkupTab === cat ? 'bg-indigo-600 text-white' : 'bg-gray-700/60 hover:bg-gray-700 text-gray-300'
                  }`
                },
                  React.createElement(categoryInfo.icon, { className: "h-4 w-4 mb-1" }),
                  React.createElement("span", null, categoryInfo.label)
                )
              );
            })
          ),

          /* Tab Content */
          React.createElement("div", { className: "space-y-1 flex-grow overflow-y-auto pr-1" },
            activeMarkupTab === 'general' && (
              React.createElement(React.Fragment, null,
                React.createElement(MarkupToolButton, { icon: Undo2, label: "Undo (Ctrl+Z)", isActive: false, onClick: onUndo, disabled: !canUndo }),
                React.createElement(MarkupToolButton, { icon: Redo2, label: "Redo (Ctrl+Y)", isActive: false, onClick: onRedo, disabled: !canRedo }),
                React.createElement("hr", { className: "border-gray-700 my-2" })
              )
            ),

            categorizedTools[activeMarkupTab]?.map(toolId => {
              const equipmentType = Object.entries(purposeConfig.equipmentToToolMap).find(([, t]) => t === toolId)?.[0];
              
              if (equipmentType) {
                 return (
                  React.createElement(MarkupToolButton, {
                    key: toolId,
                    onClick: () => onToolSelect(toolId),
                    isActive: activeTool === toolId,
                    icon: () => React.createElement(EquipmentIcon, { type: equipmentType, className: "h-5 w-5 mr-3 flex-shrink-0" }),
                    label: equipmentType,
                    disabled: !isPvDesignReady
                  })
                 );
              }

              const Icon = toolIconMap[toolId] || Layers;
              const label = purposeConfig.toolLabels[toolId] || toolId.replace(/_/g, ' ');
              const isDisabled = !isPvDesignReady && toolId !== Tool.SCALE && toolId !== Tool.PAN && toolId !== Tool.SELECT;
              return (
                  React.createElement(MarkupToolButton, { key: toolId, icon: Icon, label: label, isActive: activeTool === toolId, onClick: () => onToolSelect(toolId), disabled: isDisabled })
              );
            }),

            /* Conditional General Tools */
            activeMarkupTab === 'general' && (
              React.createElement(React.Fragment, null,
                 purposeConfig.label === DesignPurpose.PV_DESIGN && (
                  React.createElement(MarkupToolButton, {
                      icon: Magnet, label: "Toggle Snapping", isActive: isSnappingEnabled,
                      onClick: () => setIsSnappingEnabled(prev => !prev), disabled: !isPvDesignReady
                  })
                ),
                isPlacementToolActive && (
                  React.createElement(MarkupToolButton, { icon: RotateCw, label: "Rotate Symbol", isActive: false, onClick: handleRotation, badge: `${placementRotation}°` })
                )
              )
            )
          )
        )
      )
    )
  );
};

export default Toolbar;
