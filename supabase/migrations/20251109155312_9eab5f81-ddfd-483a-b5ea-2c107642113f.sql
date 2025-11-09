-- Add building_calculation_type column to bulk_services_documents table
ALTER TABLE bulk_services_documents 
ADD COLUMN IF NOT EXISTS building_calculation_type TEXT DEFAULT 'commercial';

-- Add comment for documentation
COMMENT ON COLUMN bulk_services_documents.building_calculation_type IS 'Calculation method: commercial (SANS 204), sans10142 (SANS 10142-1), or residential (ADMD)';