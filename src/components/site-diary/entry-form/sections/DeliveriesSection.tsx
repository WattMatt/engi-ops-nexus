import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, Plus, Trash2, Package } from "lucide-react";
import { DiaryFormData, DeliveryEntry } from "../DiaryEntryFormDialog";

interface DeliveriesSectionProps {
  formData: DiaryFormData;
  updateFormData: (updates: Partial<DiaryFormData>) => void;
}

const DELIVERY_STATUSES = [
  { value: "received", label: "Received", color: "bg-green-500" },
  { value: "partial", label: "Partial Delivery", color: "bg-amber-500" },
  { value: "rejected", label: "Rejected", color: "bg-red-500" },
  { value: "pending", label: "Pending", color: "bg-blue-500" },
];

export const DeliveriesSection = ({
  formData,
  updateFormData,
}: DeliveriesSectionProps) => {
  const [newDelivery, setNewDelivery] = useState({
    description: "",
    supplier: "",
    quantity: "",
    status: "received" as const,
    notes: "",
  });

  const addDelivery = () => {
    if (!newDelivery.description) return;

    const entry: DeliveryEntry = {
      id: `del_${Date.now()}`,
      ...newDelivery,
    };

    updateFormData({
      deliveries: [...formData.deliveries, entry],
    });

    setNewDelivery({
      description: "",
      supplier: "",
      quantity: "",
      status: "received",
      notes: "",
    });
  };

  const removeDelivery = (id: string) => {
    updateFormData({
      deliveries: formData.deliveries.filter((d) => d.id !== id),
    });
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = DELIVERY_STATUSES.find((s) => s.value === status);
    return (
      <Badge
        variant="secondary"
        className={`${
          status === "received"
            ? "bg-green-100 text-green-800"
            : status === "partial"
            ? "bg-amber-100 text-amber-800"
            : status === "rejected"
            ? "bg-red-100 text-red-800"
            : "bg-blue-100 text-blue-800"
        }`}
      >
        {statusInfo?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Material Deliveries
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Record all materials delivered to site today for tracking and project records
        </p>
      </div>

      {/* Add New Delivery */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Material Description *</Label>
              <Input
                id="description"
                placeholder="e.g., Reinforcement steel Y16"
                value={newDelivery.description}
                onChange={(e) =>
                  setNewDelivery({ ...newDelivery, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                placeholder="Supplier name"
                value={newDelivery.supplier}
                onChange={(e) =>
                  setNewDelivery({ ...newDelivery, supplier: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                placeholder="e.g., 5 tons, 200 units"
                value={newDelivery.quantity}
                onChange={(e) =>
                  setNewDelivery({ ...newDelivery, quantity: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newDelivery.status}
                onValueChange={(value: any) =>
                  setNewDelivery({ ...newDelivery, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any issues, discrepancies, or special notes about this delivery..."
              value={newDelivery.notes}
              onChange={(e) =>
                setNewDelivery({ ...newDelivery, notes: e.target.value })
              }
              rows={2}
            />
          </div>
          <Button
            type="button"
            onClick={addDelivery}
            disabled={!newDelivery.description}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Delivery
          </Button>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      {formData.deliveries.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Today's Deliveries</Label>
          <div className="space-y-3">
            {formData.deliveries.map((delivery) => (
              <Card key={delivery.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{delivery.description}</p>
                          {getStatusBadge(delivery.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {delivery.supplier && <span>Supplier: {delivery.supplier}</span>}
                          {delivery.quantity && <span>Qty: {delivery.quantity}</span>}
                        </div>
                        {delivery.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {delivery.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDelivery(delivery.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Truck className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No deliveries recorded yet. Add materials received today.
          </p>
        </div>
      )}
    </div>
  );
};
