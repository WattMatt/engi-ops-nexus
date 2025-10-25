import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentScheduleManager } from "./PaymentScheduleManager";
import { Calendar, DollarSign } from "lucide-react";

interface ProjectDetailsDialogProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectDetailsDialog({ project, open, onOpenChange }: ProjectDetailsDialogProps) {
  if (!project) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project.project_name}</DialogTitle>
          <DialogDescription>
            Manage project details and payment schedule
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Client</p>
            <p className="font-medium">{project.client_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Agreed Fee</p>
            <p className="font-medium">{formatCurrency(project.agreed_fee)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="font-medium">{formatCurrency(project.outstanding_amount)}</p>
          </div>
        </div>

        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList>
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Payment Schedule
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <DollarSign className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <PaymentScheduleManager projectId={project.id} />
          </TabsContent>

          <TabsContent value="invoices">
            <div className="text-sm text-muted-foreground">
              Invoice history will be shown here
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
