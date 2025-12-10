import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Zap, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tariff {
  id: string;
  name: string;
  municipality_id: string;
  tariff_type: string;
  effective_date: string;
  is_active: boolean;
  tariff_rates: {
    id: string;
    rate_type: string;
    rate_value: number;
    unit: string;
    min_usage?: number;
    max_usage?: number;
    time_of_use_period?: string;
  }[];
}

interface Municipality {
  id: string;
  name: string;
  tariffs: Tariff[];
}

interface TariffData {
  municipalitiesByProvince: Record<string, Municipality[]>;
  tariffs: Tariff[];
  municipalities: any[];
}

interface TariffSelectorProps {
  documentId?: string;
  projectId?: string;
  currentTariffId?: string | null;
  currentMunicipalityId?: string | null;
  currentCity?: string | null; // City from map pin
  detectedMunicipality?: string | null; // Municipality detected from MDB ArcGIS
  detectedProvince?: string | null; // Province detected from MDB ArcGIS
  savedMunicipalityName?: string | null; // Municipality name saved in database
  onTariffSelect?: (tariffId: string | null, municipalityId: string | null) => void;
  compact?: boolean;
}

export const TariffSelector = ({
  documentId,
  projectId,
  currentTariffId,
  currentMunicipalityId,
  currentCity,
  detectedMunicipality,
  detectedProvince,
  savedMunicipalityName,
  onTariffSelect,
  compact = false,
}: TariffSelectorProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tariffData, setTariffData] = useState<TariffData | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>(currentMunicipalityId || "");
  const [selectedTariff, setSelectedTariff] = useState<string>(currentTariffId || "");
  const [error, setError] = useState<string | null>(null);
  const [autoMatchedCity, setAutoMatchedCity] = useState<string | null>(null);

  useEffect(() => {
    fetchTariffs();
  }, []);

  // Auto-match municipality based on detected municipality from MDB ArcGIS (priority) or city name from map
  useEffect(() => {
    if (!tariffData || selectedMunicipality) return;
    
    // Priority 1: Use detected municipality from MDB ArcGIS
    if (detectedMunicipality) {
      const detectedLower = detectedMunicipality.toLowerCase().trim();
      
      for (const [province, municipalities] of Object.entries(tariffData.municipalitiesByProvince)) {
        for (const municipality of municipalities) {
          const munLower = municipality.name.toLowerCase();
          // Check for match with MDB detected municipality
          if (
            munLower === detectedLower ||
            munLower.includes(detectedLower) || 
            detectedLower.includes(munLower) ||
            // Handle SA municipal name prefixes like "u" in uMhlathuze
            munLower.replace(/^u/i, '').includes(detectedLower.replace(/^u/i, '')) ||
            detectedLower.replace(/^u/i, '').includes(munLower.replace(/^u/i, ''))
          ) {
            setSelectedProvince(province);
            setSelectedMunicipality(municipality.id);
            setAutoMatchedCity(detectedMunicipality);
            toast.success(`Auto-selected ${municipality.name} municipality`);
            return;
          }
        }
      }
      // Try province-based matching if we have detectedProvince
      if (detectedProvince && tariffData.municipalitiesByProvince[detectedProvince]) {
        setSelectedProvince(detectedProvince);
        setAutoMatchedCity(detectedMunicipality);
      }
    }
    
    // Priority 2: Fallback to city name matching
    if (currentCity && !detectedMunicipality) {
      const cityLower = currentCity.toLowerCase().trim();
      
      for (const [province, municipalities] of Object.entries(tariffData.municipalitiesByProvince)) {
        for (const municipality of municipalities) {
          const munLower = municipality.name.toLowerCase();
          if (
            munLower.includes(cityLower) || 
            cityLower.includes(munLower) ||
            munLower.replace(/^u/i, '').includes(cityLower) ||
            cityLower.includes(munLower.replace(/^u/i, ''))
          ) {
            setSelectedProvince(province);
            setSelectedMunicipality(municipality.id);
            setAutoMatchedCity(currentCity);
            return;
          }
        }
      }
      // No match found - just note the city for display
      setAutoMatchedCity(currentCity);
    }
  }, [currentCity, detectedMunicipality, detectedProvince, tariffData, selectedMunicipality]);

  // Restore saved municipality and tariff from database
  useEffect(() => {
    if (!tariffData) return;
    
    // Priority 1: Use currentMunicipalityId if provided
    if (currentMunicipalityId) {
      setSelectedMunicipality(currentMunicipalityId);
      for (const [province, municipalities] of Object.entries(tariffData.municipalitiesByProvince)) {
        if (municipalities.some(m => m.id === currentMunicipalityId)) {
          setSelectedProvince(province);
          break;
        }
      }
    }
    // Priority 2: Match by saved municipality name
    else if (savedMunicipalityName && !selectedMunicipality) {
      const savedLower = savedMunicipalityName.toLowerCase().trim();
      
      for (const [province, municipalities] of Object.entries(tariffData.municipalitiesByProvince)) {
        for (const municipality of municipalities) {
          const munLower = municipality.name.toLowerCase();
          if (
            munLower === savedLower ||
            munLower.includes(savedLower) || 
            savedLower.includes(munLower) ||
            munLower.replace(/^u/i, '').includes(savedLower.replace(/^u/i, '')) ||
            savedLower.replace(/^u/i, '').includes(munLower.replace(/^u/i, ''))
          ) {
            setSelectedProvince(province);
            setSelectedMunicipality(municipality.id);
            return;
          }
        }
      }
    }
    
    if (currentTariffId) {
      setSelectedTariff(currentTariffId);
    }
  }, [currentMunicipalityId, currentTariffId, savedMunicipalityName, tariffData, selectedMunicipality]);

  const fetchTariffs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-greencalc-tariffs');
      
      if (error) throw error;
      
      setTariffData(data);
    } catch (err: any) {
      console.error('Error fetching tariffs:', err);
      setError(err.message || 'Failed to load tariffs');
      toast.error('Failed to load tariffs from greencalc-sa');
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    setSelectedMunicipality("");
    setSelectedTariff("");
  };

  const handleMunicipalityChange = (municipalityId: string) => {
    setSelectedMunicipality(municipalityId);
    setSelectedTariff("");
  };

  const handleTariffChange = async (tariffId: string) => {
    setSelectedTariff(tariffId);
    
    if (onTariffSelect) {
      onTariffSelect(tariffId || null, selectedMunicipality || null);
    }

    // If documentId is provided, save to bulk_services_documents
    if (documentId) {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('bulk_services_documents')
          .update({ 
            tariff_structure: tariffId,
            // Store municipality in a way we can retrieve it
            supply_authority: getSelectedMunicipalityName() 
          })
          .eq('id', documentId);

        if (error) throw error;
        toast.success('Tariff selection saved');
      } catch (err: any) {
        console.error('Error saving tariff:', err);
        toast.error('Failed to save tariff selection');
      } finally {
        setSaving(false);
      }
    }
  };

  const getSelectedMunicipalityName = (): string => {
    if (!tariffData || !selectedMunicipality) return "";
    
    for (const municipalities of Object.values(tariffData.municipalitiesByProvince)) {
      const found = municipalities.find(m => m.id === selectedMunicipality);
      if (found) return found.name;
    }
    return "";
  };

  const getMunicipalitiesForProvince = (): Municipality[] => {
    if (!tariffData || !selectedProvince) return [];
    return tariffData.municipalitiesByProvince[selectedProvince] || [];
  };

  const getTariffsForMunicipality = (): Tariff[] => {
    const municipalities = getMunicipalitiesForProvince();
    const municipality = municipalities.find(m => m.id === selectedMunicipality);
    return municipality?.tariffs || [];
  };

  const getSelectedTariffDetails = (): Tariff | null => {
    if (!tariffData || !selectedTariff) return null;
    return tariffData.tariffs.find(t => t.id === selectedTariff) || null;
  };

  const getTariffTypeBadgeColor = (type: string): string => {
    switch (type?.toLowerCase()) {
      case 'fixed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ibt': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'tou': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading tariffs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-2">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchTariffs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const provinces = Object.keys(tariffData?.municipalitiesByProvince || {}).sort();
  const municipalities = getMunicipalitiesForProvince();
  const tariffs = getTariffsForMunicipality();
  const selectedTariffDetails = getSelectedTariffDetails();

  if (compact) {
    return (
      <div className="space-y-3">
        {autoMatchedCity && !selectedMunicipality && (
          <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <MapPin className="h-4 w-4 inline mr-1" />
              Map location: <strong>{autoMatchedCity}</strong> - Please select the corresponding municipality below
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Province</Label>
            <Select value={selectedProvince} onValueChange={handleProvinceChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {provinces.map(province => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Municipality</Label>
            <Select 
              value={selectedMunicipality} 
              onValueChange={handleMunicipalityChange}
              disabled={!selectedProvince}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select municipality" />
              </SelectTrigger>
              <SelectContent>
                {municipalities.map(municipality => (
                  <SelectItem key={municipality.id} value={municipality.id}>
                    {municipality.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tariff</Label>
            <Select 
              value={selectedTariff} 
              onValueChange={handleTariffChange}
              disabled={!selectedMunicipality || saving}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select tariff" />
              </SelectTrigger>
              <SelectContent>
                {tariffs.map(tariff => (
                  <SelectItem key={tariff.id} value={tariff.id}>
                    <div className="flex items-center gap-2">
                      <span>{tariff.name}</span>
                      <Badge variant="outline" className={`text-xs ${getTariffTypeBadgeColor(tariff.tariff_type)}`}>
                        {tariff.tariff_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedTariffDetails && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{selectedTariffDetails.name}</span>
              <Badge className={getTariffTypeBadgeColor(selectedTariffDetails.tariff_type)}>
                {selectedTariffDetails.tariff_type}
              </Badge>
            </div>
            {selectedTariffDetails.tariff_rates && selectedTariffDetails.tariff_rates.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {selectedTariffDetails.tariff_rates.slice(0, 3).map((rate, idx) => (
                  <span key={rate.id}>
                    {idx > 0 && ' • '}
                    {rate.rate_type}: R{rate.rate_value?.toFixed(4)}/{rate.unit}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Tariff Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Province</Label>
            <Select value={selectedProvince} onValueChange={handleProvinceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map(province => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Municipality</Label>
            <Select 
              value={selectedMunicipality} 
              onValueChange={handleMunicipalityChange}
              disabled={!selectedProvince}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select municipality" />
              </SelectTrigger>
              <SelectContent>
                {municipalities.map(municipality => (
                  <SelectItem key={municipality.id} value={municipality.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{municipality.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {municipality.tariffs.length} tariffs
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tariff</Label>
            <Select 
              value={selectedTariff} 
              onValueChange={handleTariffChange}
              disabled={!selectedMunicipality || saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tariff" />
              </SelectTrigger>
              <SelectContent>
                {tariffs.map(tariff => (
                  <SelectItem key={tariff.id} value={tariff.id}>
                    <div className="flex items-center gap-2">
                      <span>{tariff.name}</span>
                      <Badge variant="outline" className={getTariffTypeBadgeColor(tariff.tariff_type)}>
                        {tariff.tariff_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedTariffDetails && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-semibold">{selectedTariffDetails.name}</span>
                <Badge className={getTariffTypeBadgeColor(selectedTariffDetails.tariff_type)}>
                  {selectedTariffDetails.tariff_type}
                </Badge>
              </div>
              
              {selectedTariffDetails.tariff_rates && selectedTariffDetails.tariff_rates.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Rate Structure</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedTariffDetails.tariff_rates.map(rate => (
                      <div key={rate.id} className="p-2 bg-background rounded border">
                        <div className="text-xs text-muted-foreground">{rate.rate_type}</div>
                        <div className="font-medium">
                          R{rate.rate_value?.toFixed(4)}/{rate.unit}
                        </div>
                        {rate.time_of_use_period && (
                          <div className="text-xs text-muted-foreground">{rate.time_of_use_period}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTariffDetails.effective_date && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Effective from: {new Date(selectedTariffDetails.effective_date).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving tariff selection...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
