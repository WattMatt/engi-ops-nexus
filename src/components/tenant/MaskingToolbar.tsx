import React from 'react';
import { MousePointer, Hand, Ruler, Pencil, Square, Save, FolderOpen, Eye, Upload, SaveAll } from 'lucide-react';

interface ToolbarProps {
  activeTool: 'select' | 'pan' | 'scale' | 'zone';
  onToolSelect: (tool: 'select' | 'pan' | 'scale' | 'zone') => void;
  onUpload: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onLoad?: () => void;
  onPreview?: () => void;
  isPdfLoaded: boolean;
  scaleSet: boolean;
  isSaving?: boolean;
}

interface ToolButtonProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon: Icon, label, isActive, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center w-full text-left p-2.5 rounded-md transition-colors duration-200 ${
      isActive ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-accent text-foreground'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    title={label}
  >
    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
    <span className="flex-grow text-sm font-medium">{label}</span>
  </button>
);

const ActionButton: React.FC<Pick<ToolButtonProps, 'icon' | 'label' | 'onClick' | 'disabled'>> = ({ 
  icon: Icon, 
  label, 
  onClick, 
  disabled 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center w-full text-left p-2.5 rounded-md transition-colors duration-200 text-foreground ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'
    }`}
    title={label}
  >
    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
    <span className="flex-grow text-sm font-medium">{label}</span>
  </button>
);

export const MaskingToolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolSelect,
  onUpload,
  onSave,
  onSaveAs,
  onLoad,
  onPreview,
  isPdfLoaded,
  scaleSet,
  isSaving
}) => {
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Floor Plan Tools</h2>
      </div>

      {/* File Actions */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">File</h3>
        <div className="space-y-1">
          <ActionButton
            icon={Upload}
            label="Upload PDF"
            onClick={onUpload}
          />
          {onSave && (
            <ActionButton
              icon={Save}
              label={isSaving ? "Saving..." : "Save"}
              onClick={onSave}
              disabled={!isPdfLoaded || isSaving}
            />
          )}
          {onSaveAs && (
            <ActionButton
              icon={SaveAll}
              label={isSaving ? "Saving..." : "Save As Version"}
              onClick={onSaveAs}
              disabled={!isPdfLoaded || isSaving}
            />
          )}
          {onLoad && (
            <ActionButton
              icon={FolderOpen}
              label="Load Saved Plan"
              onClick={onLoad}
            />
          )}
          {onPreview && (
            <ActionButton
              icon={Eye}
              label="Preview"
              onClick={onPreview}
              disabled={!isPdfLoaded}
            />
          )}
        </div>
      </div>

      {/* Navigation Tools */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Navigation</h3>
        <div className="space-y-1">
          <ToolButton
            icon={MousePointer}
            label="Select"
            isActive={activeTool === 'select'}
            onClick={() => onToolSelect('select')}
            disabled={!isPdfLoaded}
          />
          <ToolButton
            icon={Hand}
            label="Pan"
            isActive={activeTool === 'pan'}
            onClick={() => onToolSelect('pan')}
            disabled={!isPdfLoaded}
          />
        </div>
      </div>

      {/* Drawing Tools */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Drawing</h3>
        <div className="space-y-1">
          <ToolButton
            icon={Ruler}
            label="Set Scale"
            isActive={activeTool === 'scale'}
            onClick={() => onToolSelect('scale')}
            disabled={!isPdfLoaded}
          />
          <ToolButton
            icon={Square}
            label="Draw Zone"
            isActive={activeTool === 'zone'}
            onClick={() => onToolSelect('zone')}
            disabled={!isPdfLoaded || !scaleSet}
          />
        </div>
      </div>

      {/* Instructions */}
      {isPdfLoaded && (
        <div className="p-3 mt-auto bg-muted/50">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Instructions</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            {activeTool === 'select' && <p>Click and drag to select items</p>}
            {activeTool === 'pan' && <p>Click and drag to pan the view. Use mouse wheel to zoom.</p>}
            {activeTool === 'scale' && <p>Click two points to set the scale reference line</p>}
            {activeTool === 'zone' && <p>Click to add points. Click the start point or press Enter to finish. Esc to cancel.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
