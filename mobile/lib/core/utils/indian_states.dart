/// Master list of Indian States & Union Territories with GST 2-digit state codes
class IndianState {
  final String code;
  final String name;

  const IndianState({required this.code, required this.name});

  String get displayName => '$code - $name';
}

class IndianStatesMaster {
  static const List<IndianState> states = [
    IndianState(code: '01', name: 'Jammu and Kashmir'),
    IndianState(code: '02', name: 'Himachal Pradesh'),
    IndianState(code: '03', name: 'Punjab'),
    IndianState(code: '04', name: 'Chandigarh'),
    IndianState(code: '05', name: 'Uttarakhand'),
    IndianState(code: '06', name: 'Haryana'),
    IndianState(code: '07', name: 'Delhi'),
    IndianState(code: '08', name: 'Rajasthan'),
    IndianState(code: '09', name: 'Uttar Pradesh'),
    IndianState(code: '10', name: 'Bihar'),
    IndianState(code: '11', name: 'Sikkim'),
    IndianState(code: '12', name: 'Arunachal Pradesh'),
    IndianState(code: '13', name: 'Nagaland'),
    IndianState(code: '14', name: 'Manipur'),
    IndianState(code: '15', name: 'Mizoram'),
    IndianState(code: '16', name: 'Tripura'),
    IndianState(code: '17', name: 'Meghalaya'),
    IndianState(code: '18', name: 'Assam'),
    IndianState(code: '19', name: 'West Bengal'),
    IndianState(code: '20', name: 'Jharkhand'),
    IndianState(code: '21', name: 'Odisha'),
    IndianState(code: '22', name: 'Chhattisgarh'),
    IndianState(code: '23', name: 'Madhya Pradesh'),
    IndianState(code: '24', name: 'Gujarat'),
    IndianState(code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu'),
    IndianState(code: '27', name: 'Maharashtra'),
    IndianState(code: '28', name: 'Andhra Pradesh (Old)'),
    IndianState(code: '29', name: 'Karnataka'),
    IndianState(code: '30', name: 'Goa'),
    IndianState(code: '31', name: 'Lakshadweep'),
    IndianState(code: '32', name: 'Kerala'),
    IndianState(code: '33', name: 'Tamil Nadu'),
    IndianState(code: '34', name: 'Puducherry'),
    IndianState(code: '35', name: 'Andaman and Nicobar Islands'),
    IndianState(code: '36', name: 'Telangana'),
    IndianState(code: '37', name: 'Andhra Pradesh (New)'),
    IndianState(code: '38', name: 'Ladakh'),
    IndianState(code: '97', name: 'Other Territory'),
  ];

  /// Auto-detects state code and state from buyer's GSTIN
  static IndianState? getStateByGstin(String? gstin) {
    if (gstin == null || gstin.trim().length < 2) return null;
    final prefix = gstin.trim().substring(0, 2);
    try {
      return states.firstWhere((s) => s.code == prefix);
    } catch (_) {
      return null;
    }
  }

  /// Returns IndianState by 2-digit code
  static IndianState? getStateByCode(String? code) {
    if (code == null || code.trim().isEmpty) return null;
    final cleanCode = code.trim().padLeft(2, '0');
    try {
      return states.firstWhere((s) => s.code == cleanCode);
    } catch (_) {
      return null;
    }
  }
}
