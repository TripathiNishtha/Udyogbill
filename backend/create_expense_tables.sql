CREATE TABLE IF NOT EXISTS expense_categories (
    "Id" uuid NOT NULL,
    "Name" text NOT NULL,
    "Description" text,
    "ColorHex" text,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    "CreatedBy" uuid,
    "UpdatedAtUtc" timestamp with time zone,
    "UpdatedBy" uuid,
    "IsDeleted" boolean NOT NULL DEFAULT false,
    "DeletedAtUtc" timestamp with time zone,
    "DeletedBy" uuid,
    "TenantId" uuid NOT NULL,
    CONSTRAINT "PK_expense_categories" PRIMARY KEY ("Id")
);

CREATE TABLE IF NOT EXISTS expense_vouchers (
    "Id" uuid NOT NULL,
    "VoucherNumber" text NOT NULL,
    "ExpenseDate" timestamp with time zone NOT NULL,
    "CategoryId" uuid NOT NULL,
    "PaymentMode" integer NOT NULL DEFAULT 0,
    "BankAccountId" uuid,
    "ReferenceNumber" text,
    "VendorName" text,
    "TotalAmount" numeric NOT NULL DEFAULT 0,
    "Notes" text,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    "CreatedBy" uuid,
    "UpdatedAtUtc" timestamp with time zone,
    "UpdatedBy" uuid,
    "IsDeleted" boolean NOT NULL DEFAULT false,
    "DeletedAtUtc" timestamp with time zone,
    "DeletedBy" uuid,
    "TenantId" uuid NOT NULL,
    CONSTRAINT "PK_expense_vouchers" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_expense_vouchers_expense_categories_CategoryId" FOREIGN KEY ("CategoryId") REFERENCES expense_categories ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_expense_vouchers_CategoryId" ON expense_vouchers ("CategoryId");
CREATE INDEX IF NOT EXISTS "IX_expense_vouchers_TenantId" ON expense_vouchers ("TenantId");
CREATE INDEX IF NOT EXISTS "IX_expense_vouchers_ExpenseDate" ON expense_vouchers ("ExpenseDate");
CREATE INDEX IF NOT EXISTS "IX_expense_categories_TenantId" ON expense_categories ("TenantId");
