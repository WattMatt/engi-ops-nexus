-- Create a function to sync document uploads with tenant schedule checkboxes
CREATE OR REPLACE FUNCTION sync_tenant_document_status()
RETURNS TRIGGER AS $$
DECLARE
  doc_mapping RECORD;
BEGIN
  -- Map document types to tenant schedule fields
  -- When a document is uploaded or deleted, update the corresponding tenant field
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Check which document type was uploaded and update the corresponding field
    CASE NEW.document_type
      WHEN 'lighting_quote_received' THEN
        -- Don't auto-update for this one as it doesn't directly map
        NULL;
      WHEN 'lighting_quote_instruction', 'lighting_order_placed' THEN
        UPDATE tenants 
        SET lighting_ordered = true 
        WHERE id = NEW.tenant_id;
      WHEN 'db_order_quote_received' THEN
        -- Don't auto-update for this one as it doesn't directly map
        NULL;
      WHEN 'db_order_instruction', 'db_order_placed' THEN
        UPDATE tenants 
        SET db_ordered = true 
        WHERE id = NEW.tenant_id;
      WHEN 'db_shop_drawing_received', 'db_shop_drawing_approved' THEN
        -- Don't auto-update for this one as it doesn't directly map
        NULL;
      WHEN 'scope_of_work', 'sow' THEN
        UPDATE tenants 
        SET sow_received = true 
        WHERE id = NEW.tenant_id;
      WHEN 'layout', 'floor_plan', 'shop_layout' THEN
        UPDATE tenants 
        SET layout_received = true 
        WHERE id = NEW.tenant_id;
      ELSE
        NULL;
    END CASE;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- When a document is deleted, check if any other documents of same type exist
    -- If not, uncheck the corresponding tenant field
    CASE OLD.document_type
      WHEN 'lighting_quote_instruction', 'lighting_order_placed' THEN
        -- Check if any other lighting order documents exist for this tenant
        IF NOT EXISTS (
          SELECT 1 FROM tenant_documents 
          WHERE tenant_id = OLD.tenant_id 
          AND document_type IN ('lighting_quote_instruction', 'lighting_order_placed')
          AND id != OLD.id
        ) THEN
          UPDATE tenants 
          SET lighting_ordered = false 
          WHERE id = OLD.tenant_id;
        END IF;
      WHEN 'db_order_instruction', 'db_order_placed' THEN
        IF NOT EXISTS (
          SELECT 1 FROM tenant_documents 
          WHERE tenant_id = OLD.tenant_id 
          AND document_type IN ('db_order_instruction', 'db_order_placed')
          AND id != OLD.id
        ) THEN
          UPDATE tenants 
          SET db_ordered = false 
          WHERE id = OLD.tenant_id;
        END IF;
      WHEN 'scope_of_work', 'sow' THEN
        IF NOT EXISTS (
          SELECT 1 FROM tenant_documents 
          WHERE tenant_id = OLD.tenant_id 
          AND document_type IN ('scope_of_work', 'sow')
          AND id != OLD.id
        ) THEN
          UPDATE tenants 
          SET sow_received = false 
          WHERE id = OLD.tenant_id;
        END IF;
      WHEN 'layout', 'floor_plan', 'shop_layout' THEN
        IF NOT EXISTS (
          SELECT 1 FROM tenant_documents 
          WHERE tenant_id = OLD.tenant_id 
          AND document_type IN ('layout', 'floor_plan', 'shop_layout')
          AND id != OLD.id
        ) THEN
          UPDATE tenants 
          SET layout_received = false 
          WHERE id = OLD.tenant_id;
        END IF;
      ELSE
        NULL;
    END CASE;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tenant_documents table
DROP TRIGGER IF EXISTS sync_tenant_status_on_document_change ON tenant_documents;
CREATE TRIGGER sync_tenant_status_on_document_change
AFTER INSERT OR UPDATE OR DELETE ON tenant_documents
FOR EACH ROW
EXECUTE FUNCTION sync_tenant_document_status();

-- Add helpful comment
COMMENT ON FUNCTION sync_tenant_document_status() IS 'Automatically syncs tenant schedule checkboxes when documents are uploaded/deleted. Maps document types to tenant fields: SOW->sow_received, Layout->layout_received, DB Order->db_ordered, Lighting Order->lighting_ordered';