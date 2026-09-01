"use client";

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
  industryApplicability: string[] | "all"; // e.g. ["PHARMA"], ["FMCG", "WHOLESALE"], "all"
  defaultVisible: boolean;
  gridSpan: "full" | "half" | "two-thirds" | "one-third";
  order: number;
}

export const DASHBOARD_WIDGET_REGISTRY: DashboardWidgetConfig[] = [
  {
    id: "kpi-summary",
    title: "Executive Financial & Ledger KPIs",
    titleHi: "मुख्य वित्तीय एवं खाता मेट्रिक्स",
    description: "Real-time revenue, collections, receivables, payables, stock value, and gross profit",
    descriptionHi: "वास्तविक बिक्री, वसूली, उधारी, देयताएं, स्टॉक मूल्यांकन और सकल लाभ",
    industryApplicability: "all",
    defaultVisible: true,
    gridSpan: "full",
    order: 1,
  },
  {
    id: "operational-alerts",
    title: "Operational Alerts & Business Safeguards",
    titleHi: "व्यापारिक चेतावनियां एवं सुरक्षा अलर्ट",
    description: "Low stock, near-expiry, overdue receivables, negative stock, and sync status",
    descriptionHi: "कम स्टॉक, समाप्ति तिथि निकट, उधारी देय, नकारात्मक स्टॉक और सिंक स्थिति",
    industryApplicability: "all",
    defaultVisible: true,
    gridSpan: "full",
    order: 2,
  },
  {
    id: "pharma-expiry-alerts",
    title: "Pharma Near-Expiry & Risk Valuation",
    titleHi: "दवा समाप्ति चेतावनी एवं जोखिम विश्लेषण",
    description: "Audit batches expiring within 60 days with value at risk",
    descriptionHi: "60 दिनों में समाप्त होने वाले बैच और जोखिम मूल्य",
    industryApplicability: ["PHARMA"],
    defaultVisible: true,
    gridSpan: "half",
    order: 3,
  },
  {
    id: "pharma-schedule-h1",
    title: "Schedule H1 Prescription Compliance Register",
    titleHi: "शेड्यूल H1 पर्चा अनुपालन रजिस्टर",
    description: "Mandatory statutory register for restricted drugs, doctors, and patients",
    descriptionHi: "प्रतिबंधित दवाओं, डॉक्टरों एवं मरीजों का वैधानिक अनुपालन रजिस्टर",
    industryApplicability: ["PHARMA"],
    defaultVisible: true,
    gridSpan: "half",
    order: 4,
  },
  {
    id: "sales-collection-analytics",
    title: "Sales & Cashflow Revenue Analytics",
    titleHi: "बिक्री एवं नकदी प्रवाह विश्लेषण",
    description: "Actual daily revenue trends vs realized cash collections",
    descriptionHi: "दैनिक बिक्री रुझान बनाम प्राप्त नकदी वसूली",
    industryApplicability: "all",
    defaultVisible: true,
    gridSpan: "two-thirds",
    order: 5,
  },
  {
    id: "payment-distribution",
    title: "Payment Mode Channel Distribution",
    titleHi: "भुगतान माध्यम वितरण",
    description: "Actual ledger distribution across Cash, UPI, Bank Transfer, and Credit",
    descriptionHi: "कैश, यूपीआई, बैंक ट्रांसफर एवं उधारी का वास्तविक वितरण",
    industryApplicability: "all",
    defaultVisible: true,
    gridSpan: "one-third",
    order: 6,
  },
  {
    id: "top-debtors-exposure",
    title: "Top Receivables & Credit Limit Outstandings",
    titleHi: "प्रमुख देनदार एवं क्रेडिट सीमा उधारी",
    description: "Highest outstanding customer accounts and credit exposures",
    descriptionHi: "अधिकतम बकाया वाले ग्राहक और उधारी सीमा",
    industryApplicability: ["FMCG", "WHOLESALE", "B2B_DIST", "HARDWARE", "ELECTRICAL", "GENERAL_TRADING"],
    defaultVisible: true,
    gridSpan: "half",
    order: 7,
  },
  {
    id: "fast-moving-skus",
    title: "Fast-Moving Products Velocity",
    titleHi: "तीव्र गति से बिकने वाले उत्पाद",
    description: "Top items by sales quantity and turnover velocity",
    descriptionHi: "बिक्री मात्रा और आवर्त गति के अनुसार शीर्ष उत्पाद",
    industryApplicability: ["FMCG", "WHOLESALE", "RETAIL", "GROCERY", "HARDWARE", "BAKERY"],
    defaultVisible: true,
    gridSpan: "half",
    order: 8,
  },
  {
    id: "recent-activity-ledger",
    title: "Recent Business Activity & Transactions",
    titleHi: "हाल की व्यावसायिक गतिविधियां एवं लेनदेन",
    description: "Live feed of recent sales invoices, purchase bills, collections, and stock changes",
    descriptionHi: "नवीनतम बिल, खरीद, वसूली एवं स्टॉक परिवर्तन का लाइव विवरण",
    industryApplicability: "all",
    defaultVisible: true,
    gridSpan: "full",
    order: 9,
  },
];

export function getApplicableWidgets(industryCode: string | undefined, hasPharmaAddon: boolean = false): DashboardWidgetConfig[] {
  const normCode = (industryCode || "GENERAL_TRADING").toUpperCase();
  return DASHBOARD_WIDGET_REGISTRY.filter((w) => {
    if (w.id.startsWith("pharma-")) {
      return hasPharmaAddon || normCode === "PHARMA";
    }
    if (w.industryApplicability === "all") return true;
    return w.industryApplicability.includes(normCode);
  });
}
