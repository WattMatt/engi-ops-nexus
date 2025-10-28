-- Add missing enum value for cable_schedule
ALTER TYPE design_purpose ADD VALUE IF NOT EXISTS 'cable_schedule';