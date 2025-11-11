-- Add columns to store the selected city coordinates for the climatic zone pin
ALTER TABLE bulk_services_documents 
ADD COLUMN IF NOT EXISTS climatic_zone_city VARCHAR(255),
ADD COLUMN IF NOT EXISTS climatic_zone_lng DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS climatic_zone_lat DECIMAL(10, 6);

COMMENT ON COLUMN bulk_services_documents.climatic_zone_city IS 'Name of the city representing the selected climatic zone';
COMMENT ON COLUMN bulk_services_documents.climatic_zone_lng IS 'Longitude coordinate of the selected zone location';
COMMENT ON COLUMN bulk_services_documents.climatic_zone_lat IS 'Latitude coordinate of the selected zone location';