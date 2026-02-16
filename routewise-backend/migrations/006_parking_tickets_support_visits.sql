-- Migration: Add visit support to parking tickets
-- Allows parking tickets to be linked to either allocations OR visits

-- Add visitId column
ALTER TABLE parking_tickets ADD COLUMN visit_id INTEGER REFERENCES planned_visits(id);

-- Make truck_allocation_id nullable (can be null for non-matched visits)
ALTER TABLE parking_tickets ALTER COLUMN truck_allocation_id DROP NOT NULL;

-- Add check constraint: either truck_allocation_id OR visit_id must be set (not both, not neither)
ALTER TABLE parking_tickets ADD CONSTRAINT parking_ticket_link_check
  CHECK ((truck_allocation_id IS NOT NULL AND visit_id IS NULL) OR (truck_allocation_id IS NULL AND visit_id IS NOT NULL));

-- Add comment
COMMENT ON COLUMN parking_tickets.visit_id IS 'Visit ID for non-matched plates. Mutually exclusive with truck_allocation_id.';
COMMENT ON COLUMN parking_tickets.truck_allocation_id IS 'Allocation ID for scheduled trucks. Mutually exclusive with visit_id.';
