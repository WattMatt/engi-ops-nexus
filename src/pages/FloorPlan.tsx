import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Save, Circle, Square, Minus, Hand } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.296/pdf.worker.min.mjs`;

type Tool = 'select' | 'line' | 'circle' | 'square';

export default function FloorPlan() {
  const { floorPlanId } = useParams();
  const navigate = useNavigate();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [floorPlanName, setFloorPlanName] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    loadFloorPlan();
  }, [floorPlanId]);

  useEffect(() => {
    if (pdfUrl && canvasRef.current && overlayCanvasRef.current) {
      loadPDF();
    }
  }, [pdfUrl]);

  const loadFloorPlan = async () => {
    if (!floorPlanId) {
      setLoading(false);
      return;
    }
    
    console.log('📂 Loading floor plan:', floorPlanId);
    setLoading(true);
    
    try {
      const { data: fp, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('id', floorPlanId)
        .maybeSingle();

      if (error) throw error;

      if (fp) {
        console.log('✅ Floor plan loaded:', fp.name);
        setFloorPlanName(fp.name);
        setPdfUrl(fp.pdf_url);
      } else {
        toast.error('Floor plan not found');
        navigate('/dashboard/floor-plans');
      }
    } catch (error: any) {
      console.error('❌ Error loading floor plan:', error);
      toast.error(error.message || 'Failed to load floor plan');
    } finally {
      setLoading(false);
    }
  };

  const loadPDF = async () => {
    if (!canvasRef.current || !overlayCanvasRef.current || !pdfUrl) {
      console.error('❌ Missing requirements:', { 
        canvas: !!canvasRef.current, 
        overlay: !!overlayCanvasRef.current, 
        pdfUrl: !!pdfUrl 
      });
      return;
    }

    try {
      console.log('📄 Loading PDF from:', pdfUrl);
      
      // Load PDF with explicit options
      const loadingTask = getDocument({ 
        url: pdfUrl,
        withCredentials: false,
        isEvalSupported: false
      });
      
      const pdf = await loadingTask.promise;
      console.log('✅ PDF loaded, pages:', pdf.numPages);
      
      const page = await pdf.getPage(1);
      console.log('✅ Got first page');
      
      const viewport = page.getViewport({ scale: 1.5 });
      console.log('📐 Viewport:', viewport.width, 'x', viewport.height);

      // Set canvas sizes
      const canvas = canvasRef.current;
      const overlay = overlayCanvasRef.current;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      overlay.width = viewport.width;
      overlay.height = viewport.height;
      
      console.log('📐 Canvas sized:', canvas.width, 'x', canvas.height);

      // Render PDF
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context');
      }
      
      console.log('🎨 Rendering PDF to canvas...');
      await page.render({ 
        canvasContext: context, 
        viewport: viewport 
      } as any).promise;

      console.log('✅ PDF rendered successfully');
      toast.success('PDF loaded successfully');
    } catch (error: any) {
      console.error('❌ Error loading PDF:', error);
      toast.error(`Failed to load PDF: ${error.message}`);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'select') return;

    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPoint({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || !overlayCanvasRef.current) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = overlayCanvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    switch (activeTool) {
      case 'line':
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(x, y);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        break;
      case 'square':
        ctx.rect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
        break;
    }

    ctx.stroke();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Save drawings to database
      toast.success('Saved successfully');
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
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
        
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="w-16 border-r bg-card flex flex-col items-center gap-2 py-4">
          <Button
            variant={activeTool === 'select' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setActiveTool('select')}
            title="Select"
          >
            <Hand className="h-5 w-5" />
          </Button>
          <Button
            variant={activeTool === 'line' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setActiveTool('line')}
            title="Draw Line"
          >
            <Minus className="h-5 w-5" />
          </Button>
          <Button
            variant={activeTool === 'circle' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setActiveTool('circle')}
            title="Draw Circle"
          >
            <Circle className="h-5 w-5" />
          </Button>
          <Button
            variant={activeTool === 'square' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setActiveTool('square')}
            title="Draw Rectangle"
          >
            <Square className="h-5 w-5" />
          </Button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-4 bg-muted">
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              className="border border-border shadow-lg bg-white"
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
