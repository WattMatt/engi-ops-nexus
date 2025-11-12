import { useState, useEffect } from "react";
import { EditableElement } from "./EditableElement";
import { AlignmentGuides, calculateAlignmentGuides, getElementBounds, ElementBounds } from "./AlignmentGuides";
import { PDFTextExtractor, ExtractedTextItem } from "./PDFTextExtractor";
import { EditablePDFText } from "./EditablePDFText";
import { PDFVisualExtractor, ExtractedImage, ExtractedShape } from "./PDFVisualExtractor";
import { EditablePDFImage } from "./EditablePDFImage";
import { EditablePDFShape } from "./EditablePDFShape";
import { usePDFEditorHistory } from "@/hooks/usePDFEditorHistory";

interface LivePreviewProps {
  settings: any;
  selectedElements: string[];
  onSelectElement: (key: string, isCtrlKey: boolean) => void;
  onPositionChange: (styleKey: string, x: number, y: number) => void;
  onGroupDrag: (deltaX: number, deltaY: number) => void;
  reportType: string;
  currentPage: number;
  pdfUrl?: string | null;
  enablePDFEditing?: boolean;
  onUndoRedoChange?: (canUndo: boolean, canRedo: boolean) => void;
  onColorChange?: (elementId: string, colorType: 'text' | 'stroke' | 'fill', color: string) => void;
  onElementsExtracted?: (elements: { text: any[]; images: any[]; shapes: any[] }) => void;
  addedElements?: { text: any[]; images: any[]; shapes: any[] };
}

// Define all available elements with their display names and default positions
const ELEMENT_DEFINITIONS = [
  { key: 'cover-title', name: 'Cover Title', type: 'heading', defaultX: 100, defaultY: 150, page: 1 },
  { key: 'cover-subtitle', name: 'Cover Subtitle', type: 'body', defaultX: 100, defaultY: 200, page: 1 },
  { key: 'section-heading', name: 'Section Heading', type: 'heading', defaultX: 50, defaultY: 100, page: 2 },
  { key: 'section-body', name: 'Section Body', type: 'body', defaultX: 50, defaultY: 140, page: 2 },
  { key: 'subsection-heading', name: 'Subsection Heading', type: 'heading', defaultX: 50, defaultY: 200, page: 2 },
  { key: 'kpi-text', name: 'KPI Text', type: 'body', defaultX: 50, defaultY: 240, page: 2 },
  { key: 'table-heading', name: 'Table Heading', type: 'heading', defaultX: 50, defaultY: 300, page: 2 },
  { key: 'sample-table', name: 'Sample Table', type: 'table', defaultX: 50, defaultY: 340, page: 2 },
];

