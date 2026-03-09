import { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, ShieldCheck, ShieldAlert, AlertTriangle, Check, X, Save, FileWarning } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  COCData,
  COCTestReport,
  COCValidationResult,
  validateCOC,
} from "@/utils/cocValidationEngine";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ============================================
// Schema
// ============================================

const cocFormSchema = z.object({
  cocReferenceNumber: z.string().min(1, "Reference number is required"),
  certificateType: z.enum(["initial", "re-inspection", "alteration"]),
  installationAddress: z.string().min(1, "Address is required"),
  installationType: z.enum(["residential", "commercial", "industrial"]),
  phaseConfiguration: z.enum(["single_phase", "three_phase"]),
  supplyVoltage: z.coerce.number().positive().default(230),
  supplyFrequency: z.coerce.number().positive().default(50),

  registeredPersonName: z.string().min(1, "Name is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  registrationCategory: z.enum([
    "electrical_tester_single_phase",
    "installation_electrician",
    "master_installation_electrician",
  ]),
  hasSignature: z.boolean().default(false),
  signatureDate: z.date().nullable().optional(),

  insulationResistance_MOhm: z.coerce.number().nullable().optional(),
  earthLoopImpedance_Zs_Ohm: z.coerce.number().nullable().optional(),
  rcdTripTime_ms: z.coerce.number().nullable().optional(),
  rcdRatedCurrent_mA: z.coerce.number().positive().default(30),
  pscc_kA: z.coerce.number().nullable().optional(),
  earthContinuity_Ohm: z.coerce.number().nullable().optional(),
  voltageAtMainDB_V: z.coerce.number().nullable().optional(),
  polarityCorrect: z.boolean().default(false),

  hasSolarPV: z.boolean().default(false),
  hasBESS: z.boolean().default(false),
  solarGroundingVerified: z.boolean().nullable().optional(),
  inverterSyncVerified: z.boolean().nullable().optional(),
  bessFireProtection: z.boolean().nullable().optional(),
  spdOperational: z.boolean().nullable().optional(),
  afddInstalled: z.boolean().nullable().optional(),
});

type COCFormValues = z.infer<typeof cocFormSchema>;

// ============================================
// Helpers
// ============================================

function parseNullableNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function buildCOCData(v: COCFormValues): COCData {
  return {
    cocReferenceNumber: v.cocReferenceNumber,
    certificateType: v.certificateType,
    installationAddress: v.installationAddress,
    registeredPersonName: v.registeredPersonName,
    registrationNumber: v.registrationNumber,
    registrationCategory: v.registrationCategory,
    dateOfIssue: v.signatureDate ? v.signatureDate.toISOString() : new Date().toISOString(),
    installationType: v.installationType,
    phaseConfiguration: v.phaseConfiguration,
    supplyVoltage: v.supplyVoltage,
    supplyFrequency: v.supplyFrequency,
  };
}

function buildTestReport(v: COCFormValues): COCTestReport {
  return {
    insulationResistance_MOhm: parseNullableNumber(v.insulationResistance_MOhm),
    earthLoopImpedance_Zs_Ohm: parseNullableNumber(v.earthLoopImpedance_Zs_Ohm),
    rcdTripTime_ms: parseNullableNumber(v.rcdTripTime_ms),
    rcdRatedCurrent_mA: v.rcdRatedCurrent_mA ?? 30,
    pscc_kA: parseNullableNumber(v.pscc_kA),
    earthContinuity_Ohm: parseNullableNumber(v.earthContinuity_Ohm),
    voltageAtMainDB_V: parseNullableNumber(v.voltageAtMainDB_V),
    polarityCorrect: v.polarityCorrect,
    hasSignature: v.hasSignature,
    signatureDate: v.signatureDate ? v.signatureDate.toISOString() : null,
    hasSolarPV: v.hasSolarPV,
    hasBESS: v.hasBESS,
    solarGroundingVerified: v.solarGroundingVerified ?? null,
    inverterSyncVerified: v.inverterSyncVerified ?? null,
    bessFireProtection: v.bessFireProtection ?? null,
    spdOperational: v.spdOperational ?? null,
    afddInstalled: v.afddInstalled ?? null,
  };
}

// ============================================
// Inline validation indicator for test fields
// ============================================

interface ThresholdIndicatorProps {
  value: number | null | undefined;
  check: (v: number) => "pass" | "fail" | "warning";
  label: string;
}

