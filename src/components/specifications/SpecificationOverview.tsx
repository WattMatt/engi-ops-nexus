import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, Building, Pencil, X, Check } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoUpload } from "@/components/LogoUpload";
import { SpecificationExportPDFButton } from "./SpecificationExportPDFButton";
import { ReportHistoryPanel } from "@/components/shared/ReportHistoryPanel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SpecificationOverviewProps {
  specification: any;
  onUpdated?: () => void;
}

export const SpecificationOverview = ({ specification, onUpdated }: SpecificationOverviewProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(() => ({
    title: specification.title || "",
    spec_type: specification.spec_type || "Meter Specification",
    spec_number: specification.spec_number || "",
    revision: specification.revision || "Rev 0",
    spec_date: specification.spec_date || new Date().toISOString().split("T")[0],
    status: specification.status || "draft",
    notes: specification.notes || "",
    prepared_for_company: specification.prepared_for_company || "",
    prepared_for_contact: specification.prepared_for_contact || "",
    prepared_for_tel: specification.prepared_for_tel || "",
    prepared_for_email: specification.prepared_for_email || "",
    consultant_logo_url: specification.consultant_logo_url || "",
    client_logo_url: specification.client_logo_url || "",
  }));

  const startEditing = () => {
    setFormData({
      title: specification.title || "",
      spec_type: specification.spec_type || "Meter Specification",
      spec_number: specification.spec_number || "",
      revision: specification.revision || "Rev 0",
      spec_date: specification.spec_date || new Date().toISOString().split("T")[0],
      status: specification.status || "draft",
      notes: specification.notes || "",
      prepared_for_company: specification.prepared_for_company || "",
      prepared_for_contact: specification.prepared_for_contact || "",
      prepared_for_tel: specification.prepared_for_tel || "",
      prepared_for_email: specification.prepared_for_email || "",
      consultant_logo_url: specification.consultant_logo_url || "",
      client_logo_url: specification.client_logo_url || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => setIsEditing(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("project_specifications")
        .update({
          title: formData.title,
          spec_type: formData.spec_type,
          spec_number: formData.spec_number,
          revision: formData.revision,
          spec_date: formData.spec_date,
          status: formData.status,
          notes: formData.notes || null,
          prepared_for_company: formData.prepared_for_company || null,
          prepared_for_contact: formData.prepared_for_contact || null,
          prepared_for_tel: formData.prepared_for_tel || null,
          prepared_for_email: formData.prepared_for_email || null,
          consultant_logo_url: formData.consultant_logo_url || null,
          client_logo_url: formData.client_logo_url || null,
        })
        .eq("id", specification.id);

      if (error) throw error;

      toast({ title: "Success", description: "Specification updated successfully" });
      setIsEditing(false);
      onUpdated?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Edit Specification
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={saving}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="icon" onClick={handleSave} disabled={saving}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div>
                <Label>Specification Type</Label>
                <Select value={formData.spec_type} onValueChange={(v) => setFormData({ ...formData, spec_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meter Specification">Meter Specification</SelectItem>
                    <SelectItem value="Technical Specification">Technical Specification</SelectItem>
                    <SelectItem value="Design Specification">Design Specification</SelectItem>
                    <SelectItem value="Installation Specification">Installation Specification</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Spec Number</Label>
                  <Input value={formData.spec_number} onChange={(e) => setFormData({ ...formData, spec_number: e.target.value })} />
                </div>
                <div>
                  <Label>Revision</Label>
                  <Input value={formData.revision} onChange={(e) => setFormData({ ...formData, revision: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={formData.spec_date} onChange={(e) => setFormData({ ...formData, spec_date: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Company</Label>
                <Input value={formData.prepared_for_company} onChange={(e) => setFormData({ ...formData, prepared_for_company: e.target.value })} />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input value={formData.prepared_for_contact} onChange={(e) => setFormData({ ...formData, prepared_for_contact: e.target.value })} />
              </div>
              <div>
                <Label>Telephone</Label>
                <Input value={formData.prepared_for_tel} onChange={(e) => setFormData({ ...formData, prepared_for_tel: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.prepared_for_email} onChange={(e) => setFormData({ ...formData, prepared_for_email: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Consultant Logo</Label>
                <LogoUpload
                  currentUrl={formData.consultant_logo_url}
                  onUrlChange={(url) => setFormData({ ...formData, consultant_logo_url: url })}
                  label="Upload Logo"
                  id="edit-spec-consultant-logo"
                />
              </div>
              <div>
                <Label>Client Logo</Label>
                <LogoUpload
                  currentUrl={formData.client_logo_url}
                  onUrlChange={(url) => setFormData({ ...formData, client_logo_url: url })}
                  label="Upload Logo"
                  id="edit-spec-client-logo"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Specification Information
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <SpecificationExportPDFButton specification={specification} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{specification.spec_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Specification Number</p>
              <p className="font-medium">{specification.spec_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revision</p>
              <p className="font-medium">{specification.revision}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={specification.status === 'draft' ? 'secondary' : 'default'}>
                {specification.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(specification.spec_date), "PPP")}
                </p>
              </div>
            </div>
            {specification.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{specification.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {specification.prepared_for_company && (
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{specification.prepared_for_company}</p>
              </div>
            )}
            {specification.prepared_for_contact && (
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p className="font-medium">{specification.prepared_for_contact}</p>
              </div>
            )}
            {specification.prepared_for_tel && (
              <div>
                <p className="text-sm text-muted-foreground">Telephone</p>
                <p className="font-medium">{specification.prepared_for_tel}</p>
              </div>
            )}
            {specification.prepared_for_email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{specification.prepared_for_email}</p>
              </div>
            )}
            {!specification.prepared_for_company && !specification.prepared_for_contact && (
              <p className="text-sm text-muted-foreground">No client information provided</p>
            )}
          </CardContent>
        </Card>

        {(specification.consultant_logo_url || specification.client_logo_url) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Logos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {specification.consultant_logo_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Consultant Logo</p>
                    <img
                      src={specification.consultant_logo_url}
                      alt="Consultant Logo"
                      className="h-24 object-contain border rounded"
                    />
                  </div>
                )}
                {specification.client_logo_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Client Logo</p>
                    <img
                      src={specification.client_logo_url}
                      alt="Client Logo"
                      className="h-24 object-contain border rounded"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ReportHistoryPanel
        dbTable="specification_reports"
        foreignKeyColumn="specification_id"
        foreignKeyValue={specification.id}
        storageBucket="specification-reports"
        title="Specification Reports"
      />
    </div>
  );
};
