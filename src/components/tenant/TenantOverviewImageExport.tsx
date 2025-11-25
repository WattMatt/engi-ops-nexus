import { Button } from "@/components/ui/button";
import { Download, FileImage } from "lucide-react";
import { captureMultipleComponents, exportToCSV } from "@/utils/componentToImage";
import { useToast } from "@/hooks/use-toast";

interface Tenant {
  id: string;
  shop_category: string;
  area: number | null;
  db_ordered: boolean;
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
  sow_received: boolean;
  layout_received: boolean;
  cost_reported: boolean;
}

interface TenantOverviewImageExportProps {
  tenants: Tenant[];
  projectId: string;
}

export const TenantOverviewImageExport = ({ tenants, projectId }: TenantOverviewImageExportProps) => {
  const { toast } = useToast();

  const handleCaptureImages = async () => {
    try {
      toast({
        title: "Capturing components...",
        description: "Please wait while we generate images",
      });

      const componentIds = [
        'tenant-hero-stats',
        'tenant-progress-tracker',
        'tenant-financial-breakdown',
        'tenant-category-distribution',
      ];

      const images = await captureMultipleComponents(componentIds, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      // Store images in sessionStorage for PDF generation
      Object.entries(images).forEach(([id, dataUrl]) => {
        sessionStorage.setItem(`tenant-image-${id}`, dataUrl);
      });

      toast({
        title: "Success!",
        description: `Captured ${Object.keys(images).length} component images. These will be used in your next PDF export.`,
      });
    } catch (error) {
      console.error('Error capturing images:', error);
      toast({
        title: "Error",
        description: "Failed to capture component images",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    try {
      const csvData = tenants.map(t => ({
        'Tenant ID': t.id,
        'Category': t.shop_category,
        'Area (m²)': t.area || 0,
        'DB Ordered': t.db_ordered ? 'Yes' : 'No',
        'DB Cost': t.db_cost || 0,
        'Lighting Ordered': t.lighting_ordered ? 'Yes' : 'No',
        'Lighting Cost': t.lighting_cost || 0,
        'Total Cost': (t.db_cost || 0) + (t.lighting_cost || 0),
        'SOW Received': t.sow_received ? 'Yes' : 'No',
        'Layout Received': t.layout_received ? 'Yes' : 'No',
        'Cost Reported': t.cost_reported ? 'Yes' : 'No',
      }));

      exportToCSV(csvData, `tenant-overview-${projectId}.csv`);

      toast({
        title: "Success!",
        description: "Tenant data exported to CSV",
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Error",
        description: "Failed to export CSV",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleCaptureImages} variant="outline" size="sm">
        <FileImage className="mr-2 h-4 w-4" />
        Capture for PDF
      </Button>
      <Button onClick={handleExportCSV} variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
};
