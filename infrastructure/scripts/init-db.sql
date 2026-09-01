-- Database Initialization Script for UdyogBill Multi-Industry SaaS
-- Mandatory Engine: PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant basic privileges
GRANT ALL PRIVILEGES ON DATABASE udyogbill_db TO postgres;
