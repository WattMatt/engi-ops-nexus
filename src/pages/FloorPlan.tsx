import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

export default function FloorPlan() {
  const { floorPlanId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [floorPlanName, setFloorPlanName] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string>("");

  useEffect(() => {
    loadFloorPlan();
  }, [floorPlanId]);

  const loadFloorPlan = async () => {
    if (!floorPlanId) {
      setLoading(false);
      return;
    }
    
    console.log('🔄 Loading floor plan:', floorPlanId);
    setLoading(true);
    
    try {
      const { data: fp, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('id', floorPlanId)
        .single();

      if (error) throw error;

      if (fp) {
        console.log('✅ Floor plan loaded:', fp);
        setFloorPlanName(fp.name);
        setPdfUrl(fp.pdf_url);
        toast.success('Floor plan loaded');
      }
    } catch (error: any) {
      console.error('💥 Error loading floor plan:', error);
      toast.error(error.message || 'Failed to load floor plan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading floor plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/floor-plans')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">{floorPlanName}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-muted">
        {pdfUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0 bg-white shadow-lg"
              title={floorPlanName}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No PDF uploaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
