import 'dart:async';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

class AppDatabase {
  static final AppDatabase instance = AppDatabase._init();
  static Database? _database;

  AppDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('udyogbill_offline.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 7,
      onCreate: _createDB,
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          final cols = [
            'ALTER TABLE parties ADD COLUMN tradeName TEXT',
            'ALTER TABLE parties ADD COLUMN contactPerson TEXT',
            'ALTER TABLE parties ADD COLUMN customerType INTEGER DEFAULT 1',
            'ALTER TABLE parties ADD COLUMN pan TEXT',
            'ALTER TABLE parties ADD COLUMN state TEXT',
            'ALTER TABLE parties ADD COLUMN stateCode TEXT',
            'ALTER TABLE parties ADD COLUMN city TEXT',
            'ALTER TABLE parties ADD COLUMN pincode TEXT',
            'ALTER TABLE parties ADD COLUMN creditLimit REAL DEFAULT 0.0',
            'ALTER TABLE parties ADD COLUMN creditPeriodDays INTEGER DEFAULT 30',
            'ALTER TABLE parties ADD COLUMN drugLicenseNumber TEXT',
            'ALTER TABLE parties ADD COLUMN fssaiNumber TEXT',
            'ALTER TABLE parties ADD COLUMN attributesJson TEXT',
          ];
          for (final col in cols) {
            try {
              await db.execute(col);
            } catch (_) {}
          }
        }
        if (oldVersion < 3) {
          await _createSfaTables(db);
        }
        if (oldVersion < 4) {
          final b2bCols = [
            'ALTER TABLE invoices ADD COLUMN placeOfSupply TEXT',
            'ALTER TABLE invoices ADD COLUMN billingStateCode TEXT',
            'ALTER TABLE invoices ADD COLUMN shippingStateCode TEXT',
            'ALTER TABLE invoices ADD COLUMN billingAddress TEXT',
            'ALTER TABLE invoices ADD COLUMN shippingAddress TEXT',
            'ALTER TABLE invoices ADD COLUMN poNumber TEXT',
            'ALTER TABLE invoices ADD COLUMN poDate TEXT',
            'ALTER TABLE invoices ADD COLUMN vehicleNumber TEXT',
            'ALTER TABLE invoices ADD COLUMN transporterName TEXT',
            'ALTER TABLE invoices ADD COLUMN transporterId TEXT',
            'ALTER TABLE invoices ADD COLUMN ewayBillNumber TEXT',
            'ALTER TABLE invoices ADD COLUMN ewayBillDate TEXT',
            'ALTER TABLE invoices ADD COLUMN lrNumber TEXT',
            'ALTER TABLE invoices ADD COLUMN lrDate TEXT',
            'ALTER TABLE invoices ADD COLUMN isReverseCharge INTEGER DEFAULT 0',
            'ALTER TABLE invoices ADD COLUMN invoiceType INTEGER DEFAULT 1',
            'ALTER TABLE invoice_items ADD COLUMN hsnCode TEXT',
            'ALTER TABLE invoice_items ADD COLUMN expiryDate TEXT',
            'ALTER TABLE invoice_items ADD COLUMN mrp REAL DEFAULT 0.0',
            'ALTER TABLE invoice_items ADD COLUMN ptr REAL DEFAULT 0.0',
            'ALTER TABLE invoice_items ADD COLUMN pts REAL DEFAULT 0.0',
            'ALTER TABLE invoice_items ADD COLUMN freeQuantity REAL DEFAULT 0.0',
            'ALTER TABLE invoice_items ADD COLUMN schemeDiscountPercent REAL DEFAULT 0.0',
          ];
          for (final col in b2bCols) {
            try {
              await db.execute(col);
            } catch (_) {}
          }
        }
        if (oldVersion < 5) {
          await db.execute('''
            CREATE TABLE IF NOT EXISTS payments (
              id TEXT PRIMARY KEY,
              tenantId TEXT NOT NULL,
              paymentNumber TEXT NOT NULL,
              partyId TEXT NOT NULL,
              partyName TEXT NOT NULL,
              partyPhone TEXT,
              amount REAL NOT NULL,
              paymentDate TEXT NOT NULL,
              paymentMode INTEGER NOT NULL,
              referenceNumber TEXT,
              notes TEXT,
              isSynced INTEGER NOT NULL DEFAULT 0,
              createdAt TEXT NOT NULL
            )
          ''');
          try {
            await db.execute('CREATE INDEX IF NOT EXISTS idx_payments_party ON payments (partyId)');
          } catch (_) {}
        }
        if (oldVersion < 6) {
          await db.execute('''
            CREATE TABLE IF NOT EXISTS sales_returns (
              id TEXT PRIMARY KEY,
              tenantId TEXT NOT NULL,
              creditNoteNumber TEXT NOT NULL,
              originalInvoiceId TEXT,
              originalInvoiceNumber TEXT,
              partyId TEXT NOT NULL,
              partyName TEXT NOT NULL,
              partyPhone TEXT,
              returnDate TEXT NOT NULL,
              returnReason TEXT NOT NULL,
              taxableAmount REAL NOT NULL,
              cgstAmount REAL NOT NULL,
              sgstAmount REAL NOT NULL,
              igstAmount REAL NOT NULL,
              totalAmount REAL NOT NULL,
              restockToWarehouse INTEGER NOT NULL DEFAULT 1,
              isSynced INTEGER NOT NULL DEFAULT 0,
              createdAt TEXT NOT NULL
            )
          ''');
          await db.execute('''
            CREATE TABLE IF NOT EXISTS sales_return_items (
              id TEXT PRIMARY KEY,
              returnId TEXT NOT NULL,
              itemId TEXT NOT NULL,
              itemName TEXT NOT NULL,
              hsnCode TEXT,
              batchNumber TEXT,
              expiryDate TEXT,
              quantity REAL NOT NULL,
              unitPrice REAL NOT NULL,
              taxableAmount REAL NOT NULL,
              gstRate REAL NOT NULL,
              cgstAmount REAL NOT NULL,
              sgstAmount REAL NOT NULL,
              igstAmount REAL NOT NULL,
              totalAmount REAL NOT NULL,
              FOREIGN KEY (returnId) REFERENCES sales_returns (id) ON DELETE CASCADE
            )
          ''');
          try {
            await db.execute('CREATE INDEX IF NOT EXISTS idx_returns_party ON sales_returns (partyId)');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_returns_date ON sales_returns (returnDate)');
          } catch (_) {}
        }
        if (oldVersion < 7) {
          final itemCols = [
            'ALTER TABLE items ADD COLUMN batchNumber TEXT',
            'ALTER TABLE items ADD COLUMN expiryDate TEXT',
            'ALTER TABLE items ADD COLUMN mrp REAL DEFAULT 0.0',
            'ALTER TABLE items ADD COLUMN ptr REAL DEFAULT 0.0',
            'ALTER TABLE items ADD COLUMN pts REAL DEFAULT 0.0',
            'ALTER TABLE items ADD COLUMN rackLocation TEXT',
          ];
          for (final col in itemCols) {
            try {
              await db.execute(col);
            } catch (_) {}
          }
          try {
            await db.execute('CREATE INDEX IF NOT EXISTS idx_items_expiry ON items (expiryDate)');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_items_batch ON items (batchNumber)');
          } catch (_) {}
        }
      },
    );
  }

  Future<void> _createDB(Database db, int version) async {
    // 1. Products / Items Table (Optimized for 50,000+ Items Search)
    await db.execute('''
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        name TEXT NOT NULL,
        sku TEXT,
        barcode TEXT,
        hsnCode TEXT,
        batchNumber TEXT,
        expiryDate TEXT,
        mrp REAL NOT NULL DEFAULT 0.0,
        ptr REAL NOT NULL DEFAULT 0.0,
        pts REAL NOT NULL DEFAULT 0.0,
        rackLocation TEXT,
        salePrice REAL NOT NULL,
        purchasePrice REAL NOT NULL,
        stockQuantity REAL NOT NULL,
        gstRate REAL NOT NULL,
        uom TEXT,
        categoryName TEXT,
        isSynced INTEGER NOT NULL DEFAULT 1,
        updatedAt TEXT NOT NULL
      )
    ''');

    // Indexes for instant sub-10ms search on low-end phones
    await db.execute('CREATE INDEX idx_items_name ON items (name)');
    await db.execute('CREATE INDEX idx_items_barcode ON items (barcode)');
    await db.execute('CREATE INDEX idx_items_sku ON items (sku)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_items_expiry ON items (expiryDate)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_items_batch ON items (batchNumber)');

    // 2. Customers / Parties Table with complete GST, PAN, Address & Credit Fields
    await db.execute('''
      CREATE TABLE parties (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        name TEXT NOT NULL,
        tradeName TEXT,
        contactPerson TEXT,
        phone TEXT,
        email TEXT,
        gstin TEXT,
        pan TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        stateCode TEXT,
        pincode TEXT,
        creditLimit REAL NOT NULL DEFAULT 0.0,
        creditPeriodDays INTEGER NOT NULL DEFAULT 30,
        drugLicenseNumber TEXT,
        fssaiNumber TEXT,
        attributesJson TEXT,
        outstandingBalance REAL NOT NULL DEFAULT 0.0,
        partyType INTEGER NOT NULL,
        customerType INTEGER NOT NULL DEFAULT 1,
        updatedAt TEXT NOT NULL
      )
    ''');
    await db.execute('CREATE INDEX idx_parties_name ON parties (name)');
    await db.execute('CREATE INDEX idx_parties_phone ON parties (phone)');

    // 3. Offline Invoices Header Table
    await db.execute('''
      CREATE TABLE invoices (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        invoiceNumber TEXT NOT NULL,
        invoiceDate TEXT NOT NULL,
        dueDate TEXT,
        partyId TEXT,
        partyName TEXT NOT NULL,
        partyPhone TEXT,
        partyGstin TEXT,
        placeOfSupply TEXT,
        billingStateCode TEXT,
        shippingStateCode TEXT,
        billingAddress TEXT,
        shippingAddress TEXT,
        poNumber TEXT,
        poDate TEXT,
        vehicleNumber TEXT,
        transporterName TEXT,
        transporterId TEXT,
        ewayBillNumber TEXT,
        ewayBillDate TEXT,
        lrNumber TEXT,
        lrDate TEXT,
        isReverseCharge INTEGER NOT NULL DEFAULT 0,
        invoiceType INTEGER NOT NULL DEFAULT 1,
        taxableAmount REAL NOT NULL,
        cgstAmount REAL NOT NULL,
        sgstAmount REAL NOT NULL,
        igstAmount REAL NOT NULL,
        totalAmount REAL NOT NULL,
        paidAmount REAL NOT NULL,
        balanceAmount REAL NOT NULL,
        paymentMode INTEGER NOT NULL,
        paymentStatus INTEGER NOT NULL,
        isCancelled INTEGER NOT NULL DEFAULT 0,
        isSynced INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    ''');

    // 4. Invoice Line Items Table
    await db.execute('''
      CREATE TABLE invoice_items (
        id TEXT PRIMARY KEY,
        invoiceId TEXT NOT NULL,
        itemId TEXT NOT NULL,
        itemName TEXT NOT NULL,
        itemSku TEXT,
        hsnCode TEXT,
        batchNumber TEXT,
        expiryDate TEXT,
        quantity REAL NOT NULL,
        freeQuantity REAL NOT NULL DEFAULT 0.0,
        unitPrice REAL NOT NULL,
        mrp REAL NOT NULL DEFAULT 0.0,
        ptr REAL NOT NULL DEFAULT 0.0,
        pts REAL NOT NULL DEFAULT 0.0,
        discountPercent REAL NOT NULL,
        schemeDiscountPercent REAL NOT NULL DEFAULT 0.0,
        taxableAmount REAL NOT NULL,
        gstRate REAL NOT NULL,
        cgstAmount REAL NOT NULL,
        sgstAmount REAL NOT NULL,
        igstAmount REAL NOT NULL,
        totalAmount REAL NOT NULL,
        FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE
      )
    ''');

    // 5. Offline Payments Table (Receipt Vouchers / Payment-In)
    await db.execute('''
      CREATE TABLE payments (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        paymentNumber TEXT NOT NULL,
        partyId TEXT NOT NULL,
        partyName TEXT NOT NULL,
        partyPhone TEXT,
        amount REAL NOT NULL,
        paymentDate TEXT NOT NULL,
        paymentMode INTEGER NOT NULL,
        referenceNumber TEXT,
        notes TEXT,
        isSynced INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    ''');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_payments_party ON payments (partyId)');

    // 6. Offline Sync Queue Table (Idempotent background sync)
    await db.execute('''
      CREATE TABLE sync_queue (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        lastError TEXT,
        createdAt TEXT NOT NULL
      )
    ''');

    // 7. Sales Returns & GST Credit Notes Table
    await db.execute('''
      CREATE TABLE sales_returns (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        creditNoteNumber TEXT NOT NULL,
        originalInvoiceId TEXT,
        originalInvoiceNumber TEXT,
        partyId TEXT NOT NULL,
        partyName TEXT NOT NULL,
        partyPhone TEXT,
        returnDate TEXT NOT NULL,
        returnReason TEXT NOT NULL,
        taxableAmount REAL NOT NULL,
        cgstAmount REAL NOT NULL,
        sgstAmount REAL NOT NULL,
        igstAmount REAL NOT NULL,
        totalAmount REAL NOT NULL,
        restockToWarehouse INTEGER NOT NULL DEFAULT 1,
        isSynced INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    ''');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_returns_party ON sales_returns (partyId)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_returns_date ON sales_returns (returnDate)');

    await db.execute('''
      CREATE TABLE sales_return_items (
        id TEXT PRIMARY KEY,
        returnId TEXT NOT NULL,
        itemId TEXT NOT NULL,
        itemName TEXT NOT NULL,
        hsnCode TEXT,
        batchNumber TEXT,
        expiryDate TEXT,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        taxableAmount REAL NOT NULL,
        gstRate REAL NOT NULL,
        cgstAmount REAL NOT NULL,
        sgstAmount REAL NOT NULL,
        igstAmount REAL NOT NULL,
        totalAmount REAL NOT NULL,
        FOREIGN KEY (returnId) REFERENCES sales_returns (id) ON DELETE CASCADE
      )
    ''');

    // 8. Pharma SFA Offline Modules (Sprint 6)
    await _createSfaTables(db);
  }

  static Future<void> _createSfaTables(Database db) async {
    // SFA Doctors Roster
    await db.execute('''
      CREATE TABLE IF NOT EXISTS sfa_doctors (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        name TEXT NOT NULL,
        specialty TEXT,
        qualification TEXT,
        doctorClass TEXT,
        monthlyTargetVisits INTEGER DEFAULT 2,
        visitedThisMonthCount INTEGER DEFAULT 0,
        clinicAddress TEXT,
        latitude REAL,
        longitude REAL,
        geofenceRadiusMeters REAL DEFAULT 200.0,
        patchId TEXT,
        beatId TEXT,
        updatedAt TEXT
      )
    ''');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sfa_doctors_name ON sfa_doctors (name)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sfa_doctors_beat ON sfa_doctors (beatId)');

    // SFA Chemists Directory
    await db.execute('''
      CREATE TABLE IF NOT EXISTS sfa_chemists (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        partyId TEXT,
        chemistName TEXT NOT NULL,
        shopName TEXT,
        phone TEXT,
        preferredStockistPartyId TEXT,
        preferredStockistName TEXT,
        latitude REAL,
        longitude REAL,
        patchId TEXT,
        beatId TEXT,
        updatedAt TEXT
      )
    ''');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sfa_chemists_name ON sfa_chemists (chemistName)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sfa_chemists_beat ON sfa_chemists (beatId)');

    // SFA Sample Bag Balance Ledger
    await db.execute('''
      CREATE TABLE IF NOT EXISTS sfa_sample_bag (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        sampleItemId TEXT NOT NULL,
        sampleItemName TEXT NOT NULL,
        batchNumber TEXT NOT NULL,
        expiryDate TEXT,
        currentBagBalance INTEGER NOT NULL DEFAULT 0,
        updatedAt TEXT
      )
    ''');

    // SFA Commercial Schemes
    await db.execute('''
      CREATE TABLE IF NOT EXISTS sfa_schemes (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        schemeCode TEXT,
        schemeName TEXT NOT NULL,
        schemeType INTEGER NOT NULL,
        schemeTypeName TEXT,
        itemId TEXT,
        itemName TEXT,
        minimumOrderQuantity INTEGER NOT NULL DEFAULT 1,
        validFromUtc TEXT,
        validToUtc TEXT,
        isActive INTEGER NOT NULL DEFAULT 1
      )
    ''');

    // SFA Commercial Scheme Slabs
    await db.execute('''
      CREATE TABLE IF NOT EXISTS sfa_scheme_slabs (
        id TEXT PRIMARY KEY,
        schemeMasterId TEXT NOT NULL,
        minQuantity INTEGER NOT NULL,
        maxQuantity INTEGER,
        freeQuantity INTEGER NOT NULL DEFAULT 0,
        discountPercent REAL NOT NULL DEFAULT 0.0,
        flatDiscountAmount REAL NOT NULL DEFAULT 0.0,
        freeItemId TEXT,
        freeItemName TEXT
      )
    ''');
  }

  Future<void> close() async {
    final db = _database;
    if (db != null) {
      await db.close();
    }
  }
}
