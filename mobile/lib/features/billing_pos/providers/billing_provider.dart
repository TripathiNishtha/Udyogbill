import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import '../../../app/constants/app_constants.dart';
import '../../../core/database/daos/item_dao.dart';
import '../../../core/database/daos/invoice_dao.dart';
import '../../../core/database/daos/party_dao.dart';
import '../../../core/utils/gst_calculator.dart';
import '../../../core/sync/sync_service.dart';

class CartItem {
  final ItemModel item;
  double quantity;
  double unitPrice;
  double discountPercent;

  CartItem({
    required this.item,
    this.quantity = 1.0,
    required this.unitPrice,
    this.discountPercent = 0.0,
  });

  GstCalculationResult get calculation => GstCalculator.calculateLineItem(
        quantity: quantity,
        unitPrice: unitPrice,
        discountPercent: discountPercent,
        gstRatePercent: item.gstRate,
        isIntraState: true, // Default intra-state for local retail
      );
}

class BillingState {
  final List<CartItem> cart;
  final String customerName;
  final String customerPhone;
  final int paymentMode; // 1: Cash, 2: UPI, 3: Card, 4: Credit
  final bool isSubmitting;

  BillingState({
    this.cart = const [],
    this.customerName = "Walk-in Customer",
    this.customerPhone = "",
    this.paymentMode = 1,
    this.isSubmitting = false,
  });

  double get subtotal => cart.fold(0.0, (sum, it) => sum + it.calculation.taxableAmount);
  double get totalGst => cart.fold(0.0, (sum, it) => sum + it.calculation.totalGst);
  double get grandTotal => cart.fold(0.0, (sum, it) => sum + it.calculation.totalAmount);
  int get itemCount => cart.length;

  BillingState copyWith({
    List<CartItem>? cart,
    String? customerName,
    String? customerPhone,
    int? paymentMode,
    bool? isSubmitting,
  }) {
    return BillingState(
      cart: cart ?? this.cart,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      paymentMode: paymentMode ?? this.paymentMode,
      isSubmitting: isSubmitting ?? this.isSubmitting,
    );
  }
}

class BillingNotifier extends StateNotifier<BillingState> {
  final SyncService _syncService = SyncService();

  BillingNotifier() : super(BillingState());

  /// Instant add to cart (either tap or barcode scan)
  void addItem(ItemModel item) {
    final existingIndex = state.cart.indexWhere((c) => c.item.id == item.id);

    if (existingIndex >= 0) {
      final updatedCart = List<CartItem>.from(state.cart);
      updatedCart[existingIndex].quantity += 1;
      state = state.copyWith(cart: updatedCart);
    } else {
      state = state.copyWith(
        cart: [
          ...state.cart,
          CartItem(
            item: item,
            unitPrice: item.salePrice,
          ),
        ],
      );
    }
  }

  void updateQuantity(int index, double newQty) {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    final updatedCart = List<CartItem>.from(state.cart);
    updatedCart[index].quantity = newQty;
    state = state.copyWith(cart: updatedCart);
  }

  void removeItem(int index) {
    final updatedCart = List<CartItem>.from(state.cart)..removeAt(index);
    state = state.copyWith(cart: updatedCart);
  }

  void setPaymentMode(int mode) {
    state = state.copyWith(paymentMode: mode);
  }

  void setCustomer(String name, String phone) {
    state = state.copyWith(customerName: name, customerPhone: phone);
  }

  void clearCart() {
    state = BillingState();
  }

  /// Creates invoice offline immediately in SQLite, and queues for cloud synchronization
  Future<InvoiceModel> completeInvoice() async {
    if (state.cart.isEmpty) throw Exception("Cart is empty");

    state = state.copyWith(isSubmitting: true);

    try {
      const storage = FlutterSecureStorage();
      final activeTenantId = await storage.read(key: AppConstants.keyTenantId) ?? '';

      final invoiceId = const Uuid().v4();
      final invoiceNumber = "INV-POS-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}";
      final nowStr = DateTime.now().toIso8601String();

      String? partyId;
      if (state.customerPhone.isNotEmpty) {
        partyId = const Uuid().v4();
        // Record in parties table for customer directory & reports
        final partyDao = PartyDao();
        await partyDao.insertParty(PartyModel(
          id: partyId,
          tenantId: activeTenantId,
          name: state.customerName.isEmpty ? 'Walk-in Customer' : state.customerName,
          phone: state.customerPhone,
          partyType: 1,
          customerType: 2,
          updatedAt: nowStr,
        ));
      }

      final invoiceModel = InvoiceModel(
        id: invoiceId,
        tenantId: activeTenantId,
        invoiceNumber: invoiceNumber,
        invoiceDate: nowStr.substring(0, 10),
        partyId: partyId,
        partyName: state.customerName.isEmpty ? 'Walk-in Customer' : state.customerName,
        partyPhone: state.customerPhone.isEmpty ? null : state.customerPhone,
        taxableAmount: state.subtotal,
        cgstAmount: state.totalGst / 2,
        sgstAmount: state.totalGst / 2,
        igstAmount: 0.0,
        totalAmount: state.grandTotal,
        paidAmount: state.grandTotal,
        balanceAmount: 0.0,
        paymentMode: state.paymentMode,
        paymentStatus: 3, // Paid
        isCancelled: false,
        isSynced: false,
        createdAt: nowStr,
        items: state.cart.map((c) {
          return InvoiceItemModel(
            id: const Uuid().v4(),
            invoiceId: invoiceId,
            itemId: c.item.id,
            itemName: c.item.name,
            itemSku: c.item.sku,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            discountPercent: c.discountPercent,
            taxableAmount: c.calculation.taxableAmount,
            gstRate: c.item.gstRate,
            cgstAmount: c.calculation.cgstAmount,
            sgstAmount: c.calculation.sgstAmount,
            totalAmount: c.calculation.totalAmount,
          );
        }).toList(),
      );

      // Save locally to SQLite immediately
      final invoiceDao = InvoiceDao();
      await invoiceDao.insertInvoice(invoiceModel);

      // Queue offline & sync
      await _syncService.queueOfflineInvoice(
        invoiceId: invoiceId,
        invoicePayload: invoiceModel.toMap(),
      );

      // Attempt immediate background flush
      _syncService.flushSyncQueue().ignore();

      clearCart();
      return invoiceModel;
    } finally {
      state = state.copyWith(isSubmitting: false);
    }
  }
}

final billingProvider = StateNotifierProvider<BillingNotifier, BillingState>((ref) {
  return BillingNotifier();
});
