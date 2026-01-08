import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Plus, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { DiaryFormData, InstructionEntry } from "../DiaryEntryFormDialog";

interface InstructionsSectionProps {
  formData: DiaryFormData;
  updateFormData: (updates: Partial<DiaryFormData>) => void;
}

const INSTRUCTION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "actioned", label: "Actioned" },
  { value: "closed", label: "Closed" },
];

export const InstructionsSection = ({
  formData,
  updateFormData,
}: InstructionsSectionProps) => {
  const [activeTab, setActiveTab] = useState("received");
  const [newReceived, setNewReceived] = useState({
    reference: "",
    description: "",
    receivedFrom: "",
    status: "pending" as const,
  });
  const [newIssued, setNewIssued] = useState({
    reference: "",
    description: "",
    issuedBy: "",
    status: "pending" as const,
  });

  const addReceivedInstruction = () => {
    if (!newReceived.description) return;

    const entry: InstructionEntry = {
      id: `ir_${Date.now()}`,
      reference: newReceived.reference,
      description: newReceived.description,
      receivedFrom: newReceived.receivedFrom,
      date: format(new Date(), "yyyy-MM-dd"),
      status: newReceived.status,
    };

    updateFormData({
      instructionsReceived: [...formData.instructionsReceived, entry],
    });

    setNewReceived({
      reference: "",
      description: "",
      receivedFrom: "",
      status: "pending",
    });
  };

  const addIssuedInstruction = () => {
    if (!newIssued.description) return;

    const entry: InstructionEntry = {
      id: `ii_${Date.now()}`,
      reference: newIssued.reference,
      description: newIssued.description,
      issuedBy: newIssued.issuedBy,
      date: format(new Date(), "yyyy-MM-dd"),
      status: newIssued.status,
    };

    updateFormData({
      instructionsIssued: [...formData.instructionsIssued, entry],
    });

    setNewIssued({
      reference: "",
      description: "",
      issuedBy: "",
      status: "pending",
    });
  };

  const removeInstruction = (id: string, type: "received" | "issued") => {
    if (type === "received") {
      updateFormData({
        instructionsReceived: formData.instructionsReceived.filter((i) => i.id !== id),
      });
    } else {
      updateFormData({
        instructionsIssued: formData.instructionsIssued.filter((i) => i.id !== id),
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      acknowledged: "bg-blue-100 text-blue-800",
      actioned: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge variant="secondary" className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Site Instructions
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Track instructions received from consultants and issued to subcontractors.
          This maintains a clear audit trail for project records.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Received ({formData.instructionsReceived.length})
          </TabsTrigger>
          <TabsTrigger value="issued" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Issued ({formData.instructionsIssued.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Instructions Received (from Architect/Engineer/Client)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="receivedRef">Reference No.</Label>
                  <Input
                    id="receivedRef"
                    placeholder="e.g., SI-001, RFI-045"
                    value={newReceived.reference}
                    onChange={(e) =>
                      setNewReceived({ ...newReceived, reference: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receivedFrom">Received From</Label>
                  <Input
                    id="receivedFrom"
                    placeholder="e.g., Architect, Structural Engineer"
                    value={newReceived.receivedFrom}
                    onChange={(e) =>
                      setNewReceived({ ...newReceived, receivedFrom: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivedDesc">Description *</Label>
                <Textarea
                  id="receivedDesc"
                  placeholder="Describe the instruction received..."
                  value={newReceived.description}
                  onChange={(e) =>
                    setNewReceived({ ...newReceived, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1">
                  <Label>Status</Label>
                  <Select
                    value={newReceived.status}
                    onValueChange={(value: any) =>
                      setNewReceived({ ...newReceived, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTRUCTION_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={addReceivedInstruction}
                  disabled={!newReceived.description}
                  className="mt-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {formData.instructionsReceived.length > 0 && (
            <div className="space-y-2">
              {formData.instructionsReceived.map((instruction) => (
                <Card key={instruction.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {instruction.reference && (
                            <Badge variant="outline">{instruction.reference}</Badge>
                          )}
                          {getStatusBadge(instruction.status)}
                        </div>
                        <p className="font-medium">{instruction.description}</p>
                        {instruction.receivedFrom && (
                          <p className="text-sm text-muted-foreground">
                            From: {instruction.receivedFrom}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInstruction(instruction.id, "received")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="issued" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Instructions Issued (to Subcontractors)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issuedRef">Reference No.</Label>
                  <Input
                    id="issuedRef"
                    placeholder="e.g., SI-001"
                    value={newIssued.reference}
                    onChange={(e) =>
                      setNewIssued({ ...newIssued, reference: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issuedTo">Issued By</Label>
                  <Input
                    id="issuedTo"
                    placeholder="e.g., Site Agent"
                    value={newIssued.issuedBy}
                    onChange={(e) =>
                      setNewIssued({ ...newIssued, issuedBy: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issuedDesc">Description *</Label>
                <Textarea
                  id="issuedDesc"
                  placeholder="Describe the instruction issued..."
                  value={newIssued.description}
                  onChange={(e) =>
                    setNewIssued({ ...newIssued, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1">
                  <Label>Status</Label>
                  <Select
                    value={newIssued.status}
                    onValueChange={(value: any) =>
                      setNewIssued({ ...newIssued, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTRUCTION_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={addIssuedInstruction}
                  disabled={!newIssued.description}
                  className="mt-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {formData.instructionsIssued.length > 0 && (
            <div className="space-y-2">
              {formData.instructionsIssued.map((instruction) => (
                <Card key={instruction.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {instruction.reference && (
                            <Badge variant="outline">{instruction.reference}</Badge>
                          )}
                          {getStatusBadge(instruction.status)}
                        </div>
                        <p className="font-medium">{instruction.description}</p>
                        {instruction.issuedBy && (
                          <p className="text-sm text-muted-foreground">
                            By: {instruction.issuedBy}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInstruction(instruction.id, "issued")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
