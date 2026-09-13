import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import '../../../app/theme/app_theme.dart';
import '../services/hrm_mobile_service.dart';

class HrmLeaveApplyScreen extends StatefulWidget {
  const HrmLeaveApplyScreen({super.key});

  @override
  State<HrmLeaveApplyScreen> createState() => _HrmLeaveApplyScreenState();
}

class _HrmLeaveApplyScreenState extends State<HrmLeaveApplyScreen> {
  final HrmMobileService _hrmService = HrmMobileService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool _isLoading = true;
  bool _isSubmitting = false;

  List<Map<String, dynamic>> _balances = [];
  List<Map<String, dynamic>> _leaveTypes = [];
  String? _selectedLeaveTypeId;
  DateTime _fromDate = DateTime.now().add(const Duration(days: 1));
  DateTime _toDate = DateTime.now().add(const Duration(days: 1));
  bool _isHalfDay = false;
  final TextEditingController _reasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final profileId = await _storage.read(key: 'hrm_employee_profile_id') ?? '00000000-0000-0000-0000-000000000000';
    final types = await _hrmService.getLeaveTypes();
    final bals = await _hrmService.getLeaveBalances(profileId);

    if (mounted) {
      setState(() {
        _leaveTypes = types;
        _balances = bals;
        if (types.isNotEmpty) {
          _selectedLeaveTypeId = types.first['id'];
        }
        _isLoading = false;
      });
    }
  }

  Future<void> _selectDate(bool isFrom) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? _fromDate : _toDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 180)),
    );
    if (picked != null && mounted) {
      setState(() {
        if (isFrom) {
          _fromDate = picked;
          if (_toDate.isBefore(_fromDate)) _toDate = _fromDate;
        } else {
          _toDate = picked;
        }
      });
    }
  }

  Future<void> _submitLeave() async {
    if (_selectedLeaveTypeId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select leave type'), backgroundColor: AppTheme.danger),
      );
      return;
    }
    if (_reasonController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter reason for leave'), backgroundColor: AppTheme.danger),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final profileId = await _storage.read(key: 'hrm_employee_profile_id') ?? '00000000-0000-0000-0000-000000000000';
      final ok = await _hrmService.applyLeave(
        employeeProfileId: profileId,
        leaveTypeId: _selectedLeaveTypeId!,
        fromDate: _fromDate,
        toDate: _toDate,
        isHalfDay: _isHalfDay,
        reason: _reasonController.text.trim(),
      );

      if (mounted) {
        if (ok) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Leave application submitted for manager approval!'),
              backgroundColor: AppTheme.success,
            ),
          );
          Navigator.pop(context);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to submit leave. Check quota balance.'),
              backgroundColor: AppTheme.danger,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Apply Leave (LMS)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0.5,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Quota Balance Chips Strip
                  const Text(
                    'Available Quota Balances',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 90,
                    child: _balances.isEmpty
                        ? Container(
                            alignment: Alignment.centerLeft,
                            child: const Text('No leave quotas initialized', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          )
                        : ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: _balances.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 12),
                            itemBuilder: (ctx, idx) {
                              final b = _balances[idx];
                              return Container(
                                width: 140,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      b['leaveTypeName'] ?? 'Leave',
                                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Row(
                                      children: [
                                        Text(
                                          '${b['availableDays'] ?? 0}',
                                          style: const TextStyle(
                                            fontSize: 22,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.primary,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        const Text('days left', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                  const SizedBox(height: 24),

                  // Leave Application Form Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Leave Type Dropdown
                        const Text('Leave Type', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _selectedLeaveTypeId,
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          items: _leaveTypes.map((t) {
                            return DropdownMenuItem<String>(
                              value: t['id'],
                              child: Text('${t['name']} (${t['code']})'),
                            );
                          }).toList(),
                          onChanged: (val) => setState(() => _selectedLeaveTypeId = val),
                        ),
                        const SizedBox(height: 16),

                        // Date Pickers Row
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('From Date', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                                  const SizedBox(height: 8),
                                  InkWell(
                                    onTap: () => _selectDate(true),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: const Color(0xFFCBD5E1)),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.calendar_month, size: 16, color: Color(0xFF64748B)),
                                          const SizedBox(width: 8),
                                          Text(DateFormat('dd MMM yyyy').format(_fromDate), style: const TextStyle(fontSize: 13)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('To Date', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                                  const SizedBox(height: 8),
                                  InkWell(
                                    onTap: () => _selectDate(false),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: const Color(0xFFCBD5E1)),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.calendar_month, size: 16, color: Color(0xFF64748B)),
                                          const SizedBox(width: 8),
                                          Text(DateFormat('dd MMM yyyy').format(_toDate), style: const TextStyle(fontSize: 13)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Half Day Switch
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Is Half Day?', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          value: _isHalfDay,
                          onChanged: (v) => setState(() => _isHalfDay = v),
                        ),
                        const SizedBox(height: 12),

                        // Reason Input
                        const Text('Reason for Leave', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _reasonController,
                          maxLines: 3,
                          decoration: InputDecoration(
                            hintText: 'Enter brief reason for leave application...',
                            hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Submit Button
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _isSubmitting ? null : _submitLeave,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            child: _isSubmitting
                                ? const CircularProgressIndicator(color: Colors.white)
                                : const Text('SUBMIT LEAVE APPLICATION', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
