"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2, HelpCircle } from "lucide-react";

export interface TourStep {
  targetId: string;
  titleHi: string;
  titleEn: string;
  descHi: string;
  descEn: string;
  position?: "top" | "bottom" | "left" | "right";
  actionLabelHi?: string;
  actionLabelEn?: string;
  onAction?: () => void;
}

interface OnboardingTourProps {
  steps: TourStep[];
  tourKey?: string;
  isOpen?: boolean;
  onClose?: () => void;
  autoStart?: boolean;
}

export function OnboardingTour({
  steps,
  tourKey = "udyogbill_main_tour",
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  autoStart = true,
}: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Check if tour should auto-open on initial mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = localStorage.getItem(`${tourKey}_completed`);
    if (controlledIsOpen !== undefined) {
      setIsActive(controlledIsOpen);
    } else if (autoStart && !completed) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [controlledIsOpen, autoStart, tourKey]);

  // Update target rect on step change or resize/scroll
  const updateTargetPosition = useCallback(() => {
    if (!isActive || !steps[currentStepIndex]) {
      setTargetRect(null);
      return;
    }

    const currentStep = steps[currentStepIndex];
    const el = document.getElementById(currentStep.targetId);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      // If element not found, retry once or fallback to center screen
      const retryTimer = setTimeout(() => {
        const retryEl = document.getElementById(currentStep.targetId);
        if (retryEl) {
          setTargetRect(retryEl.getBoundingClientRect());
        }
      }, 400);
      return () => clearTimeout(retryTimer);
    }
  }, [isActive, steps, currentStepIndex]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition, true);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition, true);
    };
  }, [updateTargetPosition]);

  const handleClose = () => {
    setIsActive(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(`${tourKey}_completed`, "true");
    }
    if (controlledOnClose) controlledOnClose();
  };

  const handleNext = () => {
    const currentStep = steps[currentStepIndex];
    if (currentStep.onAction) {
      currentStep.onAction();
    }
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!isActive || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Calculate Tooltip Box Position
  const padding = 10;
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
  };

  if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow > 260 || spaceBelow >= spaceAbove) {
      // Place below target
      tooltipStyle = {
        ...tooltipStyle,
        top: Math.min(window.innerHeight - 280, targetRect.bottom + 14),
        left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left)),
      };
    } else {
      // Place above target
      tooltipStyle = {
        ...tooltipStyle,
        bottom: window.innerHeight - targetRect.top + 14,
        left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left)),
      };
    }
  } else {
    // Center of screen if target is missing
    tooltipStyle = {
      ...tooltipStyle,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden animate-in fade-in duration-300">
      {/* Dimmed backdrop with Spotlight Cutout */}
      {targetRect ? (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="tour-spotlight-mask">
              {/* White fills everything (opaque) */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black cuts hole around target */}
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="14"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(2, 6, 23, 0.78)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs pointer-events-none" />
      )}

      {/* Target Glowing Spotlight Border & Pointer Beacon */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
          }}
          className="rounded-2xl ring-4 ring-emerald-500/80 ring-offset-2 ring-offset-slate-950 pointer-events-none animate-pulse shadow-[0_0_40px_rgba(16,185,129,0.5)] z-[9999]"
        >
          {/* Animated Pointing Hand / Finger (👉) */}
          <div className="absolute -top-7 -right-7 sm:-top-8 sm:-right-8 text-3xl sm:text-4xl animate-bounce drop-shadow-lg select-none">
            👇
          </div>
        </div>
      )}

      {/* Tooltip Card */}
      <div
        style={tooltipStyle}
        className="w-[92vw] sm:w-[380px] bg-slate-900/95 text-white rounded-2xl p-5 border border-emerald-500/40 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 pointer-events-auto"
      >
        {/* Header with Step Indicator & Close */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Skip Tour / बंद करें"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-1.5 py-1">
          <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
            <span>{currentStep.titleHi}</span>
          </h4>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            {currentStep.descHi}
          </p>
          <p className="text-[11px] text-slate-400 italic pt-0.5 border-t border-slate-800/60">
            {currentStep.descEn}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="text-[11px] text-slate-400 hover:text-slate-200 font-medium px-2 py-1 rounded transition-colors"
          >
            Skip (छोड़ें)
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>पीछे</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-900/40 transition-all flex items-center gap-1 active:scale-95"
            >
              <span>{isLastStep ? "Complete (समझ गया)" : currentStep.actionLabelHi || "आगे बढ़ें"}</span>
              {isLastStep ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-launch Tour Helper Button Component
export function LaunchTourButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all ${className}`}
      title="Interactive Software Guide"
    >
      <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
      <span>गाइड / Tour</span>
    </button>
  );
}
