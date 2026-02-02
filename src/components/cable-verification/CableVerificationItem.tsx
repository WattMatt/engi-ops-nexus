/**
 * Cable Verification Item Component
 * Individual cable card for verification with status selection and notes
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Camera,
  Ruler,
  Loader2,
  X,
  Cable,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CableEntryForVerification, VerificationItemStatus } from "@/types/cableVerification";

interface CableVerificationItemProps {
  cable: CableEntryForVerification;
  onStatusChange: (cableId: string, status: VerificationItemStatus, notes?: string, measuredLength?: number) => Promise<void>;
  onPhotoUpload: (cableId: string, file: File) => Promise<string>;
  onPhotoRemove: (cableId: string, photoUrl: string) => Promise<void>;
  isUpdating?: boolean;
}

const statusConfig: Record<VerificationItemStatus, { 
  label: string; 
  icon: typeof CheckCircle2; 
  className: string;
  bgClassName: string;
}> = {
  pending: { 
    label: 'Pending', 
    icon: Cable, 
    className: 'text-muted-foreground',
    bgClassName: 'bg-muted/50'
  },
  verified: { 
    label: 'Verified', 
    icon: CheckCircle2, 
    className: 'text-green-600 dark:text-green-400',
    bgClassName: 'bg-green-100 dark:bg-green-900/20'
  },
  issue: { 
    label: 'Issue', 
    icon: AlertTriangle, 
    className: 'text-amber-600 dark:text-amber-400',
    bgClassName: 'bg-amber-100 dark:bg-amber-900/20'
  },
  not_installed: { 
    label: 'Not Installed', 
    icon: XCircle, 
    className: 'text-red-600 dark:text-red-400',
    bgClassName: 'bg-red-100 dark:bg-red-900/20'
  },
};

export function CableVerificationItem({
  cable,
  onStatusChange,
  onPhotoUpload,
  onPhotoRemove,
  isUpdating = false,
}: CableVerificationItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(cable.verification_notes || '');
  const [measuredLength, setMeasuredLength] = useState<string>(
    cable.verification_measured_length?.toString() || ''
  );
  const [isUploading, setIsUploading] = useState(false);

  const currentStatus = cable.verification_status || 'pending';
  const config = statusConfig[currentStatus];
  const StatusIcon = config.icon;

  const handleStatusSelect = async (status: VerificationItemStatus) => {
    await onStatusChange(
      cable.id, 
      status, 
      notes || undefined, 
      measuredLength ? parseFloat(measuredLength) : undefined
    );
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onPhotoUpload(cable.id, file);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const photos = cable.verification_photos || [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("transition-colors", config.bgClassName)}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <StatusIcon className={cn("h-5 w-5 shrink-0", config.className)} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{cable.cable_tag}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {cable.from_location} → {cable.to_location}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {cable.cable_size}
                </Badge>
                {cable.total_length && (
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    {cable.total_length}m
                  </Badge>
                )}
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )} 
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3 space-y-4">
            {/* Cable Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Size:</span>
                <span className="ml-1 font-medium">{cable.cable_size || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cores:</span>
                <span className="ml-1 font-medium">{cable.core_count || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="ml-1 font-medium">{cable.cable_type || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Voltage:</span>
                <span className="ml-1 font-medium">{cable.voltage || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Design Length:</span>
                <span className="ml-1 font-medium">{cable.total_length || '-'}m</span>
              </div>
              {cable.load_amps && (
                <div>
                  <span className="text-muted-foreground">Load:</span>
                  <span className="ml-1 font-medium">{cable.load_amps}A</span>
                </div>
              )}
            </div>

            {/* Status Selection */}
            <div className="space-y-2">
              <Label>Verification Status</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(statusConfig) as [VerificationItemStatus, typeof config][]).map(
                  ([status, { label, icon: Icon, className }]) => (
                    <Button
                      key={status}
                      type="button"
                      variant={currentStatus === status ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "justify-start gap-2",
                        currentStatus === status && status === 'verified' && "bg-green-600 hover:bg-green-700",
                        currentStatus === status && status === 'issue' && "bg-amber-600 hover:bg-amber-700",
                        currentStatus === status && status === 'not_installed' && "bg-red-600 hover:bg-red-700"
                      )}
                      onClick={() => handleStatusSelect(status)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className={cn("h-4 w-4", currentStatus !== status && className)} />
                      )}
                      <span className="truncate">{label}</span>
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Measured Length */}
            <div className="space-y-2">
              <Label htmlFor={`length-${cable.id}`} className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Actual Measured Length (m)
              </Label>
              <Input
                id={`length-${cable.id}`}
                type="number"
                step="0.1"
                placeholder="Enter measured length"
                value={measuredLength}
                onChange={(e) => setMeasuredLength(e.target.value)}
                onBlur={() => {
                  if (measuredLength !== (cable.verification_measured_length?.toString() || '')) {
                    handleStatusSelect(currentStatus);
                  }
                }}
                className="max-w-[200px]"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor={`notes-${cable.id}`}>Notes</Label>
              <Textarea
                id={`notes-${cable.id}`}
                placeholder="Add any observations, issues, or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => {
                  if (notes !== (cable.verification_notes || '')) {
                    handleStatusSelect(currentStatus);
                  }
                }}
                rows={2}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photo Evidence
              </Label>
              
              <div className="flex flex-wrap gap-2">
                {photos.map((url, index) => (
                  <div 
                    key={index}
                    className="relative w-20 h-20 rounded-md overflow-hidden border"
                  >
                    <img 
                      src={url} 
                      alt={`Evidence ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-0.5 right-0.5 h-5 w-5"
                      onClick={() => onPhotoRemove(cable.id, url)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <label className={cn(
                  "w-20 h-20 flex flex-col items-center justify-center gap-1",
                  "border-2 border-dashed rounded-md cursor-pointer",
                  "hover:bg-muted/50 transition-colors",
                  isUploading && "opacity-50 pointer-events-none"
                )}>
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handlePhotoChange}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
