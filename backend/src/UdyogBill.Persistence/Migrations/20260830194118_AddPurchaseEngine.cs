using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "purchase_orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SupplierPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    SupplierGSTIN = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    SupplierAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpectedDeliveryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TaxSupplyType = table.Column<int>(type: "integer", nullable: false),
                    SupplierStateCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PlaceOfSupply = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SubTotal = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    DiscountTotal = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CessAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    RoundOff = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    TermsAndConditions = table.Column<string>(type: "text", nullable: true),
                    AttributesJson = table.Column<string>(type: "jsonb", nullable: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
                    CancellationReason = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_orders_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_orders_tenant_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "tenant_branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_orders_tenant_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "tenant_warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "goods_receipt_notes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GrnNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DeliveryChallanNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DeliveryChallanDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReceivedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReceivedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Remarks = table.Column<string>(type: "text", nullable: true),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
                    CancellationReason = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_goods_receipt_notes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_goods_receipt_notes_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_goods_receipt_notes_purchase_orders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "purchase_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_goods_receipt_notes_tenant_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "tenant_branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_goods_receipt_notes_tenant_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "tenant_warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "purchase_order_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemSku = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ItemName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    HsnCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    OrderQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ReceivedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    UomId = table.Column<Guid>(type: "uuid", nullable: false),
                    UomCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    GstRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CgstRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SgstRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    SgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IgstRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    IgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CessRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CessAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    AttributesJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_order_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_order_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_order_items_purchase_orders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "purchase_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_order_items_units_of_measure_UomId",
                        column: x => x.UomId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "purchase_bills",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BillNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    VendorInvoiceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    GoodsReceiptNoteId = table.Column<Guid>(type: "uuid", nullable: true),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SupplierGSTIN = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    SupplierAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SupplierStateCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PlaceOfSupply = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BillDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TaxSupplyType = table.Column<int>(type: "integer", nullable: false),
                    SubTotal = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    DiscountTotal = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CessAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    RoundOff = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    PaidAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    BalanceAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    PaymentStatus = table.Column<int>(type: "integer", nullable: false),
                    PrimaryPaymentMode = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    AttributesJson = table.Column<string>(type: "jsonb", nullable: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
                    CancellationReason = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_bills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_bills_goods_receipt_notes_GoodsReceiptNoteId",
                        column: x => x.GoodsReceiptNoteId,
                        principalTable: "goods_receipt_notes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_purchase_bills_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_bills_purchase_orders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "purchase_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_bills_tenant_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "tenant_branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_bills_tenant_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "tenant_warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "goods_receipt_note_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GoodsReceiptNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseOrderItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemSku = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ItemName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    BatchNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ManufacturingDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReceivedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    AcceptedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    RejectedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    UomId = table.Column<Guid>(type: "uuid", nullable: false),
                    UomCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UnitCost = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_goods_receipt_note_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_goods_receipt_note_items_goods_receipt_notes_GoodsReceiptNo~",
                        column: x => x.GoodsReceiptNoteId,
                        principalTable: "goods_receipt_notes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_goods_receipt_note_items_item_batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "item_batches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_goods_receipt_note_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_goods_receipt_note_items_purchase_order_items_PurchaseOrder~",
                        column: x => x.PurchaseOrderItemId,
                        principalTable: "purchase_order_items",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_goods_receipt_note_items_units_of_measure_UomId",
                        column: x => x.UomId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "purchase_bill_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseBillId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemSku = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ItemName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    HsnCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    BatchNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    UomId = table.Column<Guid>(type: "uuid", nullable: false),
                    UomCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    GstRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CgstRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SgstRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    SgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IgstRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    IgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CessRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CessAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    AttributesJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_bill_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_bill_items_item_batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "item_batches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_bill_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_bill_items_purchase_bills_PurchaseBillId",
                        column: x => x.PurchaseBillId,
                        principalTable: "purchase_bills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_bill_items_units_of_measure_UomId",
                        column: x => x.UomId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "purchase_bill_payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseBillId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    PaymentMode = table.Column<int>(type: "integer", nullable: false),
                    TransactionReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BankName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_bill_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_bill_payments_purchase_bills_PurchaseBillId",
                        column: x => x.PurchaseBillId,
                        principalTable: "purchase_bills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_note_items_BatchId",
                table: "goods_receipt_note_items",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_note_items_GoodsReceiptNoteId",
                table: "goods_receipt_note_items",
                column: "GoodsReceiptNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_note_items_ItemId",
                table: "goods_receipt_note_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_note_items_PurchaseOrderItemId",
                table: "goods_receipt_note_items",
                column: "PurchaseOrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_note_items_UomId",
                table: "goods_receipt_note_items",
                column: "UomId");

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_notes_BranchId",
                table: "goods_receipt_notes",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_notes_PartyId",
                table: "goods_receipt_notes",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_notes_PurchaseOrderId",
                table: "goods_receipt_notes",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_notes_TenantId_GrnNumber",
                table: "goods_receipt_notes",
                columns: new[] { "TenantId", "GrnNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_notes_TenantId_PurchaseOrderId",
                table: "goods_receipt_notes",
                columns: new[] { "TenantId", "PurchaseOrderId" });

            migrationBuilder.CreateIndex(
                name: "IX_goods_receipt_notes_WarehouseId",
                table: "goods_receipt_notes",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bill_items_BatchId",
                table: "purchase_bill_items",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bill_items_ItemId",
                table: "purchase_bill_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bill_items_PurchaseBillId",
                table: "purchase_bill_items",
                column: "PurchaseBillId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bill_items_UomId",
                table: "purchase_bill_items",
                column: "UomId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bill_payments_PurchaseBillId",
                table: "purchase_bill_payments",
                column: "PurchaseBillId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bill_payments_TenantId_PurchaseBillId_PaymentDate",
                table: "purchase_bill_payments",
                columns: new[] { "TenantId", "PurchaseBillId", "PaymentDate" });

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_BranchId",
                table: "purchase_bills",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_GoodsReceiptNoteId",
                table: "purchase_bills",
                column: "GoodsReceiptNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_PartyId",
                table: "purchase_bills",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_PurchaseOrderId",
                table: "purchase_bills",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_TenantId_BillNumber",
                table: "purchase_bills",
                columns: new[] { "TenantId", "BillNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_TenantId_PartyId_BillDate",
                table: "purchase_bills",
                columns: new[] { "TenantId", "PartyId", "BillDate" });

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_WarehouseId",
                table: "purchase_bills",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_order_items_ItemId",
                table: "purchase_order_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_order_items_PurchaseOrderId",
                table: "purchase_order_items",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_order_items_UomId",
                table: "purchase_order_items",
                column: "UomId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_BranchId",
                table: "purchase_orders",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_PartyId",
                table: "purchase_orders",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_TenantId_OrderNumber",
                table: "purchase_orders",
                columns: new[] { "TenantId", "OrderNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_TenantId_PartyId_OrderDate",
                table: "purchase_orders",
                columns: new[] { "TenantId", "PartyId", "OrderDate" });

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_WarehouseId",
                table: "purchase_orders",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "goods_receipt_note_items");

            migrationBuilder.DropTable(
                name: "purchase_bill_items");

            migrationBuilder.DropTable(
                name: "purchase_bill_payments");

            migrationBuilder.DropTable(
                name: "purchase_order_items");

            migrationBuilder.DropTable(
                name: "purchase_bills");

            migrationBuilder.DropTable(
                name: "goods_receipt_notes");

            migrationBuilder.DropTable(
                name: "purchase_orders");
        }
    }
}
