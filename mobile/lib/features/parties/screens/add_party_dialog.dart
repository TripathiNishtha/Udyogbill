import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/party_dao.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/sync/sync_service.dart';

class AddPartyDialog extends StatefulWidget {
  final int defaultPartyType; // 1 = Customer, 2 = Supplier
  final PartyModel? existingParty; // If editing
  final Function(PartyModel)? onSaved;

  const AddPartyDialog({
    super.key,
    this.defaultPartyType = 1,
    this.existingParty,
    this.onSaved,
  });

  @override
  State<AddPartyDialog> createState() => _AddPartyDialogState();
}

class _AddPartyDialogState extends State<AddPartyDialog> {
  final _formKey = GlobalKey<FormState>();

  // Controllers
  late int _partyType;
  int _customerType = 1; // 1: B2B, 2: B2C/Retail, 4: Wholesale
  final _nameController = TextEditingController();
  final _tradeNameController = TextEditingController();
  final _contactPersonController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _gstinController = TextEditingController();
  final _panController = TextEditingController();

  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _pincodeController = TextEditingController();

  final _balanceController = TextEditingController(text: '0');
  int _balanceType = 1; // 1: To Receive (Lene Hain), 2: To Pay (Dene Hain)
  final _creditLimitController = TextEditingController(text: '0');
  int _creditDays = 30;

  final _drugLicenseController = TextEditingController();
  final _fssaiController = TextEditingController();

  String _selectedState = 'Maharashtra';
  String _selectedStateCode = '27';
  bool _isSaving = false;

  final Map<String, String> _indianStates = {
    '01': 'Jammu & Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli and Daman & Diu',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman & Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
  };

