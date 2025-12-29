-- Add db_circuit_id column to floor_plan_cables table to persist circuit assignments
ALTER TABLE floor_plan_cables 
ADD COLUMN db_circuit_id uuid REFERENCES db_circuits(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_floor_plan_cables_db_circuit_id ON floor_plan_cables(db_circuit_id);

-- Add comment explaining the column
COMMENT ON COLUMN floor_plan_cables.db_circuit_id IS 'Links the cable to a circuit in the db_circuits table for circuit-based material tracking';