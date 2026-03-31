-- Big Boss Fitness - Database Initialization Script
-- This script runs automatically when PostgreSQL container starts for the first time

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bigbossfitness TO bigboss;

-- Note: Tables will be created by EF Core migrations
-- This script is for any initial setup that needs to happen before the app starts
