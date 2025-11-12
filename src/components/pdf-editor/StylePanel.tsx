import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RotateCcw, Move, Grid3x3 } from "lucide-react";

interface StylePanelProps {
  selectedElement: string | null;
  elementType: 'heading' | 'body' | 'table' | 'section' | null;
  level?: 1 | 2 | 3;
  currentStyles: any;
  onStyleChange: (path: string, value: any) => void;
  onPositionChange: (elementKey: string, x: number, y: number) => void;
  onReset: () => void;
}

export const StylePanel = ({
  selectedElement,
  elementType,
  level,
  currentStyles,
  onStyleChange,
  onPositionChange,
  onReset,
}: StylePanelProps) => {
  const position = selectedElement && currentStyles.positions?.[selectedElement] 
    ? currentStyles.positions[selectedElement] 
    : { x: 0, y: 0 };
  
  const gridSettings = currentStyles.grid || { size: 10, enabled: true, visible: true };
  if (!selectedElement || !elementType) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm text-center">
          Click on any element in the preview to edit its style
        </p>
      </div>
    );
  }

  const ColorPicker = ({ label, value, onChange }: { label: string; value: [number, number, number]; onChange: (rgb: [number, number, number]) => void }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={`#${value.map(v => v.toString(16).padStart(2, '0')).join('')}`}
          onChange={(e) => {
            const hex = e.target.value.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            onChange([r, g, b]);
          }}
          className="w-12 h-10 rounded cursor-pointer"
        />
        <Input
          value={`rgb(${value.join(', ')})`}
          readOnly
          className="flex-1"
        />
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Style Editor</h3>
          <p className="text-sm text-muted-foreground">
            {elementType} {level && `(H${level})`}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onReset} title="Reset to default">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <Separator />

      {/* Grid Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-4 h-4" />
          <h4 className="font-medium">Grid & Snapping</h4>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="snap-to-grid" className="cursor-pointer">Enable Snap to Grid</Label>
          <Switch
            id="snap-to-grid"
            checked={gridSettings.enabled}
            onCheckedChange={(checked) => onStyleChange('grid.enabled', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-grid" className="cursor-pointer">Show Grid Lines</Label>
          <Switch
            id="show-grid"
            checked={gridSettings.visible}
            onCheckedChange={(checked) => onStyleChange('grid.visible', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Grid Size: {gridSettings.size}px</Label>
          <Slider
            value={[gridSettings.size]}
            onValueChange={(value) => onStyleChange('grid.size', value[0])}
            min={5}
            max={50}
            step={5}
          />
          <p className="text-xs text-muted-foreground">
            Adjust the spacing between grid lines
          </p>
        </div>
      </div>

      <Separator />

      {/* Position */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4" />
          <h4 className="font-medium">Position</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag the element in the preview or use the controls below
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>X Position</Label>
            <Input
              type="number"
              value={Math.round(position.x)}
              onChange={(e) => selectedElement && onPositionChange(selectedElement, Number(e.target.value), position.y)}
              step={gridSettings.enabled ? gridSettings.size : 1}
            />
          </div>
          <div className="space-y-2">
            <Label>Y Position</Label>
            <Input
              type="number"
              value={Math.round(position.y)}
              onChange={(e) => selectedElement && onPositionChange(selectedElement, position.x, Number(e.target.value))}
              step={gridSettings.enabled ? gridSettings.size : 1}
            />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => selectedElement && onPositionChange(selectedElement, 0, 0)}
        >
          Reset Position
        </Button>
      </div>

      <Separator />

      {/* Typography */}
      {(elementType === 'heading' || elementType === 'body') && (
        <div className="space-y-4">
          <h4 className="font-medium">Typography</h4>
          
          <div className="space-y-2">
            <Label>Font Family</Label>
            <Select
              value={elementType === 'heading' ? currentStyles.typography.headingFont : currentStyles.typography.bodyFont}
              onValueChange={(value) => onStyleChange(elementType === 'heading' ? 'typography.headingFont' : 'typography.bodyFont', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="helvetica">Helvetica</SelectItem>
                <SelectItem value="times">Times New Roman</SelectItem>
                <SelectItem value="courier">Courier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {elementType === 'heading' && level && (
            <div className="space-y-2">
              <Label>Font Size: {currentStyles.typography[`h${level}Size`]}px</Label>
              <Slider
                value={[currentStyles.typography[`h${level}Size`]]}
                onValueChange={(value) => onStyleChange(`typography.h${level}Size`, value[0])}
                min={10}
                max={32}
                step={1}
              />
            </div>
          )}

          {elementType === 'body' && (
            <div className="space-y-2">
              <Label>Font Size: {currentStyles.typography.bodySize}px</Label>
              <Slider
                value={[currentStyles.typography.bodySize]}
                onValueChange={(value) => onStyleChange('typography.bodySize', value[0])}
                min={8}
                max={16}
                step={1}
              />
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Colors */}
      {(elementType === 'heading' || elementType === 'body') && (
        <div className="space-y-4">
          <h4 className="font-medium">Colors</h4>
          
          {elementType === 'heading' && (
            <ColorPicker
              label="Heading Color"
              value={currentStyles.colors.primary}
              onChange={(rgb) => onStyleChange('colors.primary', rgb)}
            />
          )}

          {elementType === 'body' && (
            <ColorPicker
              label="Text Color"
              value={currentStyles.colors.text}
              onChange={(rgb) => onStyleChange('colors.text', rgb)}
            />
          )}
        </div>
      )}

      {/* Table Styles */}
      {elementType === 'table' && (
        <div className="space-y-4">
          <h4 className="font-medium">Table Styling</h4>
          
          <ColorPicker
            label="Header Background"
            value={currentStyles.tables.headerBg}
            onChange={(rgb) => onStyleChange('tables.headerBg', rgb)}
          />

          <ColorPicker
            label="Header Text"
            value={currentStyles.tables.headerText}
            onChange={(rgb) => onStyleChange('tables.headerText', rgb)}
          />

          <ColorPicker
            label="Alternate Row"
            value={currentStyles.tables.alternateRowBg}
            onChange={(rgb) => onStyleChange('tables.alternateRowBg', rgb)}
          />

          <div className="space-y-2">
            <Label>Font Size: {currentStyles.tables.fontSize}px</Label>
            <Slider
              value={[currentStyles.tables.fontSize]}
              onValueChange={(value) => onStyleChange('tables.fontSize', value[0])}
              min={7}
              max={12}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Cell Padding: {currentStyles.tables.cellPadding}px</Label>
            <Slider
              value={[currentStyles.tables.cellPadding]}
              onValueChange={(value) => onStyleChange('tables.cellPadding', value[0])}
              min={1}
              max={8}
              step={1}
            />
          </div>
        </div>
      )}

      <Separator />

      {/* Spacing */}
      <div className="space-y-4">
        <h4 className="font-medium">Spacing</h4>
        
        <div className="space-y-2">
          <Label>Section Spacing: {currentStyles.spacing.sectionSpacing}px</Label>
          <Slider
            value={[currentStyles.spacing.sectionSpacing]}
            onValueChange={(value) => onStyleChange('spacing.sectionSpacing', value[0])}
            min={5}
            max={30}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label>Paragraph Spacing: {currentStyles.spacing.paragraphSpacing}px</Label>
          <Slider
            value={[currentStyles.spacing.paragraphSpacing]}
            onValueChange={(value) => onStyleChange('spacing.paragraphSpacing', value[0])}
            min={2}
            max={15}
            step={1}
          />
        </div>
      </div>
    </div>
  );
};
