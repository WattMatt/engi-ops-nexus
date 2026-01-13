import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Type, 
  Image, 
  Square, 
  Columns, 
  Link2, 
  MousePointer, 
  Heading1, 
  Heading2, 
  AlignLeft, 
  List,
  Minus,
  LayoutGrid,
  Trash2,
  GripVertical,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BuilderBlock {
  id: string;
  type: string;
  content: any;
  styles: any;
}

interface EmailBuilderCanvasProps {
  initialHtml?: string;
  initialJson?: BuilderBlock[] | null;
  onChange: (html: string, json: BuilderBlock[]) => void;
}

const BLOCK_TYPES = [
  { type: "heading", label: "Heading", icon: Heading1 },
  { type: "subheading", label: "Subheading", icon: Heading2 },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft },
  { type: "button", label: "Button", icon: MousePointer },
  { type: "image", label: "Image", icon: Image },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "spacer", label: "Spacer", icon: Square },
  { type: "columns", label: "2 Columns", icon: Columns },
  { type: "list", label: "List", icon: List },
];

const DEFAULT_BLOCKS: BuilderBlock[] = [
  {
    id: "header-1",
    type: "header",
    content: { title: "Watson Mattheus", subtitle: "{{title}}" },
    styles: { backgroundColor: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" },
  },
  {
    id: "paragraph-1",
    type: "paragraph",
    content: { text: "Hi {{recipient_name}}," },
    styles: {},
  },
  {
    id: "paragraph-2",
    type: "paragraph",
    content: { text: "{{content}}" },
    styles: {},
  },
  {
    id: "footer-1",
    type: "footer",
    content: { text: "Watson Mattheus Engineering" },
    styles: {},
  },
];

export function EmailBuilderCanvas({ initialHtml, initialJson, onChange }: EmailBuilderCanvasProps) {
  const [blocks, setBlocks] = useState<BuilderBlock[]>(initialJson || DEFAULT_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockType, setDraggedBlockType] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Generate HTML from blocks
  const generateHtml = useCallback((blocks: BuilderBlock[]): string => {
    const blockToHtml = (block: BuilderBlock): string => {
      switch (block.type) {
        case "header":
          return `
            <tr>
              <td style="background: ${block.styles.backgroundColor || '#1e3a5f'}; color: white; padding: 32px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${block.content.title}</h1>
                ${block.content.subtitle ? `<p style="margin: 12px 0 0 0; opacity: 0.9;">${block.content.subtitle}</p>` : ''}
              </td>
            </tr>`;
        case "heading":
          return `
            <tr>
              <td style="padding: 24px 32px 8px 32px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #1f2937;">${block.content.text || 'Heading'}</h2>
              </td>
            </tr>`;
        case "subheading":
          return `
            <tr>
              <td style="padding: 16px 32px 8px 32px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #374151;">${block.content.text || 'Subheading'}</h3>
              </td>
            </tr>`;
        case "paragraph":
          return `
            <tr>
              <td style="padding: 8px 32px;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4b5563;">${block.content.text || 'Enter text...'}</p>
              </td>
            </tr>`;
        case "button":
          return `
            <tr>
              <td style="padding: 16px 32px; text-align: ${block.styles.align || 'center'};">
                <a href="${block.content.url || '#'}" style="display: inline-block; padding: 14px 32px; background: ${block.styles.backgroundColor || '#2563eb'}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">${block.content.text || 'Click Here'}</a>
              </td>
            </tr>`;
        case "image":
          return `
            <tr>
              <td style="padding: 16px 32px; text-align: center;">
                <img src="${block.content.src || 'https://via.placeholder.com/400x200'}" alt="${block.content.alt || ''}" style="max-width: 100%; height: auto; border-radius: 8px;" />
              </td>
            </tr>`;
        case "divider":
          return `
            <tr>
              <td style="padding: 16px 32px;">
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
              </td>
            </tr>`;
        case "spacer":
          return `
            <tr>
              <td style="padding: ${block.styles.height || '24px'} 0;"></td>
            </tr>`;
        case "footer":
          return `
            <tr>
              <td style="background: #f8fafc; padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-weight: 600; color: #475569;">${block.content.text || 'Company Name'}</p>
                <p style="margin: 8px 0 0 0;">This is an automated message. Please do not reply directly.</p>
              </td>
            </tr>`;
        default:
          return '';
      }
    };

    const bodyContent = blocks.map(blockToHtml).join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; max-width: 600px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          ${bodyContent}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }, []);

  // Update parent when blocks change
  useEffect(() => {
    const html = generateHtml(blocks);
    onChange(html, blocks);
  }, [blocks, generateHtml, onChange]);

  const addBlock = (type: string, afterId?: string) => {
    const newBlock: BuilderBlock = {
      id: `${type}-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      styles: {},
    };

    setBlocks((prev) => {
      if (afterId) {
        const index = prev.findIndex((b) => b.id === afterId);
        const newBlocks = [...prev];
        newBlocks.splice(index + 1, 0, newBlock);
        return newBlocks;
      }
      // Insert before footer if exists
      const footerIndex = prev.findIndex((b) => b.type === 'footer');
      if (footerIndex > -1) {
        const newBlocks = [...prev];
        newBlocks.splice(footerIndex, 0, newBlock);
        return newBlocks;
      }
      return [...prev, newBlock];
    });

    setSelectedBlockId(newBlock.id);
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case "heading": return { text: "Heading" };
      case "subheading": return { text: "Subheading" };
      case "paragraph": return { text: "Enter your text here..." };
      case "button": return { text: "Click Here", url: "#" };
      case "image": return { src: "", alt: "" };
      case "list": return { items: ["Item 1", "Item 2", "Item 3"] };
      default: return {};
    }
  };

  const updateBlock = (id: string, updates: Partial<BuilderBlock>) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, ...updates } : block
      )
    );
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    setSelectedBlockId(null);
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;

      const newBlocks = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
      return newBlocks;
    });
  };

  const handleDragStart = (type: string) => {
    setDraggedBlockType(type);
  };

  const handleDragEnd = () => {
    setDraggedBlockType(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedBlockType) {
      addBlock(draggedBlockType);
    }
    setDraggedBlockType(null);
  };

  const renderBlockPreview = (block: BuilderBlock) => {
    const isSelected = selectedBlockId === block.id;
    const isStructural = block.type === "header" || block.type === "footer";

    return (
      <div
        key={block.id}
        className={cn(
          "group relative border-2 border-transparent rounded transition-all cursor-pointer",
          isSelected && "border-primary ring-2 ring-primary/20",
          !isStructural && "hover:border-muted-foreground/30"
        )}
        onClick={() => setSelectedBlockId(block.id)}
      >
        {/* Block controls */}
        {isSelected && !isStructural && (
          <div className="absolute -top-3 right-2 flex items-center gap-1 bg-background border rounded shadow-sm z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "up"); }}
            >
              <GripVertical className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Block content preview */}
        <div className={cn("p-4", isStructural && "pointer-events-none")}>
          {renderBlockContent(block)}
        </div>

        {/* Add block button between blocks */}
        {!isStructural && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 rounded-full shadow"
              onClick={(e) => { e.stopPropagation(); addBlock("paragraph", block.id); }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderBlockContent = (block: BuilderBlock) => {
    switch (block.type) {
      case "header":
        return (
          <div
            className="text-white p-6 rounded text-center"
            style={{ background: block.styles.backgroundColor || "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}
          >
            <h1 className="text-xl font-bold">{block.content.title}</h1>
            {block.content.subtitle && (
              <p className="mt-2 opacity-90">{block.content.subtitle}</p>
            )}
          </div>
        );
      case "heading":
        return <h2 className="text-lg font-semibold">{block.content.text || "Heading"}</h2>;
      case "subheading":
        return <h3 className="font-medium text-muted-foreground">{block.content.text || "Subheading"}</h3>;
      case "paragraph":
        return <p className="text-sm text-muted-foreground">{block.content.text || "Enter text..."}</p>;
      case "button":
        return (
          <div className="text-center">
            <span className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
              {block.content.text || "Click Here"}
            </span>
          </div>
        );
      case "image":
        return (
          <div className="bg-muted rounded flex items-center justify-center h-24">
            <Image className="h-8 w-8 text-muted-foreground" />
          </div>
        );
      case "divider":
        return <hr className="border-border" />;
      case "spacer":
        return <div className="h-6 bg-muted/30 rounded border border-dashed border-muted-foreground/30" />;
      case "footer":
        return (
          <div className="bg-muted/50 p-4 rounded text-center text-sm text-muted-foreground">
            <p className="font-medium">{block.content.text}</p>
            <p className="text-xs mt-1">Automated message</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      {/* Blocks Palette */}
      <div className="w-48 border-r bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-3">BLOCKS</p>
        <div className="grid grid-cols-2 gap-2">
          {BLOCK_TYPES.map((blockType) => (
            <div
              key={blockType.type}
              draggable
              onDragStart={() => handleDragStart(blockType.type)}
              onDragEnd={handleDragEnd}
              className="flex flex-col items-center gap-1 p-2 rounded border bg-background hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
              onClick={() => addBlock(blockType.type)}
            >
              <blockType.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{blockType.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <ScrollArea className="flex-1">
        <div
          ref={canvasRef}
          className={cn(
            "min-h-full p-6 bg-muted/20",
            draggedBlockType && "ring-2 ring-primary/20 ring-inset"
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="max-w-[600px] mx-auto bg-background rounded-lg shadow-sm border overflow-hidden">
            {blocks.map(renderBlockPreview)}
          </div>
        </div>
      </ScrollArea>

      {/* Properties Panel */}
      {selectedBlockId && (
        <div className="w-64 border-l bg-muted/30 p-4">
          <p className="text-sm font-medium mb-4">Block Properties</p>
          {blocks.find((b) => b.id === selectedBlockId)?.type !== "header" &&
            blocks.find((b) => b.id === selectedBlockId)?.type !== "footer" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Text Content</label>
                <textarea
                  className="w-full mt-1 p-2 text-sm border rounded resize-none"
                  rows={3}
                  value={blocks.find((b) => b.id === selectedBlockId)?.content?.text || ""}
                  onChange={(e) =>
                    updateBlock(selectedBlockId, {
                      content: { ...blocks.find((b) => b.id === selectedBlockId)?.content, text: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
