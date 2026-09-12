import 'dart:convert';
import 'package:intl/intl.dart';
import '../database/daos/invoice_dao.dart';

class EwayBillJsonHelper {
  /// Formats Date to dd/MM/yyyy required by NIC portal
  static String formatNicDate(String dateStr) {
    try {
      final parsed = DateTime.tryParse(dateStr);
      if (parsed != null) {
        return DateFormat('dd/MM/yyyy').format(parsed);
      }
    } catch (_) {}
    return dateStr;
  }

  /// Generates NIC Standard E-Way Bill Bulk Upload JSON (Schema v1.0.03)
  static String generateEWayBillJson({
    required InvoiceModel invoice,
    required String storeName,
    required String storeGstin,
    required String storeAddress,
    required String storeCity,
    required String storePincode,
    required String storeStateCode,
    int transportDistanceKm = 50,
    String? vehicleNumber,
    String? transporterId,
    String? transporterName,
    String? transportDocNo,
  }) {
    final isInterState = invoice.igstAmount > 0;
    final buyerGstin = (invoice.partyGstin != null && invoice.partyGstin!.trim().isNotEmpty)
        ? invoice.partyGstin!.trim().toUpperCase()
        : 'URP';

    final buyerStateCode = invoice.billingStateCode ?? (buyerGstin != 'URP' ? buyerGstin.substring(0, 2) : storeStateCode);
    final vehNo = vehicleNumber ?? invoice.vehicleNumber ?? '';
    final transId = transporterId ?? invoice.transporterId ?? '';
    final transName = transporterName ?? invoice.transporterName ?? '';
    final transDoc = transportDocNo ?? invoice.lrNumber ?? '';

    final itemList = <Map<String, dynamic>>[];
    for (int i = 0; i < invoice.items.length; i++) {
      final item = invoice.items[i];
      final hsn = (item.hsnCode != null && item.hsnCode!.trim().isNotEmpty)
          ? int.tryParse(item.hsnCode!.trim()) ?? 3004
          : 3004;

      itemList.add({
        'itemNo': i + 1,
        'productName': item.itemName,
        'productDesc': item.itemName,
        'hsnCode': hsn,
        'quantity': item.quantity + item.freeQuantity,
        'qtyUnit': 'NOS',
        'cgstRate': isInterState ? 0.0 : (item.gstRate / 2),
        'sgstRate': isInterState ? 0.0 : (item.gstRate / 2),
        'igstRate': isInterState ? item.gstRate : 0.0,
        'cessRate': 0.0,
        'taxableAmount': double.parse(item.taxableAmount.toStringAsFixed(2)),
      });
    }

    final billData = {
      'version': '1.0.03',
      'billLists': [
        {
          'userGstin': storeGstin.isNotEmpty ? storeGstin : '09AAAAA0000A1Z5',
          'supplyType': 'O',
          'subSupplyType': '1',
          'subSupplyDesc': 'Supply of Goods',
          'docType': 'INV',
          'docNo': invoice.invoiceNumber,
          'docDate': formatNicDate(invoice.invoiceDate),
          'transType': 1,
          'fromGstin': storeGstin.isNotEmpty ? storeGstin : '09AAAAA0000A1Z5',
          'fromTrdName': storeName,
          'fromAddr1': storeAddress.isNotEmpty ? storeAddress : 'Main Market',
          'fromAddr2': '',
          'fromPlace': storeCity.isNotEmpty ? storeCity : 'City',
          'fromPincode': int.tryParse(storePincode) ?? 201301,
          'actFromStateCode': int.tryParse(storeStateCode) ?? 9,
          'fromStateCode': int.tryParse(storeStateCode) ?? 9,
          'toGstin': buyerGstin,
          'toTrdName': invoice.partyName,
          'toAddr1': invoice.billingAddress ?? 'Customer Address',
          'toAddr2': '',
          'toPlace': invoice.placeOfSupply ?? 'Destination',
          'toPincode': 201301,
          'actToStateCode': int.tryParse(buyerStateCode) ?? int.tryParse(storeStateCode) ?? 9,
          'toStateCode': int.tryParse(buyerStateCode) ?? int.tryParse(storeStateCode) ?? 9,
          'transactionType': 1,
          'otherValue': 0.0,
          'totalValue': double.parse(invoice.taxableAmount.toStringAsFixed(2)),
          'cgstValue': double.parse(invoice.cgstAmount.toStringAsFixed(2)),
          'sgstValue': double.parse(invoice.sgstAmount.toStringAsFixed(2)),
          'igstValue': double.parse(invoice.igstAmount.toStringAsFixed(2)),
          'cessValue': 0.0,
          'totInvValue': double.parse(invoice.totalAmount.toStringAsFixed(2)),
          'transDistance': transportDistanceKm,
          'transporterName': transName,
          'transporterId': transId,
          'transDocNo': transDoc,
          'transDocDate': transDoc.isNotEmpty ? formatNicDate(invoice.invoiceDate) : '',
          'vehNo': vehNo.replaceAll(' ', '').toUpperCase(),
          'vehType': 'R',
          'itemList': itemList,
        }
      ]
    };

    return const JsonEncoder.withIndent('  ').convert(billData);
  }