export const LivePreview = ({
  settings,
  selectedElements,
  onSelectElement,
  onPositionChange,
  onGroupDrag,
  reportType,
  currentPage,
  pdfUrl,
  enablePDFEditing = true,
  onUndoRedoChange,
  onColorChange,
  onElementsExtracted,
  addedElements = { text: [], images: [], shapes: [] },
}: LivePreviewProps) => {
  const margins = settings.layout.margins;
  const gridSettings = settings.grid || { size: 10, enabled: true, visible: true };
  
  // Smart alignment guides state
  const [activeGuides, setActiveGuides] = useState<ReturnType<typeof calculateAlignmentGuides>>({
    guides: [],
    snapX: null,
    snapY: null,
  });
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  
  // PDF text extraction state
  const [extractedText, setExtractedText] = useState<ExtractedTextItem[]>([]);
  const [editedTextItems, setEditedTextItems] = useState<Map<string, string>>(new Map());
  const [scale] = useState(1.0);
  
  // PDF visual elements state
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [extractedShapes, setExtractedShapes] = useState<ExtractedShape[]>([]);

  // History management for undo/redo
  const history = usePDFEditorHistory({
    extractedText: [],
    editedTextItems: new Map(),
  });

  // Notify parent of combined color change handler
  useEffect(() => {
    if (onColorChange) {
      // Expose the combined handler to parent by replacing the callback
      // This allows StylePanel to call it directly
    }
  }, []);

  // Return color change handler via onElementsExtracted
  useEffect(() => {
    if (onElementsExtracted) {
      onElementsExtracted({
        text: extractedText,
        images: extractedImages,
        shapes: extractedShapes,
      });
    }
  }, [extractedText, extractedImages, extractedShapes]);

  // Expose undo/redo to parent
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history]);

  const handleUndo = () => {
    const previousState = history.undo();
    if (previousState) {
      setExtractedText(previousState.extractedText);
      setEditedTextItems(previousState.editedTextItems);
    }
  };

  const handleRedo = () => {
    const nextState = history.redo();
    if (nextState) {
      setExtractedText(nextState.extractedText);
      setEditedTextItems(nextState.editedTextItems);
    }
  };

  const handleDragStart = (styleKey: string, bounds: ElementBounds) => {
    setDraggingElement(styleKey);
  };

  const handleDragging = (styleKey: string, bounds: ElementBounds) => {
    // Get all other visible, unlocked elements' bounds on the current page
    const otherElements = ELEMENT_DEFINITIONS
      .filter(el => {
        const metadata = settings.elements?.[el.key] || { visible: true, locked: false, zIndex: 0, page: 1 };
        const elementPage = metadata.page || 1;
        return el.key !== styleKey && metadata.visible && !metadata.locked && elementPage === currentPage;
      })
      .map(el => {
        const pos = settings.positions?.[el.key] || { x: 0, y: 0 };
        const elementNode = document.querySelector(`[data-element-key="${el.key}"]`) as HTMLElement;
        const elementBounds = getElementBounds(pos, elementNode);
        return elementBounds ? { key: el.key, bounds: elementBounds } : null;
      })
      .filter((item): item is { key: string; bounds: ElementBounds } => item !== null);

    // Calculate guides and snap positions
    const result = calculateAlignmentGuides(bounds, otherElements);
    setActiveGuides(result);
  };

  const handleDragEnd = () => {
    setDraggingElement(null);
    setActiveGuides({ guides: [], snapX: null, snapY: null });
  };

  const handleTextExtracted = (items: ExtractedTextItem[]) => {
    console.log(`[LivePreview] Received ${items.length} extracted text items`);
    setExtractedText(items);
    
    if (items.length > 0) {
      history.pushState({
        extractedText: items,
        editedTextItems: new Map(),
      });
    }
    
    // Notify parent
    if (onElementsExtracted) {
      onElementsExtracted({
        text: items,
        images: extractedImages,
        shapes: extractedShapes,
      });
    }
  };

  const handleImagesExtracted = (images: ExtractedImage[]) => {
    console.log(`[LivePreview] Received ${images.length} extracted images`);
    setExtractedImages(images);
    
    // Notify parent
    if (onElementsExtracted) {
      onElementsExtracted({
        text: extractedText,
        images,
        shapes: extractedShapes,
      });
    }
  };

  const handleShapesExtracted = (shapes: ExtractedShape[]) => {
    console.log(`[LivePreview] Received ${shapes.length} extracted shapes`);
    setExtractedShapes(shapes);
    
    // Notify parent
    if (onElementsExtracted) {
      onElementsExtracted({
        text: extractedText,
        images: extractedImages,
        shapes,
      });
    }
  };

  const handleImagePositionChange = (id: string, x: number, y: number) => {
    setExtractedImages(prev =>
      prev.map(img => (img.id === id ? { ...img, x, y } : img))
    );
  };

  const handleImageSizeChange = (id: string, width: number, height: number) => {
    setExtractedImages(prev =>
      prev.map(img => (img.id === id ? { ...img, width, height } : img))
    );
  };

  const handleImageDelete = (id: string) => {
    setExtractedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleShapeSizeChange = (id: string, width: number, height: number) => {
    setExtractedShapes(prev =>
      prev.map(shape => (shape.id === id ? { ...shape, width, height } : shape))
    );
  };

  const handleShapeDelete = (id: string) => {
    setExtractedShapes(prev => prev.filter(shape => shape.id !== id));
  };

  const handleTextColorChange = (id: string, color: string) => {
    setExtractedText(prev =>
      prev.map(item => (item.id === id ? { ...item, color } : item))
    );
  };

  const handleShapeStrokeColorChange = (id: string, color: string) => {
    setExtractedShapes(prev =>
      prev.map(shape => (shape.id === id ? { ...shape, strokeColor: color } : shape))
    );
  };

  const handleShapeFillColorChange = (id: string, color: string) => {
    setExtractedShapes(prev =>
      prev.map(shape => (shape.id === id ? { ...shape, fillColor: color } : shape))
    );
  };

  // Combined color change handler for parent
  const handleElementColorChange = (elementId: string, colorType: 'text' | 'stroke' | 'fill', color: string) => {
    if (colorType === 'text') {
      handleTextColorChange(elementId, color);
    } else if (colorType === 'stroke') {
      handleShapeStrokeColorChange(elementId, color);
    } else if (colorType === 'fill') {
      handleShapeFillColorChange(elementId, color);
    }
    
    // Notify parent
    if (onColorChange) {
      onColorChange(elementId, colorType, color);
    }
  };

  const handlePDFTextChange = (id: string, newText: string) => {
    const newMap = new Map(editedTextItems);
    newMap.set(id, newText);
    setEditedTextItems(newMap);
    
    // Push to history
    history.pushState({
      extractedText: [...extractedText],
      editedTextItems: new Map(newMap),
    });
    
    console.log('Text changed:', id, newText);
  };

  const handlePDFTextPosition = (id: string, x: number, y: number) => {
    console.log('Text position changed:', id, x, y);
    
    // Update position in extracted text
    const newExtractedText = extractedText.map(item =>
      item.id === id ? { ...item, x, y } : item
    );
    setExtractedText(newExtractedText);
    
    // Push to history
    history.pushState({
      extractedText: newExtractedText,
      editedTextItems: new Map(editedTextItems),
    });
  };

  // Filter elements for current page and ensure they have positions
  const visibleElements = ELEMENT_DEFINITIONS.filter(el => {
    const metadata = settings.elements?.[el.key] || { visible: true, locked: false, zIndex: 0, page: el.page || 1 };
    const elementPage = metadata.page || el.page || 1;
    return elementPage === currentPage && metadata.visible;
  });

  // Helper to get element position with fallback to default
  const getElementPosition = (elementDef: typeof ELEMENT_DEFINITIONS[0]) => {
    const storedPos = settings.positions?.[elementDef.key];
    if (storedPos) return storedPos;
    
    // Return default position if none stored
    return { 
      x: elementDef.defaultX, 
      y: elementDef.defaultY,
      page: elementDef.page 
    };
  };

  // Helper to check if element should render on current page
  const isElementOnPage = (elementKey: string, defaultPage: number) => {
    const metadata = settings.elements?.[elementKey] || { visible: true, locked: false, zIndex: 0, page: defaultPage };
    const elementPage = metadata.page || defaultPage;
    return elementPage === currentPage && metadata.visible;
  };

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
      className="mx-auto relative"
      style={{
        width: enablePDFEditing ? '793.7px' : '210mm', // Match PDF preview width or A4
        minHeight: enablePDFEditing ? '1122.52px' : '297mm', // Match PDF preview height or A4
        padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
        background: enablePDFEditing ? 'transparent' : 'white', // Transparent when overlaying PDF
      }}
    >
      {generateGrid()}
      
      {/* PDF Text Extractor */}
      {enablePDFEditing && pdfUrl && (
        <>
          <PDFTextExtractor
            pdfUrl={pdfUrl}
            currentPage={currentPage}
            onTextExtracted={handleTextExtracted}
            scale={1.0}
          />
          <PDFVisualExtractor
            pdfUrl={pdfUrl}
            currentPage={currentPage}
            onImagesExtracted={handleImagesExtracted}
            onShapesExtracted={handleShapesExtracted}
            scale={1.0}
          />
        </>
      )}

      {/* Alignment Guides Overlay */}
      <AlignmentGuides guides={activeGuides.guides} />

      {/* Debug info */}
      {enablePDFEditing && (extractedText.length > 0 || extractedImages.length > 0 || extractedShapes.length > 0) && (
        <div className="absolute top-2 right-2 bg-background/90 border rounded p-2 text-xs z-50 pointer-events-none">
          <div className="font-semibold">Editable Elements:</div>
          <div className="text-muted-foreground">
            Text: {extractedText.length} | 
            Images: {extractedImages.length} | 
            Shapes: {extractedShapes.length}
          </div>
          <div className="text-muted-foreground mt-1">Double-click text to edit</div>
        </div>
      )}

      {/* Render extracted and added text elements */}
      {extractedText.map((item) => (
        <EditablePDFText
          key={item.id}
          item={item}
          isSelected={selectedElements.includes(item.id)}
          scale={1.0}
          onSelect={(id, isCtrlKey) => onSelectElement?.(id, isCtrlKey)}
          onTextChange={handlePDFTextChange}
          onPositionChange={handlePDFTextPosition}
          onColorChange={(id, color) => handleElementColorChange(id, 'text', color)}
        />
      ))}
      {addedElements.text.filter(el => el.page === currentPage).map((item) => (
        <EditablePDFText
          key={item.id}
          item={item}
          isSelected={selectedElements.includes(item.id)}
          scale={1.0}
          onSelect={(id, isCtrlKey) => onSelectElement?.(id, isCtrlKey)}
          onTextChange={handlePDFTextChange}
          onPositionChange={handlePDFTextPosition}
          onColorChange={(id, color) => handleElementColorChange(id, 'text', color)}
        />
      ))}

      {/* Render extracted and added images */}
      {extractedImages.map((image) => (
        <EditablePDFImage
          key={image.id}
          item={image}
          isSelected={selectedElements.includes(image.id)}
          onSelect={(id, isCtrlKey) => onSelectElement?.(id, isCtrlKey)}
          onPositionChange={handleImagePositionChange}
          onSizeChange={handleImageSizeChange}
          onDelete={handleImageDelete}
        />
      ))}
      {addedElements.images.filter(el => el.page === currentPage).map((image) => (
        <EditablePDFImage
          key={image.id}
          item={image}
          isSelected={selectedElements.includes(image.id)}
          onSelect={(id, isCtrlKey) => onSelectElement?.(id, isCtrlKey)}
          onPositionChange={handleImagePositionChange}
          onSizeChange={handleImageSizeChange}
          onDelete={handleImageDelete}
        />
      ))}

      {/* Render extracted and added shapes */}
      {extractedShapes.map((shape) => (
        <EditablePDFShape
          key={shape.id}
          item={shape}
          isSelected={selectedElements.includes(shape.id)}
          onSelect={(id, isCtrlKey) => onSelectElement?.(id, isCtrlKey)}
          onPositionChange={(id, x, y) => {
            setExtractedShapes(prev =>
              prev.map(s => (s.id === id ? { ...s, x, y } : s))
            );
          }}
          onDelete={handleShapeDelete}
          onStrokeColorChange={(id, color) => handleElementColorChange(id, 'stroke', color)}
          onFillColorChange={(id, color) => handleElementColorChange(id, 'fill', color)}
        />
      ))}
      {addedElements.shapes.filter(el => el.page === currentPage).map((shape) => (
        <EditablePDFShape
          key={shape.id}
          item={shape}
          isSelected={selectedElements.includes(shape.id)}
          onSelect={(id, isCtrlKey) => onSelectElement?.(id, isCtrlKey)}
          onPositionChange={(id, x, y) => {
            setExtractedShapes(prev =>
              prev.map(s => (s.id === id ? { ...s, x, y } : s))
            );
          }}
          onDelete={handleShapeDelete}
          onStrokeColorChange={(id, color) => handleElementColorChange(id, 'stroke', color)}
          onFillColorChange={(id, color) => handleElementColorChange(id, 'fill', color)}
        />
      ))}

      {/* Render all visible elements for current page - hide when PDF editing is enabled and elements are extracted */}
      {!(enablePDFEditing && (extractedText.length > 0 || extractedImages.length > 0 || extractedShapes.length > 0)) && visibleElements.length === 0 && (
        <div className="flex items-center justify-center h-[800px] text-muted-foreground">
          <p>No editable elements on page {currentPage}. Elements may need to be assigned to this page.</p>
        </div>
      )}

      {/* Cover Page - Page 1 - hide when PDF editing is enabled and elements are extracted */}
      {!(enablePDFEditing && (extractedText.length > 0 || extractedImages.length > 0 || extractedShapes.length > 0)) && isElementOnPage('cover-title', 1) && (
        <EditableElement
          type="heading"
          level={1}
          styleKey="cover-title"
          currentStyles={settings}
          isSelected={selectedElements.length === 1 && selectedElements[0] === 'cover-title'}
          isMultiSelected={selectedElements.length > 1 && selectedElements.includes('cover-title')}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
          onGroupDrag={onGroupDrag}
          onDragStart={handleDragStart}
          onDragging={handleDragging}
          onDragEnd={handleDragEnd}
          snapPosition={draggingElement === 'cover-title' ? { x: activeGuides.snapX, y: activeGuides.snapY } : undefined}
        >
          <div className="text-center text-4xl font-bold" data-element-key="cover-title">PROJECT COST REPORT</div>
        </EditableElement>
      )}
      
      {!(enablePDFEditing && (extractedText.length > 0 || extractedImages.length > 0 || extractedShapes.length > 0)) && isElementOnPage('cover-subtitle', 1) && (
        <EditableElement
          type="body"
          styleKey="cover-subtitle"
          currentStyles={settings}
          isSelected={selectedElements.length === 1 && selectedElements[0] === 'cover-subtitle'}
          isMultiSelected={selectedElements.length > 1 && selectedElements.includes('cover-subtitle')}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
          onGroupDrag={onGroupDrag}
          onDragStart={handleDragStart}
          onDragging={handleDragging}
          onDragEnd={handleDragEnd}
          snapPosition={draggingElement === 'cover-subtitle' ? { x: activeGuides.snapX, y: activeGuides.snapY } : undefined}
        >
          <div className="text-center text-xl" data-element-key="cover-subtitle">Sample Project Name</div>
        </EditableElement>
      )}

      {/* Content Pages - Page 2+ - hide when PDF editing is enabled and elements are extracted */}
      {!(enablePDFEditing && (extractedText.length > 0 || extractedImages.length > 0 || extractedShapes.length > 0)) && isElementOnPage('section-heading', 2) && (
        <EditableElement
          type="heading"
          level={1}
          styleKey="section-heading"
          currentStyles={settings}
          isSelected={selectedElements.length === 1 && selectedElements[0] === 'section-heading'}
          isMultiSelected={selectedElements.length > 1 && selectedElements.includes('section-heading')}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
          onGroupDrag={onGroupDrag}
          onDragStart={handleDragStart}
          onDragging={handleDragging}
          onDragEnd={handleDragEnd}
          snapPosition={draggingElement === 'section-heading' ? { x: activeGuides.snapX, y: activeGuides.snapY } : undefined}
        >
          <div className="text-2xl font-bold" data-element-key="section-heading">EXECUTIVE SUMMARY</div>
        </EditableElement>
      )}

      {!(enablePDFEditing && (extractedText.length > 0 || extractedImages.length > 0 || extractedShapes.length > 0)) && isElementOnPage('section-body', 2) && (
        <EditableElement
          type="body"
          styleKey="section-body"
          currentStyles={settings}
          isSelected={selectedElements.length === 1 && selectedElements[0] === 'section-body'}
          isMultiSelected={selectedElements.length > 1 && selectedElements.includes('section-body')}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
          onGroupDrag={onGroupDrag}
          onDragStart={handleDragStart}
          onDragging={handleDragging}
          onDragEnd={handleDragEnd}
          snapPosition={draggingElement === 'section-body' ? { x: activeGuides.snapX, y: activeGuides.snapY } : undefined}
        >
          <div data-element-key="section-body">
            This report provides a comprehensive overview of project costs, including detailed breakdowns
            by category and line items. All values are calculated based on current quantities and rates.
          </div>
        </EditableElement>
      )}

      {!(enablePDFEditing && (extractedText.length > 0 || extractedImages.length > 0 || extractedShapes.length > 0)) && isElementOnPage('subsection-heading', 2) && (
        <EditableElement
          type="heading"
          level={2}
          styleKey="subsection-heading"
          currentStyles={settings}
          isSelected={selectedElements.length === 1 && selectedElements[0] === 'subsection-heading'}
          isMultiSelected={selectedElements.length > 1 && selectedElements.includes('subsection-heading')}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
          onGroupDrag={onGroupDrag}
          onDragStart={handleDragStart}
          onDragging={handleDragging}
          onDragEnd={handleDragEnd}
          snapPosition={draggingElement === 'subsection-heading' ? { x: activeGuides.snapX, y: activeGuides.snapY } : undefined}
        >
          <div className="text-xl font-semibold" data-element-key="subsection-heading">Key Performance Indicators</div>
        </EditableElement>
      )}

      {!(enablePDFEditing && (extractedText.length > 0 || extractedImages.length > 0 || extractedShapes.length > 0)) && isElementOnPage('kpi-text', 2) && (
        <EditableElement
          type="body"
          styleKey="kpi-text"
          currentStyles={settings}
          isSelected={selectedElements.length === 1 && selectedElements[0] === 'kpi-text'}
          isMultiSelected={selectedElements.length > 1 && selectedElements.includes('kpi-text')}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
          onGroupDrag={onGroupDrag}
          onDragStart={handleDragStart}
          onDragging={handleDragging}
          onDragEnd={handleDragEnd}
          snapPosition={draggingElement === 'kpi-text' ? { x: activeGuides.snapX, y: activeGuides.snapY } : undefined}
        >
          <div className="grid grid-cols-2 gap-4" data-element-key="kpi-text">
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
      )}

      {!(enablePDFEditing && (extractedText.length > 0 || extractedImages.length > 0 || extractedShapes.length > 0)) && isElementOnPage('table-heading', 2) && (
        <EditableElement
          type="heading"
          level={2}
          styleKey="table-heading"
          currentStyles={settings}
          isSelected={selectedElements.length === 1 && selectedElements[0] === 'table-heading'}
          isMultiSelected={selectedElements.length > 1 && selectedElements.includes('table-heading')}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
          onGroupDrag={onGroupDrag}
          onDragStart={handleDragStart}
          onDragging={handleDragging}
          onDragEnd={handleDragEnd}
          snapPosition={draggingElement === 'table-heading' ? { x: activeGuides.snapX, y: activeGuides.snapY } : undefined}
        >
          <div className="text-xl font-semibold" data-element-key="table-heading">Cost Breakdown</div>
        </EditableElement>
      )}

      {!(enablePDFEditing && (extractedText.length > 0 || extractedImages.length > 0 || extractedShapes.length > 0)) && isElementOnPage('sample-table', 2) && (
        <EditableElement
          type="table"
          styleKey="sample-table"
          currentStyles={settings}
          isSelected={selectedElements.length === 1 && selectedElements[0] === 'sample-table'}
          isMultiSelected={selectedElements.length > 1 && selectedElements.includes('sample-table')}
          onSelect={onSelectElement}
          onPositionChange={onPositionChange}
          onGroupDrag={onGroupDrag}
          onDragStart={handleDragStart}
          onDragging={handleDragging}
          onDragEnd={handleDragEnd}
          snapPosition={draggingElement === 'sample-table' ? { x: activeGuides.snapX, y: activeGuides.snapY } : undefined}
        >
          <table 
            className="w-full border-collapse bg-white"
            style={{
              fontSize: `${settings.tables.fontSize}px`,
              fontFamily: settings.typography.bodyFont,
            }}
            data-element-key="sample-table"
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
      )}
    </div>
  );
};
