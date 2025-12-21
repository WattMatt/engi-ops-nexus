-- Create function to update bill totals from sections
CREATE OR REPLACE FUNCTION public.update_bill_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the bill's totals based on its sections
  UPDATE final_account_bills
  SET 
    contract_total = COALESCE((
      SELECT SUM(contract_total) FROM final_account_sections WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id)
    ), 0),
    final_total = COALESCE((
      SELECT SUM(final_total) FROM final_account_sections WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id)
    ), 0),
    variation_total = COALESCE((
      SELECT SUM(variation_total) FROM final_account_sections WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id)
    ), 0)
  WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger on final_account_sections
DROP TRIGGER IF EXISTS trigger_update_bill_totals ON public.final_account_sections;
CREATE TRIGGER trigger_update_bill_totals
AFTER INSERT OR UPDATE OR DELETE ON public.final_account_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_bill_totals();