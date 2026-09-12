import * as XLSX from "xlsx";

export interface MasterMigrationTemplateConfig {
  includeSampleData?: boolean;
}

/**
 * Generates and triggers download of UdyogBill's Master Multi-Sheet Migration Excel Workbook (.xlsx)
 * Contains 7 comprehensive sheets covering 100% of legacy ERP data requirements:
 * 1. Instructions & Guidelines
 * 2. Customers (Sundry Debtors)
 * 3. Suppliers (Sundry Creditors)
 * 4. Products & Items Catalog
 * 5. Opening Batches & Expiries
 * 6. Opening Accounts & Ledgers
 * 7. Historical Invoices
 */
export function downloadMasterMigrationTemplate(config: MasterMigrationTemplateConfig = { includeSampleData: true }) {
  const wb = XLSX.utils.book_new();

  // --- SHEET 1: INSTRUCTIONS & GUIDELINES ---
  const instructionsData = [
    {
      "Section / Step": "1. Master Workbook Purpose",
      "Field / Rule": "Overview",
      "Requirement / Format": "Designed for 100% complete migration into UdyogBill from Marg ERP 9+, Tally Prime, Vyapar, Busy, or any Excel file.",
      "Example / Notes": "Fill in the relevant sheets and upload at: Settings -> Migration -> Universal Multi-Sheet Migrator"
    },
    {
      "Section / Step": "2. Sheets Included",
      "Field / Rule": "Sheet Structure",
      "Requirement / Format": "• CUSTOMERS: Sundry Debtors, GSTIN, Drug License, Credit Limits, Opening Balances\n• SUPPLIERS: Sundry Creditors, GSTIN, DL, FSSAI, Payment Terms, Opening Balances\n• PRODUCTS_CATALOG: Item Names, SKU, Barcode, HSN, Tax%, MRP, Retail Rate (Sale Price), Wholesale Rate (B2B/Min Rate) & Purchase Rate\n• OPENING_BATCHES: Multi-Batch inventory, Batch No, Expiry Dates, Opening Quantities\n• OPENING_LEDGERS: Chart of Accounts (Bank, Cash, Capital, Assets) with Opening Balances\n• HISTORICAL_INVOICES: (Optional) Past sales bills for reference and customer balances",
      "Example / Notes": "You can fill all sheets or only the ones you need. Empty sheets are safely ignored."
    },
    {
      "Section / Step": "3. Multi-Tier Pricing (Retail & Wholesale)",
      "Field / Rule": "Retail vs Wholesale Rates",
      "Requirement / Format": "• RetailRate: Price charged to retail counter walk-in customers.\n• WholesaleRate: Minimum selling price charged to B2B distributors/retailers.\n• MRP: Max Retail Price printed on package commodity.",
      "Example / Notes": "Retail: 28.00, Wholesale: 25.00, MRP: 30.50, Purchase: 21.00"
    },
    {
      "Section / Step": "4. Mandatory Fields",
      "Field / Rule": "Required Columns (*)",
      "Requirement / Format": "Columns marked with an asterisk (*) are mandatory. Other columns are optional and can be left blank.",
      "Example / Notes": "Example: Legal Name, Mobile, Product Name, SKU, Primary UOM, RetailRate, Batch No."
    },
    {
      "Section / Step": "5. GST Tax Slabs",
      "Field / Rule": "Tax Rates (%)",
      "Requirement / Format": "Enter standard GST rates as numbers without % sign: 0, 5, 12, 18, or 28.",
      "Example / Notes": "Example: Enter 12 for 12% GST, 18 for 18% GST"
    },
    {
      "Section / Step": "6. Standard Industry Units (UOM)",
      "Field / Rule": "Supported Units",
      "Requirement / Format": "• Pharma: Strip, Box, Bottle, Vial, Ampoule, Tube, Pcs\n• FMCG / Grocery: Pkt, Kg, Gm, Ltr, Ml, Box, Pcs\n• Hardware / Sanitary: Pcs, Set, Meter, Feet, Kg, Roll\n• Garments / Apparel: Pcs, Set, Meter, Pair, Dozen\n• Electronics: Pcs, Unit, Box, Set\n• Services: Hour, Day, Job, Month",
      "Example / Notes": "You can use standard units or custom units. UdyogBill automatically matches or creates them."
    },
    {
      "Section / Step": "7. Date Formats",
      "Field / Rule": "Expiry & Invoice Dates",
      "Requirement / Format": "Preferred format: YYYY-MM-DD (e.g., 2028-12-31). MM/YYYY or MM/YY (e.g., 12/28) is also auto-converted.",
      "Example / Notes": "2028-12-31 or 12/28"
    },
    {
      "Section / Step": "8. Opening Balance Direction",
      "Field / Rule": "Debit vs Credit",
      "Requirement / Format": "• Customers (Debtors): 'Debit' = Customer owes you money. 'Credit' = Advance paid by customer.\n• Suppliers (Creditors): 'Credit' = You owe supplier money. 'Debit' = Advance paid to supplier.",
      "Example / Notes": "Type 'Debit' or 'Credit'"
    }
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
  wsInstructions["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 65 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, "INSTRUCTIONS");

  // --- SHEET 2: CUSTOMERS (Debtors) ---
  const customersData = [
    {
      "PartyType*": "Customer",
      "LegalName*": "Apollo Medical Store",
      "TradeName": "Apollo Retail Saket",
      "Mobile*": "9811223344",
      "Phone": "011-23456789",
      "Email": "accounts@apollomed.com",
      "GSTIN": "07AAAAA0000A1Z5",
      "PAN": "AAAAA0000A",
      "DrugLicense": "DL-20B/99214, DL-21B/99215",
      "Address": "Shop 12, Main Market, Saket",
      "City": "New Delhi",
      "State": "Delhi",
      "StateCode": "07",
      "Pincode": "110017",
      "CreditLimit": 50000,
      "CreditDays": 30,
      "OpeningBalance": 8500,
      "BalanceType": "Debit"
    },
    {
      "PartyType*": "Customer",
      "LegalName*": "Sharma General Store",
      "TradeName": "Sharma Kirana Mart",
      "Mobile*": "9876501234",
      "Phone": "",
      "Email": "sharma.store@gmail.com",
      "GSTIN": "",
      "PAN": "",
      "DrugLicense": "",
      "Address": "Opposite Railway Station, Sadar Bazar",
      "City": "Lucknow",
      "State": "Uttar Pradesh",
      "StateCode": "09",
      "Pincode": "226001",
      "CreditLimit": 20000,
      "CreditDays": 15,
      "OpeningBalance": 1200,
      "BalanceType": "Debit"
    },
    {
      "PartyType*": "Customer",
      "LegalName*": "Apex Electronics & Hardware",
      "TradeName": "Apex Tech Hub",
      "Mobile*": "9988776655",
      "Phone": "022-67890123",
      "Email": "billing@apextech.in",
      "GSTIN": "27BBBBB2222B1Z3",
      "PAN": "BBBBB2222B",
      "DrugLicense": "",
      "Address": "Plot 45, MIDC Industrial Area, Andheri East",
      "City": "Mumbai",
      "State": "Maharashtra",
      "StateCode": "27",
      "Pincode": "400093",
      "CreditLimit": 150000,
      "CreditDays": 45,
      "OpeningBalance": 0,
      "BalanceType": "Debit"
    }
  ];

  const wsCustomers = XLSX.utils.json_to_sheet(config.includeSampleData ? customersData : customersData.slice(0, 0));
  wsCustomers["!cols"] = [
    { wch: 12 }, { wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
    { wch: 18 }, { wch: 14 }, { wch: 25 }, { wch: 35 }, { wch: 16 }, { wch: 16 },
    { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsCustomers, "CUSTOMERS");

  // --- SHEET 3: SUPPLIERS (Creditors) ---
  const suppliersData = [
    {
      "PartyType*": "Supplier",
      "LegalName*": "Cipla Healthcare Distributors",
      "TradeName": "Cipla Direct Depot",
      "Mobile*": "9876543210",
      "Phone": "022-28490123",
      "Email": "orders@cipladist.com",
      "GSTIN": "27CCCCCC3333C1Z8",
      "PAN": "CCCCCC3333C",
      "DrugLicense": "DL-20B/10492, DL-21B/10493",
      "FSSAINumber": "10019011000123",
      "Address": "Plot 14, Okhla Industrial Area Phase 3",
      "City": "New Delhi",
      "State": "Delhi",
      "StateCode": "07",
      "Pincode": "110020",
      "CreditDays": 30,
      "OpeningBalance": 25000,
      "BalanceType": "Credit"
    },
    {
      "PartyType*": "Supplier",
      "LegalName*": "Hindustan Unilever Depot",
      "TradeName": "HUL C&F Agency",
      "Mobile*": "9823456789",
      "Phone": "011-45678901",
      "Email": "supply@huldepot.com",
      "GSTIN": "07DDDDD4444D1Z2",
      "PAN": "DDDDD4444D",
      "DrugLicense": "",
      "FSSAINumber": "10018022000456",
      "Address": "Godown 4, Transport Nagar",
      "City": "Kanpur",
      "State": "Uttar Pradesh",
      "StateCode": "09",
      "Pincode": "208001",
      "CreditDays": 21,
      "OpeningBalance": 18400,
      "BalanceType": "Credit"
    },
    {
      "PartyType*": "Supplier",
      "LegalName*": "Havells India Logistics",
      "TradeName": "Havells Branch Depot",
      "Mobile*": "9712345678",
      "Phone": "",
      "Email": "b2b@havellslog.com",
      "GSTIN": "06EEEEE5555E1Z9",
      "PAN": "EEEEE5555E",
      "DrugLicense": "",
      "FSSAINumber": "",
      "Address": "Sector 18, Udyog Vihar",
      "City": "Gurugram",
      "State": "Haryana",
      "StateCode": "06",
      "Pincode": "122015",
      "CreditDays": 45,
      "OpeningBalance": 0,
      "BalanceType": "Credit"
    }
  ];

  const wsSuppliers = XLSX.utils.json_to_sheet(config.includeSampleData ? suppliersData : suppliersData.slice(0, 0));
  wsSuppliers["!cols"] = [
    { wch: 12 }, { wch: 30 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
    { wch: 18 }, { wch: 14 }, { wch: 25 }, { wch: 18 }, { wch: 35 }, { wch: 16 },
    { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSuppliers, "SUPPLIERS");

  // --- SHEET 4: PRODUCTS & ITEMS CATALOG ---
  const productsData = [
    {
      "ProductName*": "Dolo 650mg Strip 15s",
      "SKU*": "DOL-650",
      "Barcode": "8901234567890",
      "Category": "Tablets",
      "Brand": "Micro Labs",
      "PrimaryUOM*": "Strip",
      "HSNCode": "30049099",
      "TaxRate*": 12,
      "CessRate": 0,
      "PurchasePrice": 21.00,
      "RetailRate*": 28.00,
      "WholesaleRate": 25.00,
      "MRP*": 30.50,
      "MinimumStockAlert": 20,
      "ReorderQuantity": 50,
      "OpeningStock": 150,
      "BatchNumber": "B26-081",
      "ExpiryDate": "2028-12-31",
      "RackLocation": "Rack A-3",
      "Description": "Paracetamol 650mg Antipyretic Tablets"
    },
    {
      "ProductName*": "Augmentin 625 Duo Tab",
      "SKU*": "AUG-625",
      "Barcode": "8909876543210",
      "Category": "Antibiotics",
      "Brand": "GSK",
      "PrimaryUOM*": "Strip",
      "HSNCode": "30049099",
      "TaxRate*": 12,
      "CessRate": 0,
      "PurchasePrice": 145.00,
      "RetailRate*": 185.00,
      "WholesaleRate": 168.00,
      "MRP*": 201.00,
      "MinimumStockAlert": 10,
      "ReorderQuantity": 25,
      "OpeningStock": 40,
      "BatchNumber": "AG-991",
      "ExpiryDate": "2027-08-31",
      "RackLocation": "Rack B-1",
      "Description": "Amoxicillin & Clavulanate Potassium"
    },
    {
      "ProductName*": "Tata Tea Gold 500g",
      "SKU*": "TT-GOLD-500",
      "Barcode": "8901030712345",
      "Category": "Beverages",
      "Brand": "Tata Consumer",
      "PrimaryUOM*": "Pkt",
      "HSNCode": "09024020",
      "TaxRate*": 5,
      "CessRate": 0,
      "PurchasePrice": 280.00,
      "RetailRate*": 310.00,
      "WholesaleRate": 295.00,
      "MRP*": 330.00,
      "MinimumStockAlert": 15,
      "ReorderQuantity": 30,
      "OpeningStock": 60,
      "BatchNumber": "TT-AUG26",
      "ExpiryDate": "2027-02-28",
      "RackLocation": "Aisle 2",
      "Description": "Premium Assam Leaf Tea with Gently Rolled Leaves"
    },
    {
      "ProductName*": "Finolex 1.5 Sqmm Wire 90m",
      "SKU*": "FIN-15-90M",
      "Barcode": "8904000112233",
      "Category": "Cables & Wires",
      "Brand": "Finolex",
      "PrimaryUOM*": "Roll",
      "HSNCode": "85444990",
      "TaxRate*": 18,
      "CessRate": 0,
      "PurchasePrice": 1450.00,
      "RetailRate*": 1750.00,
      "WholesaleRate": 1600.00,
      "MRP*": 1950.00,
      "MinimumStockAlert": 5,
      "ReorderQuantity": 10,
      "OpeningStock": 25,
      "BatchNumber": "LOT-992",
      "ExpiryDate": "",
      "RackLocation": "Godown 1-B",
      "Description": "Flame Retardant PVC Insulated Industrial Wire"
    },
    {
      "ProductName*": "Cotton Formal Shirt 40 M",
      "SKU*": "SHIRT-CF-40",
      "Barcode": "8905000998877",
      "Category": "Apparel",
      "Brand": "Raymond",
      "PrimaryUOM*": "Pcs",
      "HSNCode": "62052000",
      "TaxRate*": 5,
      "CessRate": 0,
      "PurchasePrice": 650.00,
      "RetailRate*": 999.00,
      "WholesaleRate": 850.00,
      "MRP*": 1299.00,
      "MinimumStockAlert": 8,
      "ReorderQuantity": 20,
      "OpeningStock": 30,
      "BatchNumber": "",
      "ExpiryDate": "",
      "RackLocation": "Shelf 4",
      "Description": "100% Combed Cotton Regular Fit Formal Shirt"
    }
  ];

  const wsProducts = XLSX.utils.json_to_sheet(config.includeSampleData ? productsData : productsData.slice(0, 0));
  wsProducts["!cols"] = [
    { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsProducts, "PRODUCTS_CATALOG");

  // --- SHEET 5: OPENING BATCHES & EXPIRIES ---
  const batchesData = [
    {
      "SKU*": "DOL-650",
      "ProductName": "Dolo 650mg Strip 15s",
      "BatchNumber*": "B26-081",
      "ExpiryDate*": "2028-12-31",
      "OpeningQuantity*": 100,
      "PurchaseRate": 21.00,
      "MRP": 30.50,
      "WarehouseName": "Main Warehouse"
    },
    {
      "SKU*": "DOL-650",
      "ProductName": "Dolo 650mg Strip 15s",
      "BatchNumber*": "B25-994",
      "ExpiryDate*": "2026-11-30",
      "OpeningQuantity*": 50,
      "PurchaseRate": 20.50,
      "MRP": 30.50,
      "WarehouseName": "Main Warehouse"
    },
    {
      "SKU*": "AUG-625",
      "ProductName": "Augmentin 625 Duo Tab",
      "BatchNumber*": "AG-991",
      "ExpiryDate*": "2027-08-31",
      "OpeningQuantity*": 25,
      "PurchaseRate": 145.00,
      "MRP": 201.00,
      "WarehouseName": "Main Warehouse"
    },
    {
      "SKU*": "AUG-625",
      "ProductName": "Augmentin 625 Duo Tab",
      "BatchNumber*": "AG-880",
      "ExpiryDate*": "2026-06-30",
      "OpeningQuantity*": 15,
      "PurchaseRate": 140.00,
      "MRP": 195.00,
      "WarehouseName": "Main Warehouse"
    }
  ];

  const wsBatches = XLSX.utils.json_to_sheet(config.includeSampleData ? batchesData : batchesData.slice(0, 0));
  wsBatches["!cols"] = [
    { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    { wch: 12 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsBatches, "OPENING_BATCHES");

  // --- SHEET 6: OPENING ACCOUNTS & LEDGERS ---
  const ledgersData = [
    {
      "AccountGroup*": "Bank Accounts",
      "AccountName*": "HDFC Bank Current A/c 5020",
      "OpeningBalance*": 145000,
      "BalanceType*": "Debit",
      "Remarks": "IFSC: HDFC0001234, Branch Saket"
    },
    {
      "AccountGroup*": "Cash-in-Hand",
      "AccountName*": "Main Store Cash Counter",
      "OpeningBalance*": 25000,
      "BalanceType*": "Debit",
      "Remarks": "Physical cash in shop cash drawer"
    },
    {
      "AccountGroup*": "Fixed Assets",
      "AccountName*": "Store Furniture & Racks",
      "OpeningBalance*": 85000,
      "BalanceType*": "Debit",
      "Remarks": "Display counters, glass racks, billing counter"
    },
    {
      "AccountGroup*": "Capital Account",
      "AccountName*": "Proprietor Capital Account",
      "OpeningBalance*": 500000,
      "BalanceType*": "Credit",
      "Remarks": "Initial proprietor equity investment"
    },
    {
      "AccountGroup*": "Secured Loans",
      "AccountName*": "SBI Business Loan Account",
      "OpeningBalance*": 200000,
      "BalanceType*": "Credit",
      "Remarks": "Term loan tenure 36 months"
    }
  ];

  const wsLedgers = XLSX.utils.json_to_sheet(config.includeSampleData ? ledgersData : ledgersData.slice(0, 0));
  wsLedgers["!cols"] = [
    { wch: 22 }, { wch: 32 }, { wch: 18 }, { wch: 14 }, { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLedgers, "OPENING_LEDGERS");

  // --- SHEET 7: HISTORICAL INVOICES ---
  const invoicesData = [
    {
      "InvoiceNumber*": "INV-2025-0101",
      "InvoiceDate*": "2026-02-20",
      "CustomerName*": "Apollo Medical Store",
      "CustomerMobile": "9811223344",
      "TaxableAmount*": 2500.00,
      "GSTAmount*": 300.00,
      "TotalAmount*": 2800.00,
      "PaidAmount*": 2800.00,
      "PaymentMode": "UPI / NetBanking",
      "ItemsSummary": "Dolo 650 (50 Strips), Augmentin 625 (10 Strips)"
    },
    {
      "InvoiceNumber*": "INV-2025-0102",
      "InvoiceDate*": "2026-02-22",
      "CustomerName*": "Walk-in Retail Buyer",
      "CustomerMobile": "9899001122",
      "TaxableAmount*": 850.00,
      "GSTAmount*": 102.00,
      "TotalAmount*": 952.00,
      "PaidAmount*": 952.00,
      "PaymentMode": "Cash",
      "ItemsSummary": "Tata Tea Gold 500g (2 Pkt)"
    }
  ];

  const wsInvoices = XLSX.utils.json_to_sheet(config.includeSampleData ? invoicesData : invoicesData.slice(0, 0));
  wsInvoices["!cols"] = [
    { wch: 18 }, { wch: 14 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsInvoices, "HISTORICAL_INVOICES");

  // Write file and trigger download
  const fileName = "UdyogBill_Master_Migration_Template.xlsx";
  XLSX.writeFile(wb, fileName, { bookType: "xlsx", type: "binary" });
}

export const MASTER_MIGRATION_SHEETS_INFO = [
  {
    name: "INSTRUCTIONS",
    title: "📘 Guidelines & Legend",
    desc: "Complete field instructions, valid GST slabs, industry-standard UOMs, and rules for zero data loss."
  },
  {
    name: "CUSTOMERS",
    title: "👥 Customers (Debtors)",
    desc: "Sundry Debtors master with Legal Name, Mobile, GSTIN, Drug License, Address, Credit Limit & Opening Balance (Debit)."
  },
  {
    name: "SUPPLIERS",
    title: "🏭 Suppliers (Creditors)",
    desc: "Sundry Creditors master with Vendor Name, Mobile, GSTIN, Drug License, FSSAI, Credit Days & Opening Balance (Credit)."
  },
  {
    name: "PRODUCTS_CATALOG",
    title: "📦 Products & Items Catalog",
    desc: "Catalog directory with SKU, Barcode, HSN, Tax%, MRP, Retail Rate (Sale Price), Wholesale Rate (B2B Price), Purchase Price, Rack Location & Opening Stock."
  },
  {
    name: "OPENING_BATCHES",
    title: "🏷️ Opening Batches & Expiries",
    desc: "Multi-batch inventory breakdown per SKU with Batch Numbers, Expiry Dates, Quantities & MRP."
  },
  {
    name: "OPENING_LEDGERS",
    title: "📑 Opening Accounts & Ledgers",
    desc: "Opening balances for Bank Accounts, Cash Counters, Capital, Fixed Assets, and Loans."
  },
  {
    name: "HISTORICAL_INVOICES",
    title: "🧾 Historical Invoices (Optional)",
    desc: "Legacy bills reference to maintain audit history and customer sales records."
  }
];
