import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MunicipalityResult {
  name: string;
  code: string;
  district: string;
  province: string;
  rawAttributes: Record<string, any>;
}

interface QueryResult {
  found: boolean;
  municipality?: MunicipalityResult;
  message?: string;
  error?: string;
}

export function useMunicipalityQuery() {
  const [isQuerying, setIsQuerying] = useState(false);
  const [lastResult, setLastResult] = useState<QueryResult | null>(null);

  const queryMunicipality = useCallback(async (lng: number, lat: number): Promise<QueryResult | null> => {
    setIsQuerying(true);
    try {
      const { data, error } = await supabase.functions.invoke("query-municipality", {
        body: { lng, lat }
      });

      if (error) {
        console.error("Error querying municipality:", error);
        setLastResult({ found: false, error: error.message });
        return null;
      }

      setLastResult(data);
      return data;
    } catch (error) {
      console.error("Error querying municipality:", error);
      setLastResult({ found: false, error: String(error) });
      return null;
    } finally {
      setIsQuerying(false);
    }
  }, []);

  return {
    queryMunicipality,
    isQuerying,
    lastResult
  };
}
