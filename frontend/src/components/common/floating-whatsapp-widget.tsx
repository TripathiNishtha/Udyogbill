"use client";

import { MessageCircle, PhoneCall, HelpCircle } from "lucide-react";

interface FloatingWhatsAppWidgetProps {
  phoneNumber?: string;
  defaultMessage?: string;
  className?: string;
}

export function FloatingWhatsAppWidget({
  phoneNumber = "919473807622",
  defaultMessage = "Namaste UdyogBill Team, mujhe software setup me madad chahiye.",
  className = "",
}: FloatingWhatsAppWidgetProps) {
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div className={`fixed bottom-5 right-5 z-40 flex items-center group ${className}`}>
      {/* Tooltip text pill on desktop hover */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-900/30 transition-all transform hover:scale-105 active:scale-95 border border-emerald-400/40 select-none"
        title="Chat on WhatsApp for free support"
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200"></span>
          </span>
        </div>

        <span className="text-xs font-bold whitespace-nowrap hidden sm:inline-block pr-1">
          मदद चाहिए? WhatsApp करें
        </span>
      </a>
    </div>
  );
}