function ThresholdIndicator({ value, check, label }: ThresholdIndicatorProps) {
  if (value === null || value === undefined || value === (undefined as any)) {
    return <span className="text-xs text-muted-foreground">{label}</span>;
  }
  const status = check(value);
  return (
    <span
      className={cn(
        "text-xs font-medium",
        status === "pass" && "text-green-600 dark:text-green-400",
        status === "fail" && "text-destructive",
        status === "warning" && "text-amber-600 dark:text-amber-400"
      )}
    >
      {status === "pass" && "✓ PASS"} 
      {status === "fail" && "✗ FAIL"} 
      {status === "warning" && "⚠ WARNING"} 
      — {label}
    </span>
  );
}

// ============================================
// Main Component
// ============================================

export function COCValidationForm() {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<COCFormValues>({
    resolver: zodResolver(cocFormSchema),
    defaultValues: {
      cocReferenceNumber: "",
      certificateType: "initial",
      installationAddress: "",
      installationType: "residential",
      phaseConfiguration: "single_phase",
      supplyVoltage: 230,
      supplyFrequency: 50,
      registeredPersonName: "",
      registrationNumber: "",
      registrationCategory: "installation_electrician",
      hasSignature: false,
      signatureDate: null,
      insulationResistance_MOhm: null,
      earthLoopImpedance_Zs_Ohm: null,
      rcdTripTime_ms: null,
      rcdRatedCurrent_mA: 30,
      pscc_kA: null,
      earthContinuity_Ohm: null,
      voltageAtMainDB_V: null,
      polarityCorrect: false,
      hasSolarPV: false,
      hasBESS: false,
      solarGroundingVerified: null,
      inverterSyncVerified: null,
      bessFireProtection: null,
      spdOperational: null,
      afddInstalled: null,
    },
  });

  const watchedValues = form.watch();

  const validationResult: COCValidationResult | null = useMemo(() => {
    try {
      const data = buildCOCData(watchedValues);
      const test = buildTestReport(watchedValues);
      return validateCOC(data, test);
    } catch {
      return null;
    }
  }, [watchedValues]);

  const hasMissingMandatory = useMemo(() => {
    const v = watchedValues;
    return (
      parseNullableNumber(v.insulationResistance_MOhm) === null ||
      parseNullableNumber(v.earthLoopImpedance_Zs_Ohm) === null ||
      parseNullableNumber(v.rcdTripTime_ms) === null ||
      parseNullableNumber(v.pscc_kA) === null
    );
  }, [watchedValues]);

  const onSubmit = useCallback(async (values: COCFormValues) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save");
        return;
      }

      const data = buildCOCData(values);
      const test = buildTestReport(values);
      const result = validateCOC(data, test);
      const projectId = localStorage.getItem("selectedProjectId");

      const { error } = await supabase.from("coc_validations").insert({
        project_id: projectId || null,
        created_by: user.id,
        coc_reference_number: values.cocReferenceNumber,
        certificate_type: values.certificateType,
        installation_address: values.installationAddress,
        installation_type: values.installationType,
        phase_configuration: values.phaseConfiguration,
        supply_voltage: values.supplyVoltage,
        supply_frequency: values.supplyFrequency,
        registered_person_name: values.registeredPersonName,
        registration_number: values.registrationNumber,
        registration_category: values.registrationCategory,
        insulation_resistance_mohm: parseNullableNumber(values.insulationResistance_MOhm),
        earth_loop_impedance_zs_ohm: parseNullableNumber(values.earthLoopImpedance_Zs_Ohm),
        rcd_trip_time_ms: parseNullableNumber(values.rcdTripTime_ms),
        rcd_rated_current_ma: values.rcdRatedCurrent_mA,
        pscc_ka: parseNullableNumber(values.pscc_kA),
        earth_continuity_ohm: parseNullableNumber(values.earthContinuity_Ohm),
        voltage_at_main_db_v: parseNullableNumber(values.voltageAtMainDB_V),
        polarity_correct: values.polarityCorrect,
        has_signature: values.hasSignature,
        signature_date: values.signatureDate ? format(values.signatureDate, "yyyy-MM-dd") : null,
        has_solar_pv: values.hasSolarPV,
        has_bess: values.hasBESS,
        solar_grounding_verified: values.solarGroundingVerified ?? null,
        inverter_sync_verified: values.inverterSyncVerified ?? null,
        bess_fire_protection: values.bessFireProtection ?? null,
        spd_operational: values.spdOperational ?? null,
        afdd_installed: values.afddInstalled ?? null,
        validation_status: result.status,
        fraud_risk_score: result.fraudRiskScore,
        passed_rules_count: result.passedRules.length,
        failed_rules_count: result.failedRules.length,
        validation_result: result as any,
      });

      if (error) throw error;
      toast.success("COC validation saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save COC validation");
    } finally {
      setIsSaving(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">COC Validation</h1>
        <p className="text-muted-foreground">
          Validate Certificates of Compliance per OHS Act 85/1993 &amp; SANS 10142-1:2024.
          All test fields require empirical numerical measurements.
        </p>
      </div>

      {hasMissingMandatory && (
        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>Incomplete Certificate</AlertTitle>
          <AlertDescription>
            One or more mandatory test measurements are missing. A COC without all Section 4
            test values is legally void per the OHS Act.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ====== Section 1: Certificate Details ====== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Certificate Details</CardTitle>
              <CardDescription>Basic information about the certificate and installation</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField control={form.control} name="cocReferenceNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>COC Reference Number</FormLabel>
                  <FormControl><Input placeholder="e.g. COC-2024-001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="certificateType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificate Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="initial">Initial</SelectItem>
                      <SelectItem value="re-inspection">Re-inspection</SelectItem>
                      <SelectItem value="alteration">Alteration</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="installationAddress" render={({ field }) => (
                <FormItem className="md:col-span-2 lg:col-span-1">
                  <FormLabel>Installation Address</FormLabel>
                  <FormControl><Input placeholder="Full address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="installationType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Installation Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="phaseConfiguration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase Configuration</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="single_phase">Single Phase</SelectItem>
                      <SelectItem value="three_phase">Three Phase</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="supplyVoltage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Supply Voltage (V)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="supplyFrequency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Supply Frequency (Hz)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* ====== Section 2: Registered Person ====== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Registered Person (Issuer)</CardTitle>
              <CardDescription>Details of the person issuing the certificate</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="registeredPersonName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="e.g. John Smith" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number</FormLabel>
                  <FormControl><Input placeholder="e.g. EL/2024/12345" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="registrationCategory" render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="electrical_tester_single_phase">Electrical Tester (Single Phase)</SelectItem>
                      <SelectItem value="installation_electrician">Installation Electrician (IE)</SelectItem>
                      <SelectItem value="master_installation_electrician">Master Installation Electrician (MIE)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-4">
                <FormField control={form.control} name="hasSignature" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Signature Present</FormLabel>
                  </FormItem>
                )} />

                <FormField control={form.control} name="signatureDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Signature Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* ====== Section 3: Test Report ====== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Section 4 Test Report</CardTitle>
              <CardDescription>
                <span className="text-destructive font-medium">CRITICAL:</span> All values must be empirical numerical measurements.
                Checkmarks, "OK", or "Pass" entries are legally void per OHS Act.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Insulation Resistance */}
                <FormField control={form.control} name="insulationResistance_MOhm" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Insulation Resistance (MΩ)</FormLabel>
                      <ThresholdIndicator
                        value={parseNullableNumber(field.value)}
                        check={(v) => v > 1.0 ? "pass" : "fail"}
                        label="Min: 1.0 MΩ"
                      />
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 2.5"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Earth Loop Impedance */}
                <FormField control={form.control} name="earthLoopImpedance_Zs_Ohm" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Earth Loop Impedance Zs (Ω)</FormLabel>
                      <ThresholdIndicator
                        value={parseNullableNumber(field.value)}
                        check={(v) => v <= 0 ? "fail" : v <= 1.67 ? "pass" : "warning"}
                        label="Max: 1.67 Ω for Type B MCB"
                      />
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 0.85"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* RCD Trip Time */}
                <FormField control={form.control} name="rcdTripTime_ms" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>RCD Trip Time (ms)</FormLabel>
                      <ThresholdIndicator
                        value={parseNullableNumber(field.value)}
                        check={(v) => v > 300 ? "fail" : v > 200 ? "warning" : "pass"}
                        label="Max: 300ms for 30mA device"
                      />
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="e.g. 28"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* RCD Rated Current */}
                <FormField control={form.control} name="rcdRatedCurrent_mA" render={({ field }) => (
                  <FormItem>
                    <FormLabel>RCD Rated Current (mA)</FormLabel>
                    <FormControl><Input type="number" step="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* PSCC */}
                <FormField control={form.control} name="pscc_kA" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>PSCC (kA)</FormLabel>
                      <ThresholdIndicator
                        value={parseNullableNumber(field.value)}
                        check={(v) => v <= 0 ? "fail" : (v < 0.5 || v > 25) ? "warning" : "pass"}
                        label="Normal range: 0.5–25 kA"
                      />
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 6.5"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Earth Continuity */}
                <FormField control={form.control} name="earthContinuity_Ohm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Earth Continuity (Ω)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 0.15"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Voltage at Main DB */}
                <FormField control={form.control} name="voltageAtMainDB_V" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voltage at Main DB (V)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 232"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Polarity */}
                <FormField control={form.control} name="polarityCorrect" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 pt-6">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Polarity Correct</FormLabel>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* ====== Section 4: Solar/BESS ====== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. SANS 10142-1:2024 — New Technology</CardTitle>
              <CardDescription>Solar PV, BESS, SPD and AFDD compliance checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6">
                <FormField control={form.control} name="hasSolarPV" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal">Has Solar PV</FormLabel>
                  </FormItem>
                )} />

                <FormField control={form.control} name="hasBESS" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal">Has BESS</FormLabel>
                  </FormItem>
                )} />
              </div>

              {watchedValues.hasSolarPV && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
                  <p className="col-span-full text-sm font-medium text-muted-foreground">Solar PV Checks</p>
                  <FormField control={form.control} name="solarGroundingVerified" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal">Solar Grounding Verified</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="inverterSyncVerified" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal">Inverter Sync Verified</FormLabel>
                    </FormItem>
                  )} />
                </div>
              )}

              {watchedValues.hasBESS && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium text-muted-foreground mb-2">BESS Checks</p>
                  <FormField control={form.control} name="bessFireProtection" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal">BESS Fire Protection Verified</FormLabel>
                    </FormItem>
                  )} />
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="spdOperational" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal">SPD Operational <span className="text-destructive">(Mandatory)</span></FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="afddInstalled" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal">AFDD Installed</FormLabel>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* ====== Validation Results Panel ====== */}
          {validationResult && <ValidationResultsPanel result={validationResult} />}

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving…" : "Save COC Validation"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ============================================
// Validation Results Panel
// ============================================

