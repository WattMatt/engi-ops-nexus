import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOfflineInspections } from "@/hooks/useOfflineInspections";
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { offlineDB } from "@/services/db";

const inspectionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["Pending", "In Progress", "Completed"]),
  inspection_date: z.string().optional(),
  site_id: z.string().min(1, "Site is required"),
});

type InspectionFormValues = z.infer<typeof inspectionFormSchema>;

interface InspectionFormProps {
  initialData?: any;
  inspectionId?: string;
  onSuccess?: () => void;
}

export function InspectionForm({ initialData, inspectionId, onSuccess }: InspectionFormProps) {
  const { updateInspection, createInspection, uploadImage, isOnline } = useOfflineInspections();
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: initialData || {
      title: "",
      description: "",
      status: "Pending",
      inspection_date: new Date().toISOString().split('T')[0],
      site_id: "",
    },
  });

  useEffect(() => {
    if (inspectionId) {
      loadImages();
    }
  }, [inspectionId, isOnline]);

  const loadImages = async () => {
      // Load offline images first
      const offlineImages = await offlineDB.getUnsyncedImages();
      const relevantOffline = offlineImages.filter(img => img.inspection_id === inspectionId);
      
      // If we had an API to fetch online images, we would do it here.
      // For now, we simulate or just show offline ones + whatever we passed in initialData if it had images.
      
      const combined = [
          ...relevantOffline.map(img => ({
              id: img.id,
              url: URL.createObjectURL(img.blob),
              name: img.file_name,
              isOffline: true
          })),
          // ... online images
      ];
      setImages(combined);
  };

  const onSubmit = async (data: InspectionFormValues) => {
    try {
      if (inspectionId) {
        await updateInspection(inspectionId, data);
      } else {
        await createInspection(data);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Form error", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (!inspectionId) {
        toast.error("Please save the inspection first before uploading images.");
        return;
    }

    setUploading(true);
    const file = e.target.files[0];
    const path = `inspections/${inspectionId}/${Date.now()}_${file.name}`;
    
    try {
        await uploadImage('inspection-photos', path, file, inspectionId);
        loadImages(); // Refresh list
    } catch (error) {
        console.error("Upload failed", error);
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Inspection Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="inspection_date"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </CardContent>
          </Card>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {inspectionId ? "Update Inspection" : "Create Inspection"}
          </Button>
        </form>
      </Form>

      {inspectionId && (
          <Card>
              <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
              <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {images.map((img) => (
                          <div key={img.id} className="relative aspect-square border rounded-md overflow-hidden group">
                              <img src={img.url} alt={img.name} className="object-cover w-full h-full" />
                              {img.isOffline && (
                                  <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1 rounded">
                                      Offline
                                  </div>
                              )}
                          </div>
                      ))}
                      <div className="flex items-center justify-center border-2 border-dashed rounded-md aspect-square cursor-pointer hover:bg-muted/50 relative">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={handleImageUpload}
                            disabled={uploading}
                          />
                          <div className="text-center">
                              {uploading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : <Upload className="h-6 w-6 mx-auto text-muted-foreground" />}
                              <span className="text-xs text-muted-foreground mt-2 block">Upload Photo</span>
                          </div>
                      </div>
                  </div>
              </CardContent>
          </Card>
      )}
    </div>
  );
}
