import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileUp,
  Upload,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  List,
  Sparkles,
  Save,
} from "lucide-react";
import { useExtractBOQTemplate, ExtractedStructure } from "@/hooks/useExtractBOQTemplate";

interface ExtractTemplateFromPDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExtracted?: (templateId: string) => void;
}

const BUILDING_TYPES = [
  { value: "mall", label: "Shopping Mall" },
  { value: "office", label: "Office Building" },
  { value: "retail", label: "Retail" },
  { value: "industrial", label: "Industrial" },
  { value: "residential", label: "Residential" },
  { value: "hospital", label: "Hospital / Healthcare" },
  { value: "mixed_use", label: "Mixed Use" },
  { value: "other", label: "Other" },
];

export function ExtractTemplateFromPDFDialog({
  open,
  onOpenChange,
  onExtracted,
}: ExtractTemplateFromPDFDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [step, setStep] = useState<"upload" | "preview" | "saving">("upload");
  const [expandedBills, setExpandedBills] = useState<Set<number>>(new Set());
  
  const { 
    isExtracting, 
    progress, 
    result, 
    extractFromFile, 
    clearResult 
  } = useExtractBOQTemplate();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
    }
  }, []);

  const handleExtract = async () => {
    if (!file) return;

    const extractResult = await extractFromFile(file, {
      saveToDatabase: false, // Just preview first
    });

    if (extractResult?.success && extractResult.data?.structure) {
      // Use AI-suggested values as defaults
      const structure = extractResult.data.structure;
      if (structure.template_name && !templateName) {
        setTemplateName(structure.template_name);
      }
      if (structure.template_description && !templateDescription) {
        setTemplateDescription(structure.template_description);
      }
      if (structure.building_type && !buildingType) {
        setBuildingType(structure.building_type);
      }
      setStep("preview");
      // Expand all bills by default
      setExpandedBills(new Set(structure.bills.map(b => b.bill_number)));
    }
  };

  const handleSave = async () => {
    if (!file || !result?.data?.structure) return;
    
    setStep("saving");
    
    const saveResult = await extractFromFile(file, {
      templateName,
      templateDescription,
      buildingType,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      saveToDatabase: true,
    });

    if (saveResult?.success && saveResult.data?.template_id) {
      onExtracted?.(saveResult.data.template_id);
      handleClose();
    } else {
      setStep("preview");
    }
  };

  const handleClose = () => {
    setFile(null);
    setTemplateName("");
    setTemplateDescription("");
    setBuildingType("");
    setTagsInput("");
    setStep("upload");
    setExpandedBills(new Set());
    clearResult();
    onOpenChange(false);
  };

  const toggleBill = (billNumber: number) => {
    setExpandedBills(prev => {
      const next = new Set(prev);
      if (next.has(billNumber)) {
        next.delete(billNumber);
      } else {
        next.add(billNumber);
      }
      return next;
    });
  };

  const structure = result?.data?.structure;
  const stats = result?.data?.stats;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Extract Template from PDF
          </DialogTitle>
          <DialogDescription>
            Upload a BOQ document to automatically extract its bill/section structure as a reusable template
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {file ? (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Drag & drop a PDF or Excel file here, or click to browse
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    className="hidden"
                    id="boq-template-upload"
                    onChange={handleFileChange}
                  />
                  <Button asChild variant="secondary">
                    <label htmlFor="boq-template-upload" className="cursor-pointer">
                      <FileUp className="h-4 w-4 mr-2" />
                      Browse Files
                    </label>
                  </Button>
                </div>
              )}
            </div>

            {isExtracting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress < 50 ? 'Extracting text...' : 'Analyzing structure...'}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </div>
        )}

        {step === "preview" && structure && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
            {/* Stats Summary */}
            <div className="flex gap-4 justify-center">
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{stats?.total_bills} Bills</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{stats?.total_sections} Sections</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                <List className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{stats?.total_items} Items</span>
              </div>
            </div>

            {/* Template Details Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Shopping Mall Electrical BOQ"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="building-type">Building Type</Label>
                <Select value={buildingType} onValueChange={setBuildingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILDING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this template..."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g., electrical, hvac, shopping mall"
              />
            </div>

            {/* Structure Preview */}
            <div className="space-y-1.5 flex-1 overflow-hidden flex flex-col">
              <Label>Extracted Structure</Label>
              <ScrollArea className="flex-1 border rounded-md p-2">
                <div className="space-y-1">
                  {structure.bills.map((bill) => (
                    <Collapsible 
                      key={bill.bill_number}
                      open={expandedBills.has(bill.bill_number)}
                      onOpenChange={() => toggleBill(bill.bill_number)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded text-left">
                        {expandedBills.has(bill.bill_number) ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="font-medium">
                          Bill {bill.bill_number}: {bill.bill_name}
                        </span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {bill.sections.length} sections
                        </Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-6">
                        {bill.sections.map((section, sIdx) => (
                          <div key={sIdx} className="border-l-2 border-muted pl-4 py-1 my-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {section.section_code}: {section.section_name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {section.items.length} items
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {step === "saving" && (
          <div className="py-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Saving template to database...</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          {step === "upload" && (
            <Button 
              onClick={handleExtract} 
              disabled={!file || isExtracting}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract Structure
                </>
              )}
            </Button>
          )}
          
          {step === "preview" && (
            <Button 
              onClick={handleSave}
              disabled={!templateName.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
