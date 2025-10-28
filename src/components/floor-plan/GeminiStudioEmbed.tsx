import { useEffect, useRef, useState } from 'react';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { FloorPlanState } from '@/lib/floorPlan/types';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const GEMINI_STUDIO_URL = 'https://electrical-floor-plan-markup-tool-366671991725.us-west1.run.app';

export function GeminiStudioEmbed() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { state, setState } = useFloorPlan();

  // Get auth token
  useEffect(() => {
    const getToken = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setAuthToken(data.session.access_token);
      }
    };
    getToken();
  }, []);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== GEMINI_STUDIO_URL) return;

      const { type, payload } = event.data;

      switch (type) {
        case 'READY':
          setIsLoading(false);
          // Send initial state to iframe
          sendToIframe('INIT', {
            authToken,
            designPurpose: state.designPurpose,
            pdfDataUrl: state.pdfDataUrl,
          });
          break;

        case 'REQUEST_STATE':
          // Iframe is requesting current state
          sendToIframe('LOAD_STATE', {
            equipment: state.equipment,
            cables: state.cables,
            containment: state.containment,
            zones: state.zones,
            pvConfig: state.pvConfig,
            pvRoofs: state.pvRoofs,
            pvArrays: state.pvArrays,
            tasks: state.tasks,
          });
          break;

        case 'STATE_UPDATE':
          // Iframe is sending updated state
          setState(prev => ({
            ...prev,
            ...payload,
          }));
          break;

        case 'SAVE_REQUESTED':
          // Iframe wants to save - trigger parent save action
          window.dispatchEvent(new CustomEvent('gemini-studio-save', { detail: payload }));
          break;

        case 'EXPORT_REQUESTED':
          // Iframe wants to export PDF
          window.dispatchEvent(new CustomEvent('gemini-studio-export', { detail: payload }));
          break;

        case 'BOQ_REQUESTED':
          // Iframe wants to generate BoQ
          window.dispatchEvent(new CustomEvent('gemini-studio-boq', { detail: payload }));
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [authToken, state, setState]);

  // Helper to send messages to iframe
  const sendToIframe = (type: string, payload: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type, payload },
        GEMINI_STUDIO_URL
      );
    }
  };

  // Expose method to parent for loading new state
  useEffect(() => {
    const handleLoadState = () => {
      sendToIframe('LOAD_STATE', {
        equipment: state.equipment,
        cables: state.cables,
        containment: state.containment,
        zones: state.zones,
        pvConfig: state.pvConfig,
        pvRoofs: state.pvRoofs,
        pvArrays: state.pvArrays,
        tasks: state.tasks,
        pdfDataUrl: state.pdfDataUrl,
        designPurpose: state.designPurpose,
      });
    };

    window.addEventListener('load-floor-plan-to-iframe', handleLoadState);
    return () => window.removeEventListener('load-floor-plan-to-iframe', handleLoadState);
  }, [state]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading Gemini Studio...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={GEMINI_STUDIO_URL}
        className="w-full h-full border-0"
        title="Gemini Studio Floor Plan Markup"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
