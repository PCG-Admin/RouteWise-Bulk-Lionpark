-- Migration: Allow null order_id in truck_allocations for non-matched plates
-- This allows the system to create allocation records for plates detected by ANPR
-- that don't have a scheduled allocation in the system

-- Make order_id nullable
ALTER TABLE truck_allocations ALTER COLUMN order_id DROP NOT NULL;

-- Add comment to explain the nullable orderId
COMMENT ON COLUMN truck_allocations.order_id IS 'Order ID. Can be null for non-matched ANPR detections.';
