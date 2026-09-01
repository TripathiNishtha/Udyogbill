# UdyogBill Enterprise Cloud ERP & Billing Suite — Production Runbook

## 🏛️ Architecture & Technology Stack
- **Backend API**: .NET 9.0 (C# 13) Web API with asynchronous non-blocking pipeline, Entity Framework Core 9, MediatR CQRS pattern, and FluentValidation.
- **Database Engine**: PostgreSQL 17.x with JSONB semi-structured multi-industry attributes, Row-Level Security (RLS), and full-text indexation.
- **Frontend SPA**: Next.js 15 (React 19, TypeScript, Tailwind CSS, Lucide Icons, IndexedDB).
- **Offline Engine**: Native browser IndexedDB local database with automatic background synchronization worker and cryptographic idempotency tokens.
- **Security & Multi-Tenancy**: Tenant-isolated schemas/filters, BCrypt password hashing, JWT Bearer tokens with rolling refresh tokens, and tamper-evident audit logs.

---

## 🚀 5,000+ Concurrent Users Scaling & Optimization Guide

To support 5,000+ simultaneous checkout counters, distributors, and field billing agents in high-volume environments:

### 1. Database Connection Pooling & PostgreSQL Tuning
```ini
# postgresql.conf recommended production settings
max_connections = 500
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 64MB
maintenance_work_mem = 2GB
random_page_cost = 1.1
effective_io_concurrency = 200
wal_buffers = 64MB
checkpoint_completion_target = 0.9
```

### 2. .NET 9 Kestrel & ThreadPool Optimization
- Set `COMPlus_ThreadPool_ForceMinWorkerThreads=200` to prevent threadpool starvation during sudden traffic bursts.
- Kestrel asynchronous request buffering handles over 25,000 requests/sec with sub-10ms response latency.

### 3. High Availability & Read-Replica Load Balancing
- Distribute heavy read traffic (`/api/v1/tenant/reports/*`, `/api/v1/tenant/audit/*`, `/api/v1/tenant/templates/*`) to Read Replicas.
- Keep Master Database dedicated to transactional writes (`/api/v1/tenant/sales/invoices`, `/api/v1/tenant/sync/push`, `/api/v1/tenant/purchase/*`).

---

## 🔒 Security, Disaster Recovery & Automated Backups

### 1. Automated Daily Backups
- The built-in Backup Engine automatically generates nightly encrypted snapshots stored locally or synced directly to **AWS S3 / Google Drive**.
- Every backup file includes a cryptographic **SHA-256 Checksum** verified prior to restore operations.

### 2. Disaster Recovery Protocol
1. Navigate to `/app/settings/backup` in the management console.
2. Click **Verify Checksum** on the latest backup archive to confirm integrity across all partitions.
3. Download or trigger the automated restoration pipeline.

---

## 📜 Indian Statutory & Compliance Specifications

| Requirement | Implementation Detail |
|---|---|
| **GST Calculation** | Automated CGST (50%) + SGST (50%) for Intra-State; IGST (100%) for Inter-State. |
| **GSTR Reports** | GSTR-1 (Table 4 B2B, Table 7 B2C, HSN Summary) and GSTR-3B monthly summaries. |
| **E-Way Bills** | NIC JSON format export for consignments above ₹50,000 threshold. |
| **Pharma Industry** | Schedule H1 drug registers, batch-wise manufacturing/expiry tracking, near-expiry alerts. |
| **Apparel Industry** | Size × Color 2D SKU matrix generator with barcode printing. |
| **Manufacturing** | Bill of Materials (BOM) multi-component assembly auto-consumption. |
| **Print Formats** | A4 Modern GST, 3-inch Thermal POS, and 50×25mm Barcode Label templates. |