  @override
  void initState() {
    super.initState();
    _partyType = widget.defaultPartyType;
    if (widget.existingParty != null) {
      final p = widget.existingParty!;
      _nameController.text = p.name;
      _tradeNameController.text = p.tradeName ?? '';
      _contactPersonController.text = p.contactPerson ?? '';
      _phoneController.text = p.phone ?? '';
      _emailController.text = p.email ?? '';
      _gstinController.text = p.gstin ?? '';
      _panController.text = p.pan ?? '';
      _addressController.text = p.address ?? '';
      _cityController.text = p.city ?? '';
      _pincodeController.text = p.pincode ?? '';
      _balanceController.text = p.outstandingBalance.abs().toString();
      _balanceType = p.outstandingBalance >= 0 ? 1 : 2;
      _creditLimitController.text = p.creditLimit.toString();
      _creditDays = p.creditPeriodDays;
      _drugLicenseController.text = p.drugLicenseNumber ?? '';
      _fssaiController.text = p.fssaiNumber ?? '';
      _partyType = p.partyType;
      _customerType = p.customerType;
      if (p.stateCode != null && _indianStates.containsKey(p.stateCode)) {
        _selectedStateCode = p.stateCode!;
        _selectedState = _indianStates[p.stateCode]!;
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _tradeNameController.dispose();
    _contactPersonController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _gstinController.dispose();
    _panController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _pincodeController.dispose();
    _balanceController.dispose();
    _creditLimitController.dispose();
    _drugLicenseController.dispose();
    _fssaiController.dispose();
    super.dispose();
  }

  void _onGstinChanged(String gstin) {
    final clean = gstin.trim().toUpperCase();
    if (clean.length >= 2) {
      final code = clean.substring(0, 2);
      if (_indianStates.containsKey(code)) {
        setState(() {
          _selectedStateCode = code;
          _selectedState = _indianStates[code]!;
        });
      }
    }
    // Extract PAN if 15 chars (chars 3 to 12)
    if (clean.length >= 12 && _panController.text.isEmpty) {
      _panController.text = clean.substring(2, 12);
    }
  }

  Future<void> _saveParty() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      final rawBal = double.tryParse(_balanceController.text.trim()) ?? 0.0;
      final balance = _balanceType == 1 ? rawBal.abs() : -rawBal.abs();
      final creditLimit = double.tryParse(_creditLimitController.text.trim()) ?? 0.0;

      final party = PartyModel(
        id: widget.existingParty?.id ?? const Uuid().v4(),
        tenantId: 'demo-tenant',
        name: _nameController.text.trim(),
        tradeName: _tradeNameController.text.trim().isEmpty ? null : _tradeNameController.text.trim(),
        contactPerson: _contactPersonController.text.trim().isEmpty ? null : _contactPersonController.text.trim(),
        phone: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        gstin: _gstinController.text.trim().isEmpty ? null : _gstinController.text.trim().toUpperCase(),
        pan: _panController.text.trim().isEmpty ? null : _panController.text.trim().toUpperCase(),
        address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        city: _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        state: _selectedState,
        stateCode: _selectedStateCode,
        pincode: _pincodeController.text.trim().isEmpty ? null : _pincodeController.text.trim(),
        creditLimit: creditLimit,
        creditPeriodDays: _creditDays,
        drugLicenseNumber: _drugLicenseController.text.trim().isEmpty ? null : _drugLicenseController.text.trim(),
        fssaiNumber: _fssaiController.text.trim().isEmpty ? null : _fssaiController.text.trim(),
        outstandingBalance: balance,
        partyType: _partyType,
        customerType: _customerType,
        updatedAt: DateTime.now().toIso8601String(),
      );

      final dao = PartyDao();
      await dao.insertParty(party);

      // Attempt online sync in background
      try {
        final client = ApiClient();
        await client.post('/tenant/parties', data: party.toMap());
      } catch (_) {
        // Queued offline
        final sync = SyncService();
        await sync.queueOfflineInvoice(
          invoiceId: party.id,
          invoicePayload: party.toMap(),
        );
      }

      if (!mounted) return;
      if (widget.onSaved != null) {
        widget.onSaved!(party);
      }
      Navigator.of(context).pop(party);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving party: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(top: 18, bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.primary),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.existingParty != null
              ? 'Edit Party Details'
              : _partyType == 1
                  ? 'Add Customer (Grahak)'
                  : 'Add Supplier (Vyapari)',
        ),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _saveParty,
            child: _isSaving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('SAVE', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppTheme.primary)),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Party Type Toggle
                SegmentedButton<int>(
                  segments: const [
                    ButtonSegment(value: 1, label: Text('Customer (Grahak)'), icon: Icon(Icons.person)),
                    ButtonSegment(value: 2, label: Text('Supplier (Vyapari)'), icon: Icon(Icons.local_shipping)),
                  ],
                  selected: {_partyType},
                  onSelectionChanged: (val) {
                    setState(() => _partyType = val.first);
                  },
                ),
                const SizedBox(height: 12),

                // Customer Subtype (B2B, B2C, Wholesale)
                if (_partyType == 1) ...[
                  SegmentedButton<int>(
                    segments: const [
                      ButtonSegment(value: 1, label: Text('B2B Business')),
                      ButtonSegment(value: 2, label: Text('B2C Retail')),
                      ButtonSegment(value: 4, label: Text('Wholesale')),
                    ],
                    selected: {_customerType},
                    onSelectionChanged: (val) {
                      setState(() => _customerType = val.first);
                    },
                  ),
                ],

