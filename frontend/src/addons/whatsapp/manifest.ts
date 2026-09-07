import { MessageSquare, Send, Bell, Settings } from "lucide-react";
import { AddonManifest } from "../addon-registry";

export const whatsappAddonManifest: AddonManifest = {
  id: "whatsapp",
  name: "WhatsApp Cloud Automation",
  titleHindi: "व्हाट्सएप ऑटोमेशन व बिल शेयरिंग",
  description: "Meta WhatsApp Cloud API integration, automatic PDF invoice dispatch, payment reminder alerts, and customer engagement.",
  icon: MessageSquare,
  badgeText: "Communication",
  category: "Messaging",
  featureKeys: [],
  sidebarNavGroup: {
    id: "whatsapp-suite",
    title: "WhatsApp Automation",
    icon: MessageSquare,
    items: [
      { label: "WhatsApp & SMS Gateway", href: "/app/notifications", icon: MessageSquare },
    ],
  },
  highlights: [
    "1-Click PDF Tax Invoice Dispatch on WhatsApp",
    "Meta Official Cloud API Direct Integration",
    "Automated Overdue Payment Reminder Notifications",
    "Broadcast Marketing & Promotional Campaigns",
  ],
};