function ValidationResultsPanel({ result }: { result: COCValidationResult }) {
  const statusConfig = {
    VALID: { color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", icon: ShieldCheck, label: "VALID" },
    INVALID: { color: "bg-destructive/10 text-destructive", icon: ShieldAlert, label: "INVALID" },
    REQUIRES_REVIEW: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: AlertTriangle, label: "REQUIRES REVIEW" },
  };

  const fraudConfig = {
    LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    HIGH: "bg-destructive/10 text-destructive",
  };

  const status = statusConfig[result.status];
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            Validation Results
          </CardTitle>
          <div className="flex gap-2">
            <Badge className={cn("text-sm", status.color)}>{status.label}</Badge>
            <Badge className={cn("text-sm", fraudConfig[result.fraudRiskScore])}>
              Fraud Risk: {result.fraudRiskScore}
            </Badge>
          </div>
        </div>
        <CardDescription>
          {result.passedRules.length} of {result.totalRulesChecked} rules passed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fraud risk reasons */}
        {result.fraudRiskScore !== "LOW" && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Fraud Risk: {result.fraudRiskScore}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {result.fraudRiskReasons.map((r, i) => (
                  <li key={i} className="text-sm">{r}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Failed rules */}
        {result.failedRules.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-destructive">Failed Rules</h4>
            {result.failedRules.map((rule) => (
              <div key={rule.ruleId} className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <X className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{rule.ruleName}</span>
                    <Badge variant="outline" className="text-[10px]">{rule.ruleId}</Badge>
                    <Badge className={cn(
                      "text-[10px]",
                      rule.severity === "CRITICAL" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    )}>
                      {rule.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{rule.message}</p>
                  {rule.actualValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Actual:</span> {rule.actualValue}
                      {rule.expectedValue && <> · <span className="font-medium">Expected:</span> {rule.expectedValue}</>}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 italic mt-0.5">Ref: {rule.reference}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Passed rules */}
        {result.passedRules.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">Passed Rules</h4>
            {result.passedRules.map((rule) => (
              <div key={rule.ruleId} className="flex items-center gap-2 p-2 rounded-md bg-green-50/50 dark:bg-green-950/20">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-sm">{rule.ruleName}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{rule.ruleId}</Badge>
                {rule.severity === "WARNING" && (
                  <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">WARNING</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
