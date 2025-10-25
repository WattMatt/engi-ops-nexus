import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function InvoiceSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    company_reg_no: "",
    vat_number: "",
    address_line1: "",
    address_line2: "",
    postal_address: "",
    phone: "",
    cell: "",
    email: "",
    bank_name: "",
    bank_branch: "",
    bank_account_no: "",
    bank_branch_code: "",
    bank_account_name: "",
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["invoice-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || "",
        company_reg_no: settings.company_reg_no || "",
        vat_number: settings.vat_number || "",
        address_line1: settings.address_line1 || "",
        address_line2: settings.address_line2 || "",
        postal_address: settings.postal_address || "",
        phone: settings.phone || "",
        cell: settings.cell || "",
        email: settings.email || "",
        bank_name: settings.bank_name || "",
        bank_branch: settings.bank_branch || "",
        bank_account_no: settings.bank_account_no || "",
        bank_branch_code: settings.bank_branch_code || "",
        bank_account_name: settings.bank_account_name || "",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("invoice_settings")
        .update(formData)
        .eq("id", settings?.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Invoice settings have been updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Settings</CardTitle>
          <CardDescription>
            Configure your company details for invoicing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company Information</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input
                    value={formData.company_reg_no}
                    onChange={(e) => setFormData({ ...formData, company_reg_no: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>VAT Number</Label>
                  <Input
                    value={formData.vat_number}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Address Information</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Address Line 1</Label>
                <Input
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address Line 2</Label>
                <Input
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Postal Address</Label>
                <Textarea
                  value={formData.postal_address}
                  onChange={(e) => setFormData({ ...formData, postal_address: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cell</Label>
                <Input
                  value={formData.cell}
                  onChange={(e) => setFormData({ ...formData, cell: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Banking Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Banking Details</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  value={formData.bank_account_name}
                  onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input
                    value={formData.bank_branch}
                    onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={formData.bank_account_no}
                    onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch Code</Label>
                  <Input
                    value={formData.bank_branch_code}
                    onChange={(e) => setFormData({ ...formData, bank_branch_code: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
