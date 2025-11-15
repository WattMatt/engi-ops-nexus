import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, ChevronDown, ChevronRight, Search, ChevronLeft, ChevronUp } from "lucide-react";
import { ReportTemplateType, getPlaceholdersByCategory } from "@/utils/reportTemplateSchemas";
import { useToast } from "@/hooks/use-toast";
import { PDFPagePreview } from "@/components/pdf-editor/PDFPagePreview";
import { PDFTextExtractor, ExtractedTextItem } from "@/components/pdf-editor/PDFTextExtractor";
import { Card } from "@/components/ui/card";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface PlaceholderQuickCopyProps {
  templateType?: ReportTemplateType;
  pdfUrl?: string | null;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export const PlaceholderQuickCopy = ({ 
  templateType = 'cover_page',
  pdfUrl = null,
  currentPage = 1,
  totalPages = 1,
  onPageChange
}: PlaceholderQuickCopyProps) => {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Current Page Content"])
  );
  const [numPages, setNumPages] = useState<number>(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [extractedTextItems, setExtractedTextItems] = useState<ExtractedTextItem[]>([]);
  const { toast } = useToast();
  const placeholdersByCategory = getPlaceholdersByCategory(templateType);

  const copyToClipboard = (placeholder: string, description: string) => {
    navigator.clipboard.writeText(placeholder);
    toast({
      title: "Copied!",
      description: `${placeholder} copied to clipboard`,
    });
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDocumentLoadSuccess = (pages: number) => {
    setNumPages(pages);
  };

  const handleDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
  };

  const handleTextExtracted = (items: ExtractedTextItem[]) => {
    console.log(`[PlaceholderQuickCopy] Received ${items.length} extracted text items for page ${currentPage}`);
    if (items.length > 0) {
      console.log('[PlaceholderQuickCopy] Sample items:', items.slice(0, 5));
    }
    setExtractedTextItems(items);
  };

  // Group text items by Y position (same line), then sort by X and concatenate
  const lineGroups: Record<number, ExtractedTextItem[]> = {};
  
  extractedTextItems.forEach(item => {
    const lineKey = Math.round(item.y / 2) * 2; // Group items within 2px vertically
    if (!lineGroups[lineKey]) {
      lineGroups[lineKey] = [];
    }
    lineGroups[lineKey].push(item);
  });

  // Convert line groups to text strings
  const pageContentPlaceholders = Object.entries(lineGroups)
    .map(([yPos, items]) => {
      // Sort items left to right
      const sortedItems = items.sort((a, b) => a.x - b.x);
      
      // Concatenate text with smart spacing
      let fullText = '';
      let lastEndX = 0;
      
      sortedItems.forEach((item, index) => {
        if (index === 0) {
          fullText = item.text;
          lastEndX = item.x + item.width;
        } else {
          // Calculate gap from end of last character to start of this one
          const gap = item.x - lastEndX;
          const avgCharWidth = item.width / item.text.length;
          
          // If gap is more than half a character width, add a space
          if (gap > avgCharWidth * 0.5) {
            fullText += ' ';
          }
          
          fullText += item.text;
          lastEndX = item.x + item.width;
        }
      });
      
      return {
        key: `page-${currentPage}-y-${yPos}`,
        placeholder: fullText.trim(),
        description: `Line at ${Math.round(parseFloat(yPos))}px from top`,
        category: "Current Page Content",
        y: parseFloat(yPos)
      };
    })
    .filter(item => item.placeholder.length > 0)
    .sort((a, b) => a.y - b.y); // Sort top to bottom

  console.log(`[PlaceholderQuickCopy] Created ${pageContentPlaceholders.length} text lines for page ${currentPage}`);
  if (pageContentPlaceholders.length > 0) {
    console.log('[PlaceholderQuickCopy] Sample lines:', pageContentPlaceholders.slice(0, 5).map(p => p.placeholder));
  }

  // Filter by search
  const filteredPageContent = pageContentPlaceholders.filter(item =>
    search.length === 0 || item.placeholder.toLowerCase().includes(search.toLowerCase())
  );

  // Combine static placeholders with extracted page content
  const allCategories: Record<string, any[]> = {
    ...(filteredPageContent.length > 0 ? { "Current Page Content": filteredPageContent } : {}),
    ...placeholdersByCategory
  };

  const filteredCategories = Object.entries(allCategories).map(([category, placeholders]) => {
    const filtered = Array.isArray(placeholders) ? placeholders.filter(
      (p: any) =>
        p.placeholder?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
    ) : [];
    return { category, placeholders: filtered };
  }).filter(({ placeholders }) => placeholders.length > 0);

  return (
    <div className="flex h-full gap-4 bg-background p-4">
      {/* Left: PDF Preview */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Template Preview</h3>
            {pdfUrl && numPages > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {numPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(Math.min(numPages, currentPage + 1))}
                  disabled={currentPage >= numPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="flex items-center justify-center">
              <PDFPagePreview
                pdfUrl={pdfUrl}
                currentPage={currentPage}
                onDocumentLoadSuccess={handleDocumentLoadSuccess}
                onDocumentLoadError={handleDocumentLoadError}
              />
              {pdfUrl && (
                <PDFTextExtractor
                  pdfUrl={pdfUrl}
                  currentPage={currentPage}
                  onTextExtracted={handleTextExtracted}
                />
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Right: Placeholders Panel */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-96'} flex flex-col`}>
        {isCollapsed ? (
          <Button
            variant="outline"
            size="sm"
            className="h-full"
            onClick={() => setIsCollapsed(false)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="font-semibold text-sm">Placeholders</h3>
                  {pdfUrl && numPages > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Viewing page {currentPage} of {numPages}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(true)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search placeholders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {filteredCategories.map(({ category, placeholders }) => (
                  <Collapsible
                    key={category}
                    open={expandedCategories.has(category)}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-accent/50 p-2 rounded-md transition-colors">
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">{category}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {placeholders.length}
                      </span>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-1 space-y-1">
                      {placeholders.map((placeholder) => (
                        <div
                          key={placeholder.key}
                          className="ml-6 p-2 rounded-md hover:bg-accent/30 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <code className="text-xs font-mono text-primary block break-all">
                                {placeholder.placeholder}
                              </code>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {placeholder.description}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => copyToClipboard(placeholder.placeholder, placeholder.description)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>
    </div>
  );
};
