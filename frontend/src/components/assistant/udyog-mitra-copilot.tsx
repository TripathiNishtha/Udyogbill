"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  Receipt,
  Boxes,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  Bot
} from "lucide-react";
import { assistantService, AssistantQueryResponse, QuickPromptGroup } from "@/services/assistant-services";
import { authService } from "@/services/api-services";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  intentType?: string;
  navigationUrl?: string;
  navigationText?: string;
  followUps?: string[];
  timestamp: string;
}

export function UdyogMitraCopilot() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [userName, setUserName] = useState("Dukaandaar");
  const [businessName, setBusinessName] = useState("Aapki Dukaan");
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickPrompts, setQuickPrompts] = useState<QuickPromptGroup[]>([]);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) return;

    const isStaffDisabled = typeof window !== "undefined" && localStorage.getItem("udyogbill_staff_ai_access") === "false";
    const isOwner = Boolean(user.isTenantAdmin || user.isSuperAdmin);

    // If owner: always allowed. If staff: check if disabled by owner or lacks role/permission
    const allowed = isOwner || (!isStaffDisabled && Boolean(
      user.permissions?.includes("ai_assistant.use") ||
      user.roles?.some((r) => r.toLowerCase().includes("admin") || r.toLowerCase().includes("manager") || r.toLowerCase().includes("staff") || r.toLowerCase().includes("cashier"))
    ));

    setHasPermission(allowed);
    if (user.fullName) setUserName(user.fullName.split(" ")[0]);
    if (user.businessName) setBusinessName(user.businessName);

    const displayName = user.fullName || "Sir";

    // Initial greeting
    setMessages([
      {
        id: "greet-1",
        sender: "assistant",
        text: `Namaste **${displayName}**! Main aapka **UdyogMitra** hoon — UdyogBill me aapka digital business saathi.\n\nAapko bill banana ho, stock check karna ho ya aaj ka hisaab poochna ho — bas yahan likhein ya bolein!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        followUps: [
          "Invoice kaise banaye?",
          "Aaj kitna payment aaya?",
          "Suppliers ko kitna due dena hai?",
          "Low stock items dikhao"
        ]
      }
    ]);

    // Fetch quick prompts
    assistantService.getQuickPrompts().then((res) => {
      if (res && Array.isArray(res)) {
        setQuickPrompts(res);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Web Speech API for voice queries
  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = "hi-IN"; // Supports Hindi & English accents

      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputQuery(transcript);
          handleSend(transcript);
        }
        setIsListening(false);
      };

      recog.onerror = () => {
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("Aapke browser me voice recognition support available nahi hai.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res = await assistantService.sendQuery({
        queryText: q,
        contextUrl: typeof window !== "undefined" ? window.location.pathname : undefined,
        languagePreference: "hinglish"
      });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: res.answerText,
        intentType: res.intentType,
        navigationUrl: res.directNavigationUrl,
        navigationText: res.navigationButtonText,
        followUps: res.suggestedFollowUps,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "assistant",
          text: "Maaf kijiye, server se connect karne me dikkat aayi. Kripya dobara try karein.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasPermission) {
    return null; // Hidden if user has no permission
  }

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 flex items-center animate-in fade-in slide-in-from-bottom-5 duration-300">
          <button
            onClick={() => setIsOpen(true)}
            className="group relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white/20"
            title="Open UdyogMitra Assistant"
          >
            <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-white transition-transform group-hover:rotate-12" />
            <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </button>
        </div>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[95vw] sm:w-[420px] h-[600px] max-h-[90vh] bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl shadow-slate-950 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800/40">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center shadow-inner">
                <Bot className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight">UdyogMitra</h3>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-bold uppercase tracking-wider border border-emerald-400/30">
                    Live AI
                  </span>
                </div>
                <p className="text-[10px] text-indigo-200 truncate max-w-[220px]">
                  {businessName} • 100% Zero-Error Copilot
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/60 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-900/30 font-medium"
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm"
                  }`}
                >
                  <div
                    className="whitespace-pre-line"
                    dangerouslySetInnerHTML={{
                      __html: m.text
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/• /g, "<span class='text-indigo-400'>• </span>")
                    }}
                  />

                  {/* Direct Deep Navigation Action Button */}
                  {m.navigationUrl && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          router.push(m.navigationUrl!);
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all cursor-pointer"
                      >
                        <span>{m.navigationText || "Open Screen Now"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-slate-500 px-1 mt-1 font-mono">
                  {m.timestamp}
                </span>

                {/* Follow-up Question Chips */}
                {m.followUps && m.followUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                    {m.followUps.map((fu, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(fu)}
                        className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-indigo-300 hover:text-white transition cursor-pointer text-left"
                      >
                        ⚡ {fu}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl w-fit text-slate-400 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span className="text-[11px]">UdyogMitra hisaab check kar raha hai...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Category Chips */}
          {quickPrompts.length > 0 && messages.length <= 2 && (
            <div className="px-3 py-2 bg-slate-900/80 border-t border-slate-800/80 flex gap-2 overflow-x-auto">
              {quickPrompts[0]?.prompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded-lg whitespace-nowrap shrink-0 border border-slate-700/50 transition"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Query Input Bar */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2 rounded-xl transition ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title={isListening ? "Listening... Speak now" : "Speak your question in Hindi/English"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              placeholder={isListening ? "Bol rahe hain, sun raha hoon..." : "Likiye: 'aaj kitna payment aaya', 'invoice kaise banaye'..."}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputQuery.trim() || isLoading}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition shadow-md shadow-indigo-950 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
