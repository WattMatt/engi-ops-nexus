import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FITTING_TYPES,
  FITTING_CATEGORIES,
  COLOR_TEMPERATURES,
  IP_RATINGS,
  IK_RATINGS,
  DRIVER_TYPES,
  LightingFitting,
} from './lightingTypes';

const fittingSchema = z.object({
  fitting_code: z.string().min(1, 'Code is required'),
  manufacturer: z.string().optional(),
  model_name: z.string().min(1, 'Model name is required'),
  fitting_type: z.string().min(1, 'Type is required'),
  wattage: z.coerce.number().optional(),
  lumen_output: z.coerce.number().optional(),
  color_temperature: z.coerce.number().optional(),
  cri: z.coerce.number().min(0).max(100).optional(),
  beam_angle: z.coerce.number().optional(),
  ip_rating: z.string().optional(),
  ik_rating: z.string().optional(),
  lifespan_hours: z.coerce.number().optional(),
  dimensions: z.string().optional(),
  weight: z.coerce.number().optional(),
  supply_cost: z.coerce.number().default(0),
  install_cost: z.coerce.number().default(0),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  is_dimmable: z.boolean().default(false),
  driver_type: z.string().optional(),
  notes: z.string().optional(),
});

type FittingFormData = z.infer<typeof fittingSchema>;

interface AddFittingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editFitting?: LightingFitting | null;
  projectId?: string | null;
}

export const AddFittingDialog = ({
  open,
  onOpenChange,
  editFitting,
  projectId,
}: AddFittingDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState(editFitting?.fitting_type || '');

  const form = useForm<FittingFormData>({
    resolver: zodResolver(fittingSchema),
    defaultValues: editFitting
      ? {
          fitting_code: editFitting.fitting_code,
          manufacturer: editFitting.manufacturer || '',
          model_name: editFitting.model_name,
          fitting_type: editFitting.fitting_type,
          wattage: editFitting.wattage || undefined,
          lumen_output: editFitting.lumen_output || undefined,
          color_temperature: editFitting.color_temperature || undefined,
          cri: editFitting.cri || undefined,
          beam_angle: editFitting.beam_angle || undefined,
          ip_rating: editFitting.ip_rating || '',
          ik_rating: editFitting.ik_rating || '',
          lifespan_hours: editFitting.lifespan_hours || undefined,
          dimensions: editFitting.dimensions || '',
          weight: editFitting.weight || undefined,
          supply_cost: editFitting.supply_cost || 0,
          install_cost: editFitting.install_cost || 0,
          category: editFitting.category || '',
          subcategory: editFitting.subcategory || '',
          is_dimmable: editFitting.is_dimmable || false,
          driver_type: editFitting.driver_type || '',
          notes: editFitting.notes || '',
        }
      : {
          fitting_code: '',
          manufacturer: '',
          model_name: '',
          fitting_type: '',
          supply_cost: 0,
          install_cost: 0,
          is_dimmable: false,
        },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FittingFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const fittingData = {
        fitting_code: data.fitting_code,
        manufacturer: data.manufacturer || null,
        model_name: data.model_name,
        fitting_type: data.fitting_type,
        wattage: data.wattage || null,
        lumen_output: data.lumen_output || null,
        color_temperature: data.color_temperature || null,
        cri: data.cri || null,
        beam_angle: data.beam_angle || null,
        ip_rating: data.ip_rating || null,
        ik_rating: data.ik_rating || null,
        lifespan_hours: data.lifespan_hours || null,
        dimensions: data.dimensions || null,
        weight: data.weight || null,
        supply_cost: data.supply_cost || 0,
        install_cost: data.install_cost || 0,
        category: data.category || null,
        subcategory: data.subcategory || null,
        is_dimmable: data.is_dimmable || false,
        driver_type: data.driver_type || null,
        notes: data.notes || null,
        project_id: projectId || null,
        created_by: userData.user?.id || null,
      };

      if (editFitting) {
        const { error } = await supabase
          .from('lighting_fittings')
          .update(fittingData)
          .eq('id', editFitting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lighting_fittings')
          .insert([fittingData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lighting-fittings'] });
      toast.success(editFitting ? 'Fitting updated' : 'Fitting added');
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error('Failed to save fitting', { description: error.message });
    },
  });

  const onSubmit = (data: FittingFormData) => {
    saveMutation.mutate(data);
  };

  const subcategories = selectedType ? FITTING_CATEGORIES[selectedType] || [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {editFitting ? 'Edit Fitting' : 'Add New Fitting'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="specs">Specifications</TabsTrigger>
                  <TabsTrigger value="costs">Costs & Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fitting_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fitting Code *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., DL-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Philips" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="model_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., CoreLine Downlight" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fitting_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type *</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedType(value);
                              form.setValue('subcategory', '');
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FITTING_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategory</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedType}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subcategory" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subcategories.map((sub) => (
                                <SelectItem key={sub} value={sub}>
                                  {sub}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_dimmable"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Dimmable</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="specs" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="wattage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wattage (W)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="15" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lumen_output"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lumens (lm)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="color_temperature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color Temp (K)</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COLOR_TEMPERATURES.map((ct) => (
                                <SelectItem key={ct.value} value={ct.value.toString()}>
                                  {ct.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="cri"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CRI (0-100)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="80" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="beam_angle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beam Angle (°)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="60" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lifespan_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lifespan (hrs)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="50000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="ip_rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IP Rating</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {IP_RATINGS.map((ip) => (
                                <SelectItem key={ip} value={ip}>
                                  {ip}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ik_rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IK Rating</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {IK_RATINGS.map((ik) => (
                                <SelectItem key={ik} value={ik}>
                                  {ik}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="driver_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DRIVER_TYPES.map((dt) => (
                                <SelectItem key={dt} value={dt}>
                                  {dt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensions</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 200x200x50mm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="0.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="costs" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="supply_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supply Cost (R)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="install_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Install Cost (R)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editFitting ? 'Update' : 'Add Fitting'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