                // 1. Basic Information
                _buildSectionHeader('Basic & Business Details', Icons.business_outlined),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Party / Business Legal Name *',
                    hintText: 'e.g. Ramesh Trading Co.',
                    prefixIcon: Icon(Icons.apartment),
                  ),
                  validator: (val) => (val == null || val.trim().isEmpty) ? 'Please enter business name' : null,
                ),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _tradeNameController,
                        decoration: const InputDecoration(
                          labelText: 'Trade Name (Dukan Ka Naam)',
                          hintText: 'e.g. Ramesh Super Store',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _contactPersonController,
                        decoration: const InputDecoration(
                          labelText: 'Contact Person',
                          hintText: 'Proprietor / Manager',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // 2. Contact Details
                _buildSectionHeader('Contact Information', Icons.contact_phone_outlined),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Mobile Number *',
                          hintText: '10 digits mobile',
                          prefixIcon: Icon(Icons.phone_android),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Email Address',
                          hintText: 'billing@example.com',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // 3. GST & Tax Details
                _buildSectionHeader('GST & Tax Compliance', Icons.verified_outlined),
                TextFormField(
                  controller: _gstinController,
                  textCapitalization: TextCapitalization.characters,
                  onChanged: _onGstinChanged,
                  decoration: const InputDecoration(
                    labelText: 'GSTIN (15 Digits)',
                    hintText: 'e.g. 27AAAAA0000A1Z5',
                    prefixIcon: Icon(Icons.receipt_long),
                  ),
                ),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _panController,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          labelText: 'PAN Number (10 Chars)',
                          hintText: 'e.g. AAAAA0000A',
                          prefixIcon: Icon(Icons.badge_outlined),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        key: ValueKey(_selectedStateCode),
                        initialValue: _selectedStateCode,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Place of Supply (State)'),
                        items: _indianStates.entries.map((e) {
                          return DropdownMenuItem(
                            value: e.key,
                            child: Text('${e.key} - ${e.value}', style: const TextStyle(fontSize: 12)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _selectedStateCode = val;
                              _selectedState = _indianStates[val]!;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // 4. Complete Address
                _buildSectionHeader('Billing & Shipping Address', Icons.location_on_outlined),
                TextFormField(
                  controller: _addressController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Address (Building, Street, Area)',
                    hintText: 'Shop No. 12, Main Market Road',
                    prefixIcon: Icon(Icons.place_outlined),
                  ),
                ),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _cityController,
                        decoration: const InputDecoration(labelText: 'City / District', hintText: 'e.g. Mumbai / Delhi'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _pincodeController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Pincode', hintText: '6 digits pincode'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // 5. Financials & Credit Terms
                _buildSectionHeader('Opening Balance & Credit Limits', Icons.account_balance_wallet_outlined),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextFormField(
                        controller: _balanceController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Opening Balance (₹)',
                          prefixText: '₹ ',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: DropdownButtonFormField<int>(
                        key: ValueKey(_balanceType),
                        initialValue: _balanceType,
                        decoration: const InputDecoration(labelText: 'Balance Type'),
                        items: const [
                          DropdownMenuItem(value: 1, child: Text('To Collect (Lene)')),
                          DropdownMenuItem(value: 2, child: Text('To Pay (Dene)')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _balanceType = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _creditLimitController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Credit Limit (₹)',
                          hintText: '0 = Unlimited',
                          prefixText: '₹ ',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<int>(
                        key: ValueKey(_creditDays),
                        initialValue: _creditDays,
                        decoration: const InputDecoration(labelText: 'Credit Period'),
                        items: const [
                          DropdownMenuItem(value: 0, child: Text('Immediate (0 Days)')),
                          DropdownMenuItem(value: 15, child: Text('15 Days')),
                          DropdownMenuItem(value: 30, child: Text('30 Days')),
                          DropdownMenuItem(value: 45, child: Text('45 Days')),
                          DropdownMenuItem(value: 60, child: Text('60 Days')),
                          DropdownMenuItem(value: 90, child: Text('90 Days')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _creditDays = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // 6. Industry & Drug Licenses (Pharma / FMCG)
                _buildSectionHeader('Industry Licenses (Pharma & Food)', Icons.medical_services_outlined),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _drugLicenseController,
                        decoration: const InputDecoration(
                          labelText: 'Drug License (DL No.)',
                          hintText: 'Form 20B / 21B',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _fssaiController,
                        decoration: const InputDecoration(
                          labelText: 'FSSAI License No.',
                          hintText: '14 digits number',
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 28),

                ElevatedButton.icon(
                  onPressed: _isSaving ? null : _saveParty,
                  icon: const Icon(Icons.check_circle_outline),
                  label: _isSaving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          widget.existingParty != null ? 'Update Party Details' : 'Save Complete Party Profile',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