  /// Generates Standard GST E-Invoice JSON (NIC / IRP Schema v1.03)
  static String generateEInvoiceJson({
    required InvoiceModel invoice,
    required String storeName,
    required String storeGstin,
    required String storeAddress,
    required String storeCity,
    required String storePincode,
    required String storeStateCode,
  }) {
    final isInterState = invoice.igstAmount > 0;
    final buyerGstin = (invoice.partyGstin != null && invoice.partyGstin!.trim().isNotEmpty)
        ? invoice.partyGstin!.trim().toUpperCase()
        : 'URP';

    final buyerStateCode = invoice.billingStateCode ?? (buyerGstin != 'URP' ? buyerGstin.substring(0, 2) : storeStateCode);

    final itemList = <Map<String, dynamic>>[];
    for (int i = 0; i < invoice.items.length; i++) {
      final item = invoice.items[i];
      itemList.add({
        'SlNo': '${i + 1}',
        'PrdDesc': item.itemName,
        'IsServc': 'N',
        'HsnCd': item.hsnCode ?? '3004',
        'Qty': item.quantity + item.freeQuantity,
        'FreeQty': item.freeQuantity,
        'Unit': 'NOS',
        'UnitPrice': double.parse(item.unitPrice.toStringAsFixed(2)),
        'TotAmt': double.parse((item.quantity * item.unitPrice).toStringAsFixed(2)),
        'Discount': double.parse((item.taxableAmount * (item.discountPercent / 100)).toStringAsFixed(2)),
        'AssAmt': double.parse(item.taxableAmount.toStringAsFixed(2)),
        'GstRt': item.gstRate,
        'IgstAmt': isInterState ? double.parse(item.igstAmount.toStringAsFixed(2)) : 0.0,
        'CgstAmt': isInterState ? 0.0 : double.parse(item.cgstAmount.toStringAsFixed(2)),
        'SgstAmt': isInterState ? 0.0 : double.parse(item.sgstAmount.toStringAsFixed(2)),
        'CesRt': 0.0,
        'CesAmt': 0.0,
        'TotItemVal': double.parse(item.totalAmount.toStringAsFixed(2)),
      });
    }

    final eInvData = {
      'Version': '1.1',
      'TranDtls': {
        'TaxSch': 'GST',
        'SupTyp': buyerGstin != 'URP' ? 'B2B' : 'B2C',
        'RegRev': invoice.isReverseCharge ? 'Y' : 'N',
        'EcmGstin': null,
        'IgstOnIntra': 'N',
      },
      'DocDtls': {
        'Typ': 'INV',
        'No': invoice.invoiceNumber,
        'Dt': formatNicDate(invoice.invoiceDate),
      },
      'SellerDtls': {
        'Gstin': storeGstin.isNotEmpty ? storeGstin : '09AAAAA0000A1Z5',
        'LglNm': storeName,
        'TrdNm': storeName,
        'Addr1': storeAddress.isNotEmpty ? storeAddress : 'Main Market',
        'Loc': storeCity.isNotEmpty ? storeCity : 'City',
        'Pin': int.tryParse(storePincode) ?? 201301,
        'Stcd': storeStateCode.padLeft(2, '0'),
      },
      'BuyerDtls': {
        'Gstin': buyerGstin,
        'LglNm': invoice.partyName,
        'TrdNm': invoice.partyName,
        'Pos': invoice.placeOfSupply ?? storeStateCode.padLeft(2, '0'),
        'Addr1': invoice.billingAddress ?? 'Customer Address',
        'Loc': invoice.placeOfSupply ?? 'City',
        'Pin': 201301,
        'Stcd': buyerStateCode.padLeft(2, '0'),
      },
      'ItemList': itemList,
      'ValDtls': {
        'AssVal': double.parse(invoice.taxableAmount.toStringAsFixed(2)),
        'CgstVal': double.parse(invoice.cgstAmount.toStringAsFixed(2)),
        'SgstVal': double.parse(invoice.sgstAmount.toStringAsFixed(2)),
        'IgstVal': double.parse(invoice.igstAmount.toStringAsFixed(2)),
        'CesVal': 0.0,
        'StCesVal': 0.0,
        'Discount': 0.0,
        'OthChrg': 0.0,
        'RndOffAmt': 0.0,
        'TotInvVal': double.parse(invoice.totalAmount.toStringAsFixed(2)),
      },
    };

    return const JsonEncoder.withIndent('  ').convert(eInvData);
  }
}
