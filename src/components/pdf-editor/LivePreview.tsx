import { EditableElement } from "./EditableElement";

interface LivePreviewProps {
  settings: any;
  selectedElement: string | null;
  onSelectElement: (key: string) => void;
  onPositionChange: (styleKey: string, x: number, y: number) => void;
  reportType: string;
}

export const LivePreview = ({
  settings,
  selectedElement,
  onSelectElement,
  onPositionChange,
  reportType,
}: LivePreviewProps) => {
  const margins = settings.layout.margins;
  const gridSettings = settings.grid || { size: 10, enabled: true, visible: true };

  // Generate grid pattern
  const generateGrid = () => {
    if (!gridSettings.visible) return null;

    const gridSize = gridSettings.size;
    const width = 210; // A4 width in mm
    const height = 297; // A4 height in mm
    
    // Convert mm to pixels (assuming 96 DPI)
    const mmToPx = 3.7795275591;
    const widthPx = width * mmToPx;
    const heightPx = height * mmToPx;

    const lines = [];
    
    // Vertical lines
    for (let x = 0; x <= widthPx; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={heightPx}
          stroke="rgba(200, 200, 200, 0.3)"
          strokeWidth="0.5"
        />
      );
    }
    
    // Horizontal lines
    for (let y = 0; y <= heightPx; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={widthPx}
          y2={y}
          stroke="rgba(200, 200, 200, 0.3)"
          strokeWidth="0.5"
        />
      );
    }

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        {lines}
      </svg>
    );
  };

  return (
    <div 
      className="bg-white shadow-lg mx-auto relative"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
      }}
    >
      {generateGrid()}
      {/* Cover Page Preview */}
      <div className="mb-8 relative">
        <EditableElement
          type="heading"
          level={1}
          styleKey="cover-title"
          currentStyles={settings}
          isSelected={selectedElement === 'cover-title'}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
        >
          <div className="text-center mb-6">PROJECT COST REPORT</div>
        </EditableElement>
        
        <EditableElement
          type="body"
          styleKey="cover-subtitle"
          currentStyles={settings}
          isSelected={selectedElement === 'cover-subtitle'}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
        >
          <div className="text-center">Sample Project Name</div>
        </EditableElement>
      </div>

      {/* Executive Summary Section */}
      <div className="mb-8 relative">
        <EditableElement
          type="heading"
          level={1}
          styleKey="section-heading"
          currentStyles={settings}
          isSelected={selectedElement === 'section-heading'}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
        >
          <div className="mb-4">EXECUTIVE SUMMARY</div>
        </EditableElement>

        <EditableElement
          type="body"
          styleKey="section-body"
          currentStyles={settings}
          isSelected={selectedElement === 'section-body'}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
        >
          <div className="mb-4">
            This report provides a comprehensive overview of project costs, including detailed breakdowns
            by category and line items. All values are calculated based on current quantities and rates.
          </div>
        </EditableElement>

        <EditableElement
          type="heading"
          level={2}
          styleKey="subsection-heading"
          currentStyles={settings}
          isSelected={selectedElement === 'subsection-heading'}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
        >
          <div className="mb-3">Key Performance Indicators</div>
        </EditableElement>

        <EditableElement
          type="body"
          styleKey="kpi-text"
          currentStyles={settings}
          isSelected={selectedElement === 'kpi-text'}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="font-semibold">Total Project Value:</div>
              <div>R 1,234,567.89</div>
            </div>
            <div>
              <div className="font-semibold">Total Categories:</div>
              <div>5</div>
            </div>
          </div>
        </EditableElement>
      </div>

      {/* Sample Table */}
      <div className="mb-8 relative">
        <EditableElement
          type="heading"
          level={2}
          styleKey="table-heading"
          currentStyles={settings}
          isSelected={selectedElement === 'table-heading'}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
        >
          <div className="mb-3">Cost Breakdown</div>
        </EditableElement>

        <EditableElement
          type="table"
          styleKey="sample-table"
          currentStyles={settings}
          isSelected={selectedElement === 'sample-table'}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
        >
          <table 
            className="w-full border-collapse"
            style={{
              fontSize: `${settings.tables.fontSize}px`,
              fontFamily: settings.typography.bodyFont,
            }}
          >
            <thead>
              <tr style={{ 
                backgroundColor: `rgb(${settings.tables.headerBg.join(',')})`,
                color: `rgb(${settings.tables.headerText.join(',')})`,
              }}>
                <th style={{ padding: `${settings.tables.cellPadding}px`, textAlign: 'left', border: settings.tables.showGridLines ? `1px solid rgb(${settings.tables.borderColor.join(',')})` : 'none' }}>Category</th>
                <th style={{ padding: `${settings.tables.cellPadding}px`, textAlign: 'right', border: settings.tables.showGridLines ? `1px solid rgb(${settings.tables.borderColor.join(',')})` : 'none' }}>Amount</th>
                <th style={{ padding: `${settings.tables.cellPadding}px`, textAlign: 'right', border: settings.tables.showGridLines ? `1px solid rgb(${settings.tables.borderColor.join(',')})` : 'none' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {['Electrical', 'Plumbing', 'HVAC', 'Finishes'].map((cat, idx) => (
                <tr 
                  key={cat}
                  style={{ 
                    backgroundColor: idx % 2 === 1 ? `rgb(${settings.tables.alternateRowBg.join(',')})` : 'transparent',
                  }}
                >
                  <td style={{ padding: `${settings.tables.cellPadding}px`, border: settings.tables.showGridLines ? `1px solid rgb(${settings.tables.borderColor.join(',')})` : 'none' }}>{cat}</td>
                  <td style={{ padding: `${settings.tables.cellPadding}px`, textAlign: 'right', border: settings.tables.showGridLines ? `1px solid rgb(${settings.tables.borderColor.join(',')})` : 'none' }}>R {(250000 * (idx + 1)).toLocaleString()}</td>
                  <td style={{ padding: `${settings.tables.cellPadding}px`, textAlign: 'right', border: settings.tables.showGridLines ? `1px solid rgb(${settings.tables.borderColor.join(',')})` : 'none' }}>{(25 * (idx + 1))}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </EditableElement>
      </div>
    </div>
  );
};
