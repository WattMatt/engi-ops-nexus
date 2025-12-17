import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  FileText, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  Search,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink
} from "lucide-react";
import {
  REGULATION_REFERENCE,
  LIGHTING_REGULATION_SUMMARY,
  ILLUMINANCE_SCHEDULE,
  ILLUMINANCE_CATEGORIES,
  type IlluminanceRequirement,
} from "../data/environmentalRegulations";

interface RegulatoryComplianceSectionProps {
  showFullSchedule?: boolean;
}

export function RegulatoryComplianceSection({ showFullSchedule = false }: RegulatoryComplianceSectionProps) {
  const [isGeneralOpen, setIsGeneralOpen] = useState(true);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(true);
  const [isScheduleOpen, setIsScheduleOpen] = useState(showFullSchedule);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredSchedule = ILLUMINANCE_SCHEDULE.filter((req) => {
    const matchesSearch = searchQuery === "" || 
      req.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || req.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDownloadPDF = () => {
    window.open(REGULATION_REFERENCE.pdfPath, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{REGULATION_REFERENCE.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {REGULATION_REFERENCE.act} • {REGULATION_REFERENCE.section}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* General Lighting Requirements */}
      <Collapsible open={isGeneralOpen} onOpenChange={setIsGeneralOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  General Lighting Requirements
                </CardTitle>
                {isGeneralOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {LIGHTING_REGULATION_SUMMARY.generalRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Emergency Lighting Requirements */}
      <Collapsible open={isEmergencyOpen} onOpenChange={setIsEmergencyOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Emergency Lighting Requirements
                </CardTitle>
                {isEmergencyOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Standard Areas</Badge>
                  </div>
                  <p className="text-2xl font-bold">{LIGHTING_REGULATION_SUMMARY.emergencyLighting.standard.minLux} lux</p>
                  <p className="text-sm text-muted-foreground">
                    {LIGHTING_REGULATION_SUMMARY.emergencyLighting.standard.description}
                  </p>
                </div>
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive">Hazardous Areas</Badge>
                  </div>
                  <p className="text-2xl font-bold">{LIGHTING_REGULATION_SUMMARY.emergencyLighting.hazardous.minLux} lux</p>
                  <p className="text-sm text-muted-foreground">
                    {LIGHTING_REGULATION_SUMMARY.emergencyLighting.hazardous.description}
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {LIGHTING_REGULATION_SUMMARY.emergencyLighting.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Illuminance Schedule */}
      <Collapsible open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Minimum Illuminance Schedule
                  <Badge variant="outline">{ILLUMINANCE_SCHEDULE.length} requirements</Badge>
                </CardTitle>
                {isScheduleOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search locations or activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {ILLUMINANCE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="border rounded-lg max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Location/Area</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead className="text-right">Min Lux</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedule.map((req, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {req.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{req.location}</TableCell>
                        <TableCell className="text-muted-foreground">{req.activity}</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {req.minLux} lx
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSchedule.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No requirements found matching your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Source: Schedule to Environmental Regulations for Workplaces, 1987 - 
                Minimum Average Values of Maintained Illuminance (Measured on the Working Plane)
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
