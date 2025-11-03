import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FinalAccountOverviewProps {
  account: any;
}

export function FinalAccountOverview({ account }: FinalAccountOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    account_number: account.account_number,
    account_name: account.account_name,
    client_name: account.client_name || "",
    contract_value: account.contract_value || "",
    final_value: account.final_value || "",
    variations_total: account.variations_total || "",
    status: account.status,
    submission_date: account.submission_date || "",
    notes: account.notes || "",
  });

  const handleSave = async () => {
    const { error } = await supabase
      .from("final_accounts")
      .update({
        account_number: formData.account_number,
        account_name: formData.account_name,
        client_name: formData.client_name || null,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
        final_value: formData.final_value ? parseFloat(formData.final_value) : null,
        variations_total: formData.variations_total ? parseFloat(formData.variations_total) : null,
        status: formData.status,
        submission_date: formData.submission_date || null,
        notes: formData.notes || null,
      })
      .eq("id", account.id);

    if (error) {
      toast.error("Failed to update final account");
      return;
    }

    toast.success("Final account updated");
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Account Details</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          >
            {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Pencil className="h-4 w-4 mr-2" />}
            {isEditing ? "Save" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Number</Label>
              {isEditing ? (
                <Input
                  value={formData.account_number}
                  onChange={(e) =>
                    setFormData({ ...formData, account_number: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm">{formData.account_number}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              {isEditing ? (
                <Input
                  value={formData.account_name}
                  onChange={(e) =>
                    setFormData({ ...formData, account_name: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm">{formData.account_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Client Name</Label>
              {isEditing ? (
                <Input
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm">{formData.client_name || "N/A"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              {isEditing ? (
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm capitalize">{formData.status}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Contract Value</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.contract_value}
                  onChange={(e) =>
                    setFormData({ ...formData, contract_value: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm">{formData.contract_value ? `$${parseFloat(formData.contract_value).toLocaleString()}` : "N/A"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Final Value</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.final_value}
                  onChange={(e) =>
                    setFormData({ ...formData, final_value: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm">{formData.final_value ? `$${parseFloat(formData.final_value).toLocaleString()}` : "N/A"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Variations Total</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.variations_total}
                  onChange={(e) =>
                    setFormData({ ...formData, variations_total: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm">{formData.variations_total ? `$${parseFloat(formData.variations_total).toLocaleString()}` : "N/A"}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Submission Date</Label>
            {isEditing ? (
              <Input
                type="date"
                value={formData.submission_date}
                onChange={(e) =>
                  setFormData({ ...formData, submission_date: e.target.value })
                }
              />
            ) : (
              <p className="text-sm">{formData.submission_date || "N/A"}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            {isEditing ? (
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={4}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{formData.notes || "No notes"}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
