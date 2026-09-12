"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Printer,
  Download,
  ExternalLink,
  Laptop,
  Command,
  ArrowRight,
  Sliders,
  Layers,
  FileSpreadsheet,
  Settings,
  X,
  Share2,
  Check
} from "lucide-react";
import { MASTER_MANUAL_VOLUMES, ManualTopic, ManualVolume } from "@/data/help-manual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function UserManualHelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVolumeId, setActiveVolumeId] = useState<string>("vol-5-sales-pos");
  const [activeTopicId, setActiveTopicId] = useState<string>("tax-invoices");
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter topics based on search query
  const filteredVolumes = useMemo(() => {
    if (!searchQuery.trim()) return MASTER_MANUAL_VOLUMES;
    const q = searchQuery.toLowerCase();
    return MASTER_MANUAL_VOLUMES.map((vol) => ({
      ...vol,
      topics: vol.topics.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.titleHindi.toLowerCase().includes(q) ||
          t.overview.toLowerCase().includes(q) ||
          t.overviewHindi.toLowerCase().includes(q) ||
          t.fieldsBreakdown.some(
            (f) =>
              f.fieldName.toLowerCase().includes(q) ||
              f.hindiExplanation.toLowerCase().includes(q)
          )
      )
    })).filter((vol) => vol.topics.length > 0);
  }, [searchQuery]);

  // Selected Topic Details
  const currentTopic = useMemo(() => {
    for (const vol of MASTER_MANUAL_VOLUMES) {
      const found = vol.topics.find((t) => t.id === activeTopicId);
      if (found) return { topic: found, volume: vol };
    }
    return {
      topic: MASTER_MANUAL_VOLUMES[0].topics[0],
      volume: MASTER_MANUAL_VOLUMES[0]
    };
  }, [activeTopicId]);

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
      {/* Top Banner Header */}
      <div className="shrink-0 bg-surface border-b border-border px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black shadow-xs shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                UdyogBill Master User Manual &amp; Knowledge Base
              </h1>
              <Badge variant="success" size="sm" className="text-[10px] font-bold py-0">
                100% Complete
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              सॉफ्टवेयर का सम्पूर्ण यूजर मैन्युअल: स्टेप-बाय-स्टेप गाइड, हर बटन और फील्ड का विवरण।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Global Search Bar */}
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any feature (e.g. GST, FEFO, Barcode)..."
              className="w-full pl-8 pr-7 py-1.5 bg-surface-elevated text-xs text-foreground placeholder:text-muted-foreground/70 rounded-lg border border-border focus:outline-none focus:border-primary transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="text-xs gap-1.5 shadow-xs border-border shrink-0 hidden md:inline-flex"
            title="Print Manual Topic"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Guide</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyShare}
            className="text-xs gap-1.5 shadow-xs border-border shrink-0"
            title="Share Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? "Copied!" : "Share"}</span>
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left TOC Sidebar */}
        <aside className="w-72 sm:w-80 border-r border-border bg-sidebar shrink-0 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-sidebar-border bg-sidebar-accent/30 flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <span>Table of Contents (विषय सूची)</span>
            <span>{filteredVolumes.reduce((acc, v) => acc + v.topics.length, 0)} Topics</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {filteredVolumes.map((vol) => (
              <div key={vol.id} className="space-y-1">
                <div className="px-2 py-1 flex items-center gap-2 text-xs font-bold text-sidebar-foreground/90 uppercase tracking-tight">
                  <span className="w-5 h-5 rounded bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold shrink-0">
                    V{vol.volumeNumber}
                  </span>
                  <span className="truncate">{vol.title}</span>
                </div>

                <div className="pl-3 space-y-0.5 border-l-2 border-border/40 ml-2.5">
                  {vol.topics.map((top) => {
                    const isSelected = activeTopicId === top.id;
                    return (
                      <button
                        key={top.id}
                        type="button"
                        onClick={() => {
                          setActiveVolumeId(vol.id);
                          setActiveTopicId(top.id);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-hover"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate">{top.title}</div>
                          <div className={`text-[10px] truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {top.titleHindi}
                          </div>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? "text-primary-foreground translate-x-0.5" : "text-muted-foreground group-hover:translate-x-0.5"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Content Area: Deep Manual View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-background">
          {/* Header of Active Topic */}
          <div className="space-y-3 border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-bold text-primary">Volume {currentTopic.volume.volumeNumber}</span>
              <span>/</span>
              <span>{currentTopic.volume.title}</span>
              <span>/</span>
              <span className="text-foreground font-medium">{currentTopic.topic.title}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  {currentTopic.topic.title}
                </h2>
                <h3 className="text-sm sm:text-base font-semibold text-primary mt-0.5">
                  {currentTopic.topic.titleHindi}
                </h3>
              </div>

              {/* Navigation Breadcrumb Box */}
              <div className="bg-surface-elevated border border-border px-3 py-2 rounded-xl text-xs space-y-0.5 shrink-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Where to find / रास्ता:</span>
                <p className="font-mono font-bold text-foreground text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400">
                  {currentTopic.topic.navigationPath}
                </p>
              </div>
            </div>

            {/* Keyboard Shortcuts Strip */}
            {currentTopic.topic.keyboardShortcuts && currentTopic.topic.keyboardShortcuts.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Command className="w-3.5 h-3.5" /> Shortcuts:
                </span>
                {currentTopic.topic.keyboardShortcuts.map((sc, idx) => (
                  <div key={idx} className="inline-flex items-center gap-1.5 bg-surface border border-border px-2 py-0.5 rounded-lg text-xs shadow-xs">
                    <kbd className="bg-primary/10 text-primary font-mono font-bold px-1.5 py-0.5 rounded text-[11px]">
                      {sc.key}
                    </kbd>
                    <span className="text-foreground/80 text-[11px]">{sc.action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overview Callout Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <Lightbulb className="w-4 h-4" /> English Overview
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                {currentTopic.topic.overview}
              </p>
            </div>

            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" /> हिंदी सरल समझ (सरल शब्दों में)
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                {currentTopic.topic.overviewHindi}
              </p>
            </div>
          </div>

          {/* Field-by-Field Breakdown Table (The Deepest Feature Guide) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  <span>Field-by-Field Complete Breakdown (हर एक ऑप्शन का विवरण)</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  इस स्क्रीन पर मौजूद हर इनपुट फील्ड, बटन और चेकबॉक्स का सटीक काम।
                </p>
              </div>
              <Badge variant="neutral" size="sm" className="text-xs font-mono font-bold">
                {currentTopic.topic.fieldsBreakdown.length} Fields Defined
              </Badge>
            </div>

            <div className="border border-border rounded-2xl overflow-hidden shadow-xs bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-elevated border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-4 w-48">Field / Button Name</th>
                      <th className="py-3 px-3 w-28">Type / Status</th>
                      <th className="py-3 px-4">English Purpose &amp; Logic</th>
                      <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400">हिंदी में पूरा विवरण</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    {currentTopic.topic.fieldsBreakdown.map((f, fIdx) => (
                      <tr key={fIdx} className="hover:bg-surface-elevated/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground align-top">
                          <div className="flex items-center gap-1.5">
                            <span>{f.fieldName}</span>
                            {f.isRequired && (
                              <span className="text-red-500 font-bold" title="Required field">*</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <span className="inline-block uppercase text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-muted-foreground">
                            {f.fieldType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-foreground/90 align-top leading-relaxed">
                          <p>{f.purpose}</p>
                          {f.formulaOrLogic && (
                            <span className="inline-block mt-1 font-mono text-[10px] text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/20">
                              Logic: {f.formulaOrLogic}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-foreground/90 align-top leading-relaxed font-medium">
                          {f.hindiExplanation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Step-by-Step Step Workflow Guide */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Step-by-Step Working Workflow (स्टेप-बाय-स्टेप कैसे इस्तेमाल करें)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                बिना किसी गलती के काम पूरा करने के लिए इन स्टेप्स का पालन करें।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {currentTopic.topic.stepByStepGuide.map((step) => (
                <div
                  key={step.stepNumber}
                  className="bg-surface border border-border rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-xs relative hover:border-primary/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-xl bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shadow-xs">
                        {step.stepNumber}
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">Step</span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{step.stepTitle}</h4>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {step.actionInstruction}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/60 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {step.hindiInstruction}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tips & Best Practices */}
          <div className="bg-gradient-to-br from-amber-500/10 via-surface to-surface border border-amber-500/30 rounded-2xl p-4 sm:p-6 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <Lightbulb className="w-4 h-4" />
              <span>Pro-Tips &amp; Best Business Practices (विशेष सलाह और शॉर्टकट)</span>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-foreground/90 font-medium">
              {currentTopic.topic.proTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-surface/70 border border-border/60 p-2.5 rounded-xl shadow-xs">
                  <span className="text-amber-500 font-bold shrink-0">★</span>
                  <span>{tip}</span>
                </li>
              ))}
              {currentTopic.topic.proTipsHindi.map((tipH, idx) => (
                <li key={`h-${idx}`} className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-xl shadow-xs text-emerald-800 dark:text-emerald-300">
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span>{tipH}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* FAQs & Troubleshooting */}
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              <span>Troubleshooting &amp; Frequently Asked Questions (सामान्य सवाल और समाधान)</span>
            </h3>

            <div className="space-y-3">
              {currentTopic.topic.faqs.map((faq, fIdx) => (
                <div key={fIdx} className="bg-surface border border-border rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground">
                    <span className="text-primary font-black">Q:</span>
                    <span>{faq.question}</span>
                    <span className="text-muted-foreground font-normal text-xs">({faq.questionHindi})</span>
                  </div>
                  <div className="pl-4 border-l-2 border-primary/30 space-y-1 text-xs text-foreground/85 leading-relaxed">
                    <p>{faq.answer}</p>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">{faq.solutionHindi}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
