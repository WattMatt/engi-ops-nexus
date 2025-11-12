import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight,
  RotateCw,
  FileText,
  Settings2,
  Eye,
  EyeOff,
  Palette
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateCategoryTotals, calculateGrandTotals } from "@/utils/costReportCalculations";

interface PDFPage {
  title: string;
  content: string;
  visible: boolean;
  order: number;
}

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (settings: PDFGenerationSettings) => Promise<void>;
  report: any;
  initialSettings: PDFGenerationSettings;
}

export interface PDFGenerationSettings {
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  fontSize: number;
  includePageNumbers: boolean;
  includeWatermark: boolean;
  watermarkText: string;
  headerColor: string;
  accentColor: string;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  sections: {
    coverPage: boolean;
    tableOfContents: boolean;
    executiveSummary: boolean;
    categoryDetails: boolean;
    projectInfo: boolean;
    costSummary: boolean;
    detailedLineItems: boolean;
    variations: boolean;
  };
  editedContent?: {
    projectName: string;
    reportName: string;
    description: string;
  };
}

export const PDFPreviewDialog = ({
  open,
  onOpenChange,
  onGenerate,
  report,
  initialSettings
}: PDFPreviewDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [settings, setSettings] = useState<PDFGenerationSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');
  
  // Editable content state
  const [editedContent, setEditedContent] = useState({
    projectName: report.project_name || '',
    reportName: report.name || '',
    description: report.description || '',
  });
  const [editingField, setEditingField] = useState<string | null>(null);

  // Fetch actual report data
  const { data: categories = [] } = useQuery({
    queryKey: ["cost-categories", report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("*")
        .eq("cost_report_id", report.id)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: lineItems = [] } = useQuery({
    queryKey: ["all-line-items-overview", report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_line_items")
        .select("*, cost_categories!inner(cost_report_id)")
        .eq("cost_categories.cost_report_id", report.id);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: variations = [] } = useQuery({
    queryKey: ["cost-variations-overview", report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_variations")
        .select("*")
        .eq("cost_report_id", report.id);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Calculate totals
  const categoryTotals = calculateCategoryTotals(categories, lineItems, variations);
  const grandTotals = calculateGrandTotals(categoryTotals);

  // Simulate PDF pages based on settings
  const [pages, setPages] = useState<PDFPage[]>([]);

  useEffect(() => {
    if (open) {
      generatePreviewPages();
    }
  }, [open, settings.sections]);

  const generatePreviewPages = () => {
    const previewPages: PDFPage[] = [];
    let order = 0;

    if (settings.sections.coverPage) {
      previewPages.push({
        title: 'Cover Page',
        content: `Cost Report - ${report.project_name}`,
        visible: true,
        order: order++
      });
    }

    if (settings.sections.tableOfContents) {
      previewPages.push({
        title: 'Table of Contents',
        content: 'Document navigation and page references',
        visible: true,
        order: order++
      });
    }

    if (settings.sections.executiveSummary) {
      previewPages.push({
        title: 'Executive Summary',
        content: 'Key performance indicators and financial overview',
        visible: true,
        order: order++
      });
    }

    if (settings.sections.projectInfo) {
      previewPages.push({
        title: 'Project Information',
        content: 'Project details and metadata',
        visible: true,
        order: order++
      });
    }

    if (settings.sections.costSummary) {
      previewPages.push({
        title: 'Cost Summary',
        content: 'Overall cost breakdown and totals',
        visible: true,
        order: order++
      });
    }

    if (settings.sections.categoryDetails) {
      previewPages.push({
        title: 'Category Performance',
        content: 'Detailed category analysis and charts',
        visible: true,
        order: order++
      });
    }

    if (settings.sections.detailedLineItems) {
      previewPages.push({
        title: 'Detailed Line Items',
        content: 'Complete line item breakdown',
        visible: true,
        order: order++
      });
    }

    if (settings.sections.variations) {
      previewPages.push({
        title: 'Variations',
        content: 'Cost variations and changes',
        visible: true,
        order: order++
      });
    }

    setPages(previewPages);
    setCurrentPage(0);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Pass both settings and edited content to the generate function
      await onGenerate({ ...settings, editedContent });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleContentEdit = (field: string, value: string) => {
    setEditedContent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const togglePageVisibility = (index: number) => {
    setPages(prev => prev.map((page, i) => 
      i === index ? { ...page, visible: !page.visible } : page
    ));
  };

  const visiblePages = pages.filter(p => p.visible);
  const totalPages = visiblePages.length;

  const renderPageContent = (pageTitle: string) => {
    const EditableText = ({ 
      field, 
      value, 
      className = "", 
      multiline = false 
    }: { 
      field: string; 
      value: string; 
      className?: string; 
      multiline?: boolean;
    }) => {
      const isEditing = editingField === field;
      
      return isEditing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => handleContentEdit(field, e.target.value)}
            onBlur={() => setEditingField(null)}
            className={`border-2 border-blue-500 rounded px-2 py-1 w-full ${className}`}
            autoFocus
            rows={3}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => handleContentEdit(field, e.target.value)}
            onBlur={() => setEditingField(null)}
            className={`border-2 border-blue-500 rounded px-2 py-1 w-full ${className}`}
            autoFocus
          />
        )
      ) : (
        <span
          onClick={() => setEditingField(field)}
          className={`cursor-pointer hover:bg-blue-50 hover:border hover:border-blue-300 rounded px-2 py-1 transition-colors ${className}`}
          title="Click to edit"
        >
          {value}
        </span>
      );
    };

    switch (pageTitle) {
      case 'Cover Page':
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <h1 className="text-4xl font-bold text-center">
              <EditableText field="projectName" value={editedContent.projectName} className="text-4xl font-bold" />
            </h1>
            <h2 className="text-2xl">Cost Report</h2>
            <div className="text-lg space-y-2 text-center">
              <p>
                Report Name: <EditableText field="reportName" value={editedContent.reportName} className="text-lg" />
              </p>
              {report.report_date && <p>Date: {new Date(report.report_date).toLocaleDateString()}</p>}
            </div>
          </div>
        );
      
      case 'Project Information':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Project Name:</p>
                <EditableText field="projectName" value={editedContent.projectName} />
              </div>
              <div>
                <p className="font-semibold">Report Name:</p>
                <EditableText field="reportName" value={editedContent.reportName} />
              </div>
              {report.report_date && (
                <div>
                  <p className="font-semibold">Report Date:</p>
                  <p>{new Date(report.report_date).toLocaleDateString()}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="font-semibold">Description:</p>
                <EditableText 
                  field="description" 
                  value={editedContent.description} 
                  multiline 
                />
              </div>
            </div>
          </div>
        );

      case 'Executive Summary':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded">
                <p className="text-sm text-gray-600">Original Budget</p>
                <p className="text-2xl font-bold">R{grandTotals.originalBudget.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 border rounded">
                <p className="text-sm text-gray-600">Previous Report</p>
                <p className="text-2xl font-bold">R{grandTotals.previousReport.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 border rounded">
                <p className="text-sm text-gray-600">Anticipated Final</p>
                <p className="text-2xl font-bold">R{grandTotals.anticipatedFinal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 border rounded">
                <p className="text-sm text-gray-600">Variance</p>
                <p className={`text-2xl font-bold ${grandTotals.originalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R{Math.abs(grandTotals.originalVariance).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <p className="font-semibold mb-2">Key Highlights:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{categories.length} cost categories tracked</li>
                <li>{lineItems.length} line items</li>
                {variations.length > 0 && <li>{variations.length} variations recorded</li>}
              </ul>
            </div>
          </div>
        );

      case 'Cost Summary':
        return (
          <div className="space-y-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Original</th>
                  <th className="text-right p-2">Previous</th>
                  <th className="text-right p-2">Anticipated</th>
                  <th className="text-right p-2">Variance</th>
                </tr>
              </thead>
              <tbody>
                {categoryTotals.slice(0, 8).map((cat, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{cat.code} - {cat.description}</td>
                    <td className="text-right p-2">R{cat.originalBudget.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}</td>
                    <td className="text-right p-2">R{cat.previousReport.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}</td>
                    <td className="text-right p-2">R{cat.anticipatedFinal.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}</td>
                    <td className={`text-right p-2 ${cat.originalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R{Math.abs(cat.originalVariance).toLocaleString("en-ZA", { minimumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categoryTotals.length > 8 && (
              <p className="text-sm text-gray-500 italic">+ {categoryTotals.length - 8} more categories...</p>
            )}
          </div>
        );

      case 'Category Performance':
        return (
          <div className="space-y-4">
            <p className="font-semibold">Top Categories by Value:</p>
            {categoryTotals
              .sort((a, b) => b.anticipatedFinal - a.anticipatedFinal)
              .slice(0, 5)
              .map((cat, idx) => (
                <div key={idx} className="border-l-4 pl-4 py-2" style={{ borderColor: settings.accentColor }}>
                  <p className="font-semibold">{cat.code} - {cat.description}</p>
                  <div className="grid grid-cols-3 gap-2 mt-1 text-sm">
                    <div>
                      <span className="text-gray-600">Original:</span>
                      <span className="ml-2">R{cat.originalBudget.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Anticipated:</span>
                      <span className="ml-2">R{cat.anticipatedFinal.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Variance:</span>
                      <span className={`ml-2 ${cat.originalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R{Math.abs(cat.originalVariance).toLocaleString("en-ZA", { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        );

      case 'Detailed Line Items':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Sample of line items (first 10 shown):</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-1">Description</th>
                  <th className="text-right p-1">Qty</th>
                  <th className="text-right p-1">Rate</th>
                  <th className="text-right p-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.slice(0, 10).map((item: any, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-1">{item.description}</td>
                    <td className="text-right p-1">{item.quantity}</td>
                    <td className="text-right p-1">R{item.rate?.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                    <td className="text-right p-1">R{((item.quantity || 0) * (item.rate || 0)).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lineItems.length > 10 && (
              <p className="text-sm text-gray-500 italic">+ {lineItems.length - 10} more items in full report...</p>
            )}
          </div>
        );

      case 'Variations':
        return variations.length > 0 ? (
          <div className="space-y-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {variations.slice(0, 10).map((variation: any, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{variation.description}</td>
                    <td className="text-right p-2">R{variation.amount?.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2">{variation.status || 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {variations.length > 10 && (
              <p className="text-sm text-gray-500 italic">+ {variations.length - 10} more variations...</p>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No variations recorded for this report.</p>
          </div>
        );

      case 'Table of Contents':
        return (
          <div className="space-y-2">
            <p className="font-semibold mb-4">Contents:</p>
            {pages.filter(p => p.visible).map((page, idx) => (
              <div key={idx} className="flex justify-between border-b pb-2">
                <span>{page.title}</span>
                <span className="text-gray-500">Page {idx + 1}</span>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="space-y-2 text-sm text-gray-500">
            <p>• Content will be dynamically generated</p>
            <p>• Charts and tables will be included</p>
            <p>• Formatting will match your settings</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Preview & Settings
          </DialogTitle>
          <DialogDescription>
            Preview and customize your PDF before generating
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 flex flex-col min-h-0 m-0 mt-4 px-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs">
                  <Eye className="h-3 w-3" />
                  Click text to edit
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-16 text-center">{zoom}%</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Page Preview */}
            <ScrollArea className="flex-1 border rounded-lg bg-muted/30">
              <div className="p-8 flex justify-center">
                <div 
                  className="bg-white shadow-lg"
                  style={{
                    width: settings.orientation === 'portrait' ? '210mm' : '297mm',
                    height: settings.orientation === 'portrait' ? '297mm' : '210mm',
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    padding: `${settings.margins.top}mm ${settings.margins.right}mm ${settings.margins.bottom}mm ${settings.margins.left}mm`
                  }}
                >
                  {visiblePages[currentPage] && (
                    <div className="h-full flex flex-col relative">
                      {/* Header */}
                      <div 
                        className="p-4 text-white rounded-t"
                        style={{ backgroundColor: settings.headerColor }}
                      >
                        <h2 className="text-2xl font-bold">{visiblePages[currentPage].title}</h2>
                        <p className="text-sm opacity-90">{report.project_name}</p>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6 overflow-auto">
                        <div className="text-gray-700" style={{ fontSize: `${settings.fontSize}pt` }}>
                          {renderPageContent(visiblePages[currentPage].title)}
                        </div>
                      </div>

                      {/* Footer */}
                      {settings.includePageNumbers && (
                        <div className="text-center text-xs text-gray-500 pb-2">
                          Page {currentPage + 1} of {totalPages}
                        </div>
                      )}

                      {/* Watermark */}
                      {settings.includeWatermark && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div 
                            className="text-8xl font-bold opacity-5 rotate-[-45deg]"
                            style={{ color: settings.accentColor }}
                          >
                            {settings.watermarkText}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Page List */}
            <div className="mt-4 border rounded-lg p-3 bg-muted/30">
              <Label className="text-xs font-semibold mb-2 block">Document Pages</Label>
              <div className="flex flex-wrap gap-2">
                {pages.map((page, index) => (
                  <Badge
                    key={index}
                    variant={page.visible ? "default" : "outline"}
                    className="cursor-pointer gap-1 px-3 py-1"
                    onClick={() => togglePageVisibility(index)}
                  >
                    {page.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {page.title}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 m-0 mt-4 px-6">
            <ScrollArea className="h-[calc(95vh-250px)]">
              <div className="space-y-6 pr-4">
                {/* Page Setup */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Page Setup
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Page Size</Label>
                      <Select
                        value={settings.pageSize}
                        onValueChange={(value: any) => setSettings({ ...settings, pageSize: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                          <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                          <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Orientation</Label>
                      <Select
                        value={settings.orientation}
                        onValueChange={(value: any) => setSettings({ ...settings, orientation: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Typography */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Typography
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>Base Font Size: {settings.fontSize}pt</Label>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={([value]) => setSettings({ ...settings, fontSize: value })}
                      min={8}
                      max={16}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                <Separator />

                {/* Colors */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Colors
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Header Color</Label>
                      <Input
                        type="color"
                        value={settings.headerColor}
                        onChange={(e) => setSettings({ ...settings, headerColor: e.target.value })}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <Input
                        type="color"
                        value={settings.accentColor}
                        onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Additional Options */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Additional Options</h3>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="page-numbers">Include Page Numbers</Label>
                    <Switch
                      id="page-numbers"
                      checked={settings.includePageNumbers}
                      onCheckedChange={(checked) => setSettings({ ...settings, includePageNumbers: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="watermark">Include Watermark</Label>
                    <Switch
                      id="watermark"
                      checked={settings.includeWatermark}
                      onCheckedChange={(checked) => setSettings({ ...settings, includeWatermark: checked })}
                    />
                  </div>

                  {settings.includeWatermark && (
                    <div className="space-y-2 pl-4">
                      <Label>Watermark Text</Label>
                      <Input
                        value={settings.watermarkText}
                        onChange={(e) => setSettings({ ...settings, watermarkText: e.target.value })}
                        placeholder="CONFIDENTIAL"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Margins */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Page Margins (mm)</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Top</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.margins.top}
                        onChange={(e) => setSettings({
                          ...settings,
                          margins: { ...settings.margins, top: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Bottom</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.margins.bottom}
                        onChange={(e) => setSettings({
                          ...settings,
                          margins: { ...settings.margins, bottom: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Left</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.margins.left}
                        onChange={(e) => setSettings({
                          ...settings,
                          margins: { ...settings.margins, left: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Right</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.margins.right}
                        onChange={(e) => setSettings({
                          ...settings,
                          margins: { ...settings.margins, right: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 pb-6 pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              {totalPages} pages
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};