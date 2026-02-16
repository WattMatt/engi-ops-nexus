import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Download } from "lucide-react";
import { toast } from "sonner";
import { DBLegendCardSubmitDialog } from "./DBLegendCardSubmitDialog";

interface DBLegendCardFormProps {
  cardId: string;
  projectId: string;
  projectName: string;
  projectNumber: string;
  contractorName: string;
  contractorEmail: string;
  onBack: () => void;
}

interface Circuit {
  cb_no: number;
  description: string;
  amp_rating: string;
}

interface Contactor {
  name: string;
  amps: string;
  controlling: string;
  kw: string;
  coil: string;
  poles: string;
}

interface CardData {
  id: string;
  db_name: string;
  address: string;
  phone: string;
  email: string;
  tel_number: string;
  dol_reg_no: string;
  coc_no: string;
  addendum_no: string;
  card_date: string;
  section_name: string;
  fed_from: string;
  feeding_breaker_id: string;
  feeding_system_info: string;
  circuits: Circuit[];
  contactors: Contactor[];
  status: string;
  reviewer_notes: string;
}

const emptyContactor = (): Contactor => ({
  name: "", amps: "", controlling: "", kw: "", coil: "", poles: "",
});

export function DBLegendCardForm({ cardId, projectId, projectName, projectNumber, contractorName, contractorEmail, onBack }: DBLegendCardFormProps) {
  const [form, setForm] = useState<CardData | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: card, isLoading } = useQuery({
    queryKey: ["db-legend-card", cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("db_legend_cards" as any)
        .select("*")
        .eq("id", cardId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (card) {
      const circuits = (card.circuits as Circuit[]) || [];
      const contactors = (card.contactors as Contactor[]) || [];
      // Ensure at least 24 circuit rows
      while (circuits.length < 24) {
        circuits.push({ cb_no: circuits.length + 1, description: "", amp_rating: "" });
      }
      // Ensure at least 3 contactors
      while (contactors.length < 3) {
        contactors.push(emptyContactor());
      }
      setForm({
        id: card.id,
        db_name: card.db_name || "",
        address: card.address || "",
        phone: card.phone || "",
        email: card.email || "",
        tel_number: card.tel_number || "",
        dol_reg_no: card.dol_reg_no || "",
        coc_no: card.coc_no || "",
        addendum_no: card.addendum_no || "",
        card_date: card.card_date || "",
        section_name: card.section_name || "",
        fed_from: card.fed_from || "",
        feeding_breaker_id: card.feeding_breaker_id || "",
        feeding_system_info: card.feeding_system_info || "",
        circuits,
        contactors,
        status: card.status || "draft",
        reviewer_notes: card.reviewer_notes || "",
      });
    }
  }, [card]);

  const updateField = (field: keyof CardData, value: any) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const updateCircuit = (index: number, field: keyof Circuit, value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const circuits = [...prev.circuits];
      circuits[index] = { ...circuits[index], [field]: field === "cb_no" ? parseInt(value) || 0 : value };
      return { ...prev, circuits };
    });
  };

  const addCircuitRows = (count: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const circuits = [...prev.circuits];
      for (let i = 0; i < count; i++) {
        circuits.push({ cb_no: circuits.length + 1, description: "", amp_rating: "" });
      }
      return { ...prev, circuits };
    });
  };

  const removeCircuit = (index: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const circuits = prev.circuits.filter((_, i) => i !== index);
      return { ...prev, circuits };
    });
  };

  const updateContactor = (index: number, field: keyof Contactor, value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const contactors = [...prev.contactors];
      contactors[index] = { ...contactors[index], [field]: value };
      return { ...prev, contactors };
    });
  };

  const handleSave = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    try {
      // Filter out empty circuits for storage
      const nonEmptyCircuits = form.circuits.filter(
        (c) => c.description.trim() || c.amp_rating.trim()
      );
      const { error } = await supabase
        .from("db_legend_cards" as any)
        .update({
          db_name: form.db_name,
          address: form.address,
          phone: form.phone,
          email: form.email,
          tel_number: form.tel_number,
          dol_reg_no: form.dol_reg_no,
          coc_no: form.coc_no,
          addendum_no: form.addendum_no,
          card_date: form.card_date || null,
          section_name: form.section_name,
          fed_from: form.fed_from,
          feeding_breaker_id: form.feeding_breaker_id,
          feeding_system_info: form.feeding_system_info,
          circuits: nonEmptyCircuits,
          contactors: form.contactors,
        } as any)
        .eq("id", cardId);
      if (error) throw error;
      toast.success("Legend card saved");
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }, [form, cardId]);

  const handleSubmitted = () => {
    setSubmitOpen(false);
    onBack();
  };

  const [pdfPageSize, setPdfPageSize] = useState<"A4" | "A5">("A4");

  const handleDownloadPdf = async () => {
    if (!form) return;
    setGeneratingPdf(true);
    try {
      await handleSave();
      const { svgPagesToPdfBlob } = await import("@/utils/svg-pdf/svgToPdfEngine");
      const { buildLegendCardPdf } = await import("@/utils/svg-pdf/legendCardPdfBuilder");
      const { imageToBase64 } = await import("@/utils/svg-pdf/imageUtils");

      const { data: company } = await supabase.from("company_settings").select("company_name, company_logo_url").limit(1).maybeSingle();
      let companyLogoBase64: string | null = null;
      if (company?.company_logo_url) { try { companyLogoBase64 = await imageToBase64(company.company_logo_url); } catch {} }

      const pages = buildLegendCardPdf({
        coverData: {
          reportTitle: "DB Legend Card",
          reportSubtitle: form.db_name,
          projectName: projectName,
          projectNumber: projectNumber,
          date: format(new Date(), "dd MMMM yyyy"),
          companyName: company?.company_name || undefined,
          companyLogoBase64,
        },
        dbName: form.db_name,
        address: form.address || undefined,
        cardDate: form.card_date || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        cocNo: form.coc_no || undefined,
        sectionName: form.section_name || undefined,
        fedFrom: form.fed_from || undefined,
        circuits: form.circuits.filter(c => c.description.trim() || c.amp_rating.trim()),
        contactors: form.contactors,
      });

      const { blob } = await svgPagesToPdfBlob(pages);
      const sizeLabel = pdfPageSize === "A5" ? "_A5" : "";
      const filename = `${form.db_name.replace(/[^a-zA-Z0-9._-]/g, '_')}${sizeLabel}_Legend_Card.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`PDF downloaded (${pdfPageSize})`);
    } catch (err: any) {
      toast.error("PDF generation failed: " + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (isLoading || !form) {
    return <p className="text-muted-foreground text-sm p-4">Loading legend card...</p>;
  }

  const isReadOnly = form.status === "submitted" || form.status === "approved";

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <Badge variant={form.status === "approved" ? "default" : form.status === "rejected" ? "destructive" : "secondary"}>
          {form.status.toUpperCase()}
        </Badge>
        <div className="flex gap-2">
          <Select value={pdfPageSize} onValueChange={(v) => setPdfPageSize(v as "A4" | "A5")}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="A5">A5</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={generatingPdf}>
            <Download className="h-4 w-4 mr-1" /> {generatingPdf ? "Generating..." : "PDF"}
          </Button>
          {!isReadOnly && (
            <>
              <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button size="sm" onClick={() => { handleSave(); setSubmitOpen(true); }}>
                Submit for Review
              </Button>
            </>
          )}
        </div>
      </div>

      {form.reviewer_notes && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <p className="text-sm font-medium text-destructive">Reviewer Notes:</p>
          <p className="text-sm">{form.reviewer_notes}</p>
        </div>
      )}

      {/* Header Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Board Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label>DB Name</Label><Input value={form.db_name} onChange={(e) => updateField("db_name", e.target.value)} disabled={isReadOnly} /></div>
          <div><Label>Date</Label><Input type="date" value={form.card_date} onChange={(e) => updateField("card_date", e.target.value)} disabled={isReadOnly} /></div>
          <div><Label>COC No</Label><Input value={form.coc_no} onChange={(e) => updateField("coc_no", e.target.value)} disabled={isReadOnly} /></div>
          <div><Label>Addendum No</Label><Input value={form.addendum_no} onChange={(e) => updateField("addendum_no", e.target.value)} disabled={isReadOnly} /></div>
          <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => updateField("address", e.target.value)} disabled={isReadOnly} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} disabled={isReadOnly} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => updateField("email", e.target.value)} disabled={isReadOnly} /></div>
          <div><Label>Tel Number</Label><Input value={form.tel_number} onChange={(e) => updateField("tel_number", e.target.value)} disabled={isReadOnly} /></div>
          <div><Label>DOL Reg No</Label><Input value={form.dol_reg_no} onChange={(e) => updateField("dol_reg_no", e.target.value)} disabled={isReadOnly} /></div>
        </CardContent>
      </Card>

      {/* Section Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Section Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2"><Label>Section Name</Label><Input placeholder="e.g. EMERGENCY SECTION" value={form.section_name} onChange={(e) => updateField("section_name", e.target.value)} disabled={isReadOnly} /></div>
          <div><Label>Fed From</Label><Input placeholder="e.g. MAIN BOARD 1.2" value={form.fed_from} onChange={(e) => updateField("fed_from", e.target.value)} disabled={isReadOnly} /></div>
          <div><Label>Feeding Breaker ID</Label><Input value={form.feeding_breaker_id} onChange={(e) => updateField("feeding_breaker_id", e.target.value)} disabled={isReadOnly} /></div>
          <div className="col-span-2 md:col-span-4"><Label>Feeding System / Cabling Info</Label><Textarea value={form.feeding_system_info} onChange={(e) => updateField("feeding_system_info", e.target.value)} disabled={isReadOnly} /></div>
        </CardContent>
      </Card>

      {/* Circuit Breaker Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Circuit Breaker Schedule</CardTitle>
            {!isReadOnly && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addCircuitRows(12)}>
                  <Plus className="h-4 w-4 mr-1" /> Add 12 Rows
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Split into two columns */}
            {[0, 1].map((colIdx) => {
              const half = Math.ceil(form.circuits.length / 2);
              const start = colIdx * half;
              const end = start + half;
              const colCircuits = form.circuits.slice(start, end);
              return (
                <div key={colIdx}>
                  <div className="grid grid-cols-[60px_1fr_80px_40px] gap-1 text-xs font-medium text-muted-foreground mb-1 px-1">
                    <span>CB#</span><span>Description</span><span>Amps</span><span></span>
                  </div>
                  <div className="space-y-1">
                    {colCircuits.map((circuit, localIdx) => {
                      const idx = start + localIdx;
                      return (
                        <div key={idx} className="grid grid-cols-[60px_1fr_80px_40px] gap-1 items-center">
                          <Input
                            className="h-8 text-xs text-center"
                            value={circuit.cb_no}
                            onChange={(e) => updateCircuit(idx, "cb_no", e.target.value)}
                            disabled={isReadOnly}
                          />
                          <Input
                            className="h-8 text-xs"
                            placeholder="Description"
                            value={circuit.description}
                            onChange={(e) => updateCircuit(idx, "description", e.target.value)}
                            disabled={isReadOnly}
                          />
                          <Input
                            className="h-8 text-xs"
                            placeholder="A"
                            value={circuit.amp_rating}
                            onChange={(e) => updateCircuit(idx, "amp_rating", e.target.value)}
                            disabled={isReadOnly}
                          />
                          {!isReadOnly && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeCircuit(idx)}>
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contactor Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Contactor Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {form.contactors.map((c, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">Contactor C{idx + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Amps</Label><Input className="h-8 text-xs" value={c.amps} onChange={(e) => updateContactor(idx, "amps", e.target.value)} disabled={isReadOnly} /></div>
                  <div><Label className="text-xs">KW</Label><Input className="h-8 text-xs" value={c.kw} onChange={(e) => updateContactor(idx, "kw", e.target.value)} disabled={isReadOnly} /></div>
                  <div><Label className="text-xs">Coil</Label><Input className="h-8 text-xs" value={c.coil} onChange={(e) => updateContactor(idx, "coil", e.target.value)} disabled={isReadOnly} /></div>
                  <div><Label className="text-xs">Poles</Label><Input className="h-8 text-xs" value={c.poles} onChange={(e) => updateContactor(idx, "poles", e.target.value)} disabled={isReadOnly} /></div>
                  <div className="col-span-2"><Label className="text-xs">Controlling</Label><Input className="h-8 text-xs" value={c.controlling} onChange={(e) => updateContactor(idx, "controlling", e.target.value)} disabled={isReadOnly} /></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit Dialog */}
      <DBLegendCardSubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        cardId={cardId}
        projectId={projectId}
        contractorName={contractorName}
        contractorEmail={contractorEmail}
        dbName={form.db_name}
        onSubmitted={handleSubmitted}
      />
    </div>
  );
}
