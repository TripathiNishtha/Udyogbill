import {
  Users2,
  Award,
  FileCheck2,
  Clock,
  Receipt
} from "lucide-react";
import { AddonManifest } from "../addon-registry";

export const hrmAddonManifest: AddonManifest = {
  id: "hrm",
  name: "HRM & Workforce Governance Suite",
  titleHindi: "कर्मचारी हाजिरी एवं वेतन प्रबंधन सुइट",
  description: "Geo-fenced mobile attendance, leave management, staff directory, payroll calculations, and field expense claims.",
  icon: Users2,
  badgeText: "Enterprise HR",
  category: "Workforce",
  featureKeys: [],
  sidebarNavGroup: {
    id: "hrm-suite",
    title: "HRM & Workforce",
    icon: Users2,
    items: [
      { label: "HRM & Payroll Portal", href: "/app/hrm", icon: Award },
      { label: "Employee Directory", href: "/app/hrm?tab=staff", icon: Users2 },
      { label: "Leave Requests (LMS)", href: "/app/hrm?tab=leaves", icon: FileCheck2 },
      { label: "Geo-Attendance Log", href: "/app/hrm?tab=attendance", icon: Clock },
      { label: "CBO Expense Claims", href: "/app/hrm?tab=expenses", icon: Receipt },
    ],
  },
  highlights: [
    "GPS Geo-fenced & Office Wi-Fi Attendance Tracking",
    "Multi-Level Leave Approval Workflow",
    "Employee Document Vault & Statutory Numbers (PAN, Aadhaar, UAN, ESIC)",
    "Salary Register & Payslip Generation",
    "Field Force Daily Travel & Daily Allowance (TA/DA) Expense Reimbursement",
  ],
};
