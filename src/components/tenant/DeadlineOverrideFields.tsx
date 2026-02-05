 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Button } from "@/components/ui/button";
 import { RotateCcw, Calendar, Lock, Unlock } from "lucide-react";
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
 
 interface DeadlineOverrideFieldsProps {
   dbLastOrderDate: string;
   dbDeliveryDate: string;
   lightingLastOrderDate: string;
   lightingDeliveryDate: string;
   useManualOverride: boolean;
   calculatedDates: {
     dbLastOrderDate: string;
     dbDeliveryDate: string;
     lightingLastOrderDate: string;
     lightingDeliveryDate: string;
   } | null;
   onChange: (field: string, value: string | boolean) => void;
   onResetToCalculated: () => void;
 }
 
 export function DeadlineOverrideFields({
   dbLastOrderDate,
   dbDeliveryDate,
   lightingLastOrderDate,
   lightingDeliveryDate,
   useManualOverride,
   calculatedDates,
   onChange,
   onResetToCalculated,
 }: DeadlineOverrideFieldsProps) {
   const hasCalculatedDates = calculatedDates !== null;
   const hasManualChanges = useManualOverride && hasCalculatedDates && (
     dbLastOrderDate !== calculatedDates.dbLastOrderDate ||
     dbDeliveryDate !== calculatedDates.dbDeliveryDate ||
     lightingLastOrderDate !== calculatedDates.lightingLastOrderDate ||
     lightingDeliveryDate !== calculatedDates.lightingDeliveryDate
   );
 
   return (
     <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
           <Calendar className="h-4 w-4 text-muted-foreground" />
           <Label className="font-medium">Order & Delivery Deadlines</Label>
         </div>
         <div className="flex items-center gap-2">
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <div className="flex items-center gap-2">
                   <Checkbox
                     id="manual-override"
                     checked={useManualOverride}
                     onCheckedChange={(checked) => onChange("useManualOverride", !!checked)}
                     disabled={!hasCalculatedDates}
                   />
                   <Label htmlFor="manual-override" className="text-sm font-normal cursor-pointer flex items-center gap-1">
                     {useManualOverride ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                     Manual Override
                   </Label>
                 </div>
               </TooltipTrigger>
               <TooltipContent>
                 <p className="text-xs">
                   {hasCalculatedDates 
                     ? "Enable to manually set deadline dates" 
                     : "Set opening date to enable manual overrides"}
                 </p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
           {hasManualChanges && (
             <Button 
               type="button" 
               variant="ghost" 
               size="sm"
               onClick={onResetToCalculated}
               className="h-7 text-xs"
             >
               <RotateCcw className="h-3 w-3 mr-1" />
               Reset
             </Button>
           )}
         </div>
       </div>
 
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-3">
           <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Distribution Boards</p>
           <div>
             <Label htmlFor="db_last_order_date" className="text-xs">Last Order Date</Label>
             <Input
               id="db_last_order_date"
               type="date"
               value={dbLastOrderDate}
               onChange={(e) => onChange("db_last_order_date", e.target.value)}
               disabled={!useManualOverride}
               className="text-sm"
             />
           </div>
           <div>
             <Label htmlFor="db_delivery_date" className="text-xs">Delivery Date</Label>
             <Input
               id="db_delivery_date"
               type="date"
               value={dbDeliveryDate}
               onChange={(e) => onChange("db_delivery_date", e.target.value)}
               disabled={!useManualOverride}
               className="text-sm"
             />
           </div>
         </div>
 
         <div className="space-y-3">
           <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lighting</p>
           <div>
             <Label htmlFor="lighting_last_order_date" className="text-xs">Last Order Date</Label>
             <Input
               id="lighting_last_order_date"
               type="date"
               value={lightingLastOrderDate}
               onChange={(e) => onChange("lighting_last_order_date", e.target.value)}
               disabled={!useManualOverride}
               className="text-sm"
             />
           </div>
           <div>
             <Label htmlFor="lighting_delivery_date" className="text-xs">Delivery Date</Label>
             <Input
               id="lighting_delivery_date"
               type="date"
               value={lightingDeliveryDate}
               onChange={(e) => onChange("lighting_delivery_date", e.target.value)}
               disabled={!useManualOverride}
               className="text-sm"
             />
           </div>
         </div>
       </div>
 
       {!useManualOverride && hasCalculatedDates && (
         <p className="text-xs text-muted-foreground">
           Dates are auto-calculated (40 business days before BO). Enable "Manual Override" to customize.
         </p>
       )}
       {!hasCalculatedDates && (
         <p className="text-xs text-warning">
           Set an opening date above to enable deadline calculation.
         </p>
       )}
     </div>
   );
 }