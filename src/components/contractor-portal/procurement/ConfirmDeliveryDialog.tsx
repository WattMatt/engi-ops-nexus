import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ConfirmDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  contractorName: string;
  contractorEmail: string;
  companyName: string | null;
}

type ConditionStatus = 'good' | 'damaged' | 'incomplete';

const conditionOptions: { value: ConditionStatus; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'good', 
    label: 'Good Condition', 
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    description: 'Item received in good condition, no issues'
  },
  { 
    value: 'damaged', 
    label: 'Damaged', 
    icon: <XCircle className="h-5 w-5 text-destructive" />,
    description: 'Item shows signs of damage'
  },
  { 
    value: 'incomplete', 
    label: 'Incomplete', 
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    description: 'Some parts or items are missing'
  },
];

export function ConfirmDeliveryDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
  contractorName,
  contractorEmail,
  companyName,
}: ConfirmDeliveryDialogProps) {
  const [conditionStatus, setConditionStatus] = useState<ConditionStatus>('good');
  const [notes, setNotes] = useState('');
  
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: async () => {
      // Insert delivery confirmation
      const { error: confirmError } = await supabase
        .from('procurement_delivery_confirmations')
        .insert({
          procurement_item_id: itemId,
          confirmed_by_name: contractorName,
          confirmed_by_email: contractorEmail,
          confirmed_by_company: companyName,
          condition_status: conditionStatus,
          condition_notes: notes || null,
        });

      if (confirmError) throw confirmError;

      // Update actual delivery date on the item
      const { error: updateError } = await supabase
        .from('project_procurement_items')
        .update({ 
          actual_delivery: new Date().toISOString().split('T')[0]
        })
        .eq('id', itemId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success('Delivery confirmed successfully');
      queryClient.invalidateQueries({ queryKey: ['contractor-procurement'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-item-detail', itemId] });
      onOpenChange(false);
      setConditionStatus('good');
      setNotes('');
    },
    onError: (error: Error) => {
      toast.error('Failed to confirm delivery: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirmMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Delivery</DialogTitle>
          <DialogDescription>
            Confirm receipt of: <span className="font-medium">{itemName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Condition Status */}
          <div className="space-y-3">
            <Label>Delivery Condition</Label>
            <RadioGroup
              value={conditionStatus}
              onValueChange={(value) => setConditionStatus(value as ConditionStatus)}
              className="space-y-2"
            >
              {conditionOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    conditionStatus === option.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <div className="flex items-start gap-2">
                    {option.icon}
                    <div>
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="delivery-notes">
              Notes {conditionStatus !== 'good' && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="delivery-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                conditionStatus === 'good' 
                  ? "Optional notes about the delivery..."
                  : "Please describe the issue..."
              }
              rows={3}
              required={conditionStatus !== 'good'}
            />
          </div>

          {/* Confirming As */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground">Confirming as:</p>
            <p className="font-medium">{contractorName}</p>
            {companyName && <p className="text-muted-foreground">{companyName}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={confirmMutation.isPending || (conditionStatus !== 'good' && !notes.trim())}
            >
              {confirmMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Delivery
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
