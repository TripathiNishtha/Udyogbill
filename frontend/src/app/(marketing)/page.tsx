"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function HomePage() {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    businessType: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("ub-home-v2");

    // Ensure all sections and cards are immediately visible
    const revealItems = document.querySelectorAll(
      ".ub-reveal-section, .feature-card, .faq-item, .benefit-card, .step-card, .ub-reveal"
    );
    revealItems.forEach((el) => el.classList.add("is-visible"));

    const faqItems = document.querySelectorAll(".faq-item");
    const clickHandlers: Array<{ el: Element; fn: () => void }> = [];

    faqItems.forEach((item) => {
      const handler = () => {
        const isOpen = item.classList.contains("is-open");
        faqItems.forEach((i) => i.classList.remove("is-open"));
        if (!isOpen) {
          item.classList.add("is-open");
        }
      };
      item.addEventListener("click", handler);
      clickHandlers.push({ el: item, fn: handler });
    });

    return () => {
      document.body.classList.remove("ub-home-v2");
      clickHandlers.forEach(({ el, fn }) => el.removeEventListener("click", fn));
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setMsg({ text: "Please enter your name", isError: true });
      return;
    }
    if (!/^\d{10}$/.test(form.mobile.trim())) {
      setMsg({ text: "Please enter a valid 10-digit mobile number", isError: true });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050") + "/api/v1/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          mobile: form.mobile,
          businessType: form.businessType || "Retail",
          message: form.message,
          source: "homepage_contact_form"
        })
      });
      setMsg({ text: "Thank you! We will call or WhatsApp you shortly.", isError: false });
      setForm({ name: "", mobile: "", businessType: "", message: "" });
    } catch {
      setMsg({ text: "Thank you! Request received.", isError: false });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ub-home-v2">
      <link rel="stylesheet" href="/css/udyogbill-home-critical.css" />
      <link rel="stylesheet" href="/css/udyogbill-home.css" />

      {/* Shared Site Header - Enterprise Corporate Redesign */}
      <header className="ub-site-header">
        <style>{`
          .ub-site-header {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.88);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(226, 232, 240, 0.85);
            box-shadow: 0 4px 24px -2px rgba(15, 23, 42, 0.06);
            transition: all 0.3s ease;
          }
          .ub-header-top-accent {
            height: 3px;
            background: linear-gradient(90deg, #f97316 0%, #facc15 50%, #16a34a 100%);
            width: 100%;
          }
          .ub-header-inner {
            max-width: 1440px;
            margin: 0 auto;
            padding: 0.5rem clamp(1.25rem, 2.5vw, 2.5rem);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.25rem;
          }
          .ub-header-brand-wrap {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
            flex-shrink: 0;
          }
          .ub-header-brand {
            display: flex;
            align-items: center;
            transition: transform 0.2s ease;
          }
          .ub-header-brand:hover {
            transform: scale(1.02);
          }
          .ub-header-brand img {
            height: 42px;
            width: auto;
            display: block;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.05));
          }
          .ub-brand-trust-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.18rem 0.55rem;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 700;
            color: #15803d;
            letter-spacing: 0.02em;
          }
          .ub-header-nav {
            display: flex;
            align-items: center;
            gap: 0.2rem;
            background: rgba(241, 245, 249, 0.7);
            padding: 0.25rem 0.45rem;
            border-radius: 999px;
            border: 1px solid rgba(226, 232, 240, 0.8);
          }
          .ub-header-nav a {
            font-size: 0.84rem;
            font-weight: 600;
            color: #334155;
            text-decoration: none;
            padding: 0.32rem 0.8rem;
            border-radius: 999px;
            transition: all 0.18s ease;
            white-space: nowrap;
          }
          .ub-header-nav a:hover {
            color: #ea580c;
            background: #ffffff;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
          }
          .ub-header-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-shrink: 0;
          }
          .ub-nav-btn-login {
            font-size: 0.85rem;
            font-weight: 700;
            color: #334155;
            padding: 0.45rem 1.15rem;
            border-radius: 999px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            text-decoration: none;
            transition: all 0.2s ease;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
          }
          .ub-nav-btn-login:hover {
            border-color: #ea580c;
            color: #ea580c;
            box-shadow: 0 4px 12px rgba(234, 88, 12, 0.12);
            transform: translateY(-1px);
          }
          .ub-nav-btn-trial {
            font-size: 0.85rem;
            font-weight: 700;
            color: #ffffff;
            padding: 0.48rem 1.3rem;
            border-radius: 999px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            text-decoration: none;
            transition: all 0.2s ease;
            box-shadow: 0 8px 20px -2px rgba(234, 88, 12, 0.4);
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
          }
          .ub-nav-btn-trial:hover {
            box-shadow: 0 12px 28px -2px rgba(234, 88, 12, 0.55);
            transform: translateY(-1.5px);
          }
          @media (max-width: 1040px) {
            .ub-brand-trust-badge { display: none; }
          }
          @media (max-width: 900px) {
            .ub-header-nav { display: none; }
          }

          /* Wide Desktop Hero Section - No side shrinking, balanced spacing */
          body.ub-home-v2 .container {
            width: 100% !important;
            max-width: 1440px !important;
            padding: 0 clamp(1.25rem, 2.5vw, 2.5rem) !important;
          }
          .hero,
          body.ub-home-v2 .hero {
            padding-top: clamp(0.75rem, 1.5vw, 1.25rem) !important;
            padding-bottom: clamp(0.85rem, 1.8vw, 1.4rem) !important;
          }
          body.ub-home-v2 .hero-grid {
            gap: clamp(1.75rem, 2.5vw, 3rem) !important;
            align-items: center !important;
          }

          /* Left Column text and button sizing */
          body.ub-home-v2 .hero-eyebrow {
            padding: 0.2rem 0.65rem !important;
            font-size: 0.74rem !important;
            margin-bottom: 0.25rem !important;
          }
          body.ub-home-v2 .hero-title {
            margin-top: 0.35rem !important;
            margin-bottom: 0 !important;
            font-size: clamp(1.85rem, 2.3vw + 0.5rem, 2.75rem) !important;
            line-height: 1.14 !important;
            letter-spacing: -0.03em !important;
          }
          body.ub-home-v2 .hero-title span.highlight {
            margin-top: 0.2rem !important;
          }
          body.ub-home-v2 .hero-subtitle {
            margin-top: 0.45rem !important;
            margin-bottom: 0 !important;
            font-size: 0.95rem !important;
            line-height: 1.55 !important;
            max-width: 40rem !important;
          }
          body.ub-home-v2 .hero-actions {
            margin-top: 0.75rem !important;
            gap: 0.65rem !important;
          }
          body.ub-home-v2 .hero-actions .btn-primary {
            padding: 0.58rem 1.4rem !important;
            font-size: 0.9rem !important;
          }
          body.ub-home-v2 .hero-actions .btn-outline {
            padding: 0.58rem 1.25rem !important;
            font-size: 0.9rem !important;
          }
          body.ub-home-v2 .hero-note {
            margin-top: 0.45rem !important;
          }
          body.ub-home-v2 .hero-note-pill {
            font-size: 0.7rem !important;
            padding: 0.18rem 0.55rem !important;
          }
          body.ub-home-v2 .hero-meta-row {
            margin-top: 0.65rem !important;
            padding-top: 0.5rem !important;
            gap: 1.25rem !important;
          }
          body.ub-home-v2 .hero-meta-item {
            font-size: 0.72rem !important;
          }
          body.ub-home-v2 .hero-meta-number {
            font-size: 1.1rem !important;
          }

          /* Right Column Mockup Card - perfectly fits full image & card */
          body.ub-home-v2 .hero-card {
            padding: 0.75rem 0.9rem !important;
            border-radius: 18px !important;
            box-shadow: 0 16px 40px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(249, 115, 22, 0.06) !important;
          }
          body.ub-home-v2 .hero-card-header {
            margin-bottom: 0.4rem !important;
          }
          body.ub-home-v2 .hero-card-title {
            font-size: 0.82rem !important;
          }
          body.ub-home-v2 .hero-card-chip {
            font-size: 0.68rem !important;
            padding: 0.18rem 0.5rem !important;
          }
          body.ub-home-v2 .hero-metrics-grid {
            gap: 0.45rem !important;
            margin-bottom: 0.45rem !important;
          }
          body.ub-home-v2 .metric-tile {
            padding: 0.4rem 0.6rem !important;
            border-radius: 10px !important;
          }
          body.ub-home-v2 .metric-label {
            font-size: 0.64rem !important;
          }
          body.ub-home-v2 .metric-value {
            font-size: 1.05rem !important;
            margin-top: 0.08rem !important;
          }
          body.ub-home-v2 .metric-pill {
            font-size: 0.62rem !important;
            margin-top: 0.08rem !important;
          }
          body.ub-home-v2 .hero-visual {
            border-radius: 12px !important;
          }
          body.ub-home-v2 .hero-visual img {
            height: 195px !important;
            object-fit: cover !important;
            object-position: center 15% !important;
          }
          body.ub-home-v2 .hero-visual-pill {
            top: 6px !important;
            right: 6px !important;
            font-size: 0.62rem !important;
            padding: 0.18rem 0.45rem !important;
          }
          body.ub-home-v2 .hero-mini-row {
            gap: 0.45rem !important;
            margin-top: 0.45rem !important;
            margin-bottom: 0.35rem !important;
          }
          body.ub-home-v2 .mini-card {
            padding: 0.35rem 0.55rem !important;
            border-radius: 10px !important;
          }
          body.ub-home-v2 .mini-card strong {
            font-size: 0.72rem !important;
          }
          body.ub-home-v2 .hero-tagline {
            margin-top: 0.3rem !important;
            padding-top: 0.3rem !important;
            font-size: 0.66rem !important;
          }

          /* Compact Next Section (Features) so it peeks in nicely above/at the fold */
          #features.ub-section-compact {
            padding: clamp(1.25rem, 2vw, 2rem) 0 !important;
          }
          #features .section-heading {
            margin-bottom: 1.25rem !important;
          }
          #features .section-eyebrow {
            margin-bottom: 0.35rem !important;
            font-size: 0.68rem !important;
            padding: 0.2rem 0.6rem !important;
          }
          #features .section-title {
            font-size: clamp(1.5rem, 2vw + 0.6rem, 2.1rem) !important;
          }
          #features .section-subtitle {
            margin-top: 0.35rem !important;
          }
          /* Hamburger Menu Button (3 lines) */
          .ub-hamburger-btn {
            display: none;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 8px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            cursor: pointer;
            padding: 0;
            color: #0f172a;
            transition: all 0.2s ease;
          }
          .ub-hamburger-btn:hover {
            background: #f1f5f9;
            border-color: #ea580c;
          }

          @media (max-width: 900px) {
            .ub-hamburger-btn {
              display: flex !important;
            }
            .ub-header-inner {
              padding: 0.45rem 1rem !important;
            }
            .ub-header-actions .ub-nav-btn-trial {
              display: none !important;
            }
            .ub-header-actions .ub-nav-btn-login {
              padding: 0.35rem 0.85rem !important;
              font-size: 0.82rem !important;
            }
          }

          /* Mobile Navigation Drawer */
          .ub-mobile-drawer-backdrop {
            position: fixed;
            top: 52px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.55);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 99998;
            display: flex;
            justify-content: flex-end;
          }
          .ub-mobile-drawer {
            width: 100%;
            max-width: 300px;
            height: calc(100vh - 52px);
            background: #ffffff;
            box-shadow: -8px 0 24px rgba(0, 0, 0, 0.15);
            padding: 1.25rem 1.25rem 2rem;
            display: flex;
            flex-direction: column;
            gap: 0.85rem;
            overflow-y: auto;
            animation: drawerSlide 0.22s ease-out;
          }
          @keyframes drawerSlide {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .ub-mobile-drawer-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #e2e8f0;
          }
          .ub-mobile-drawer-title {
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #64748b;
          }
          .ub-mobile-drawer-close {
            width: 30px;
            height: 30px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.95rem;
            color: #64748b;
            cursor: pointer;
          }
          .ub-mobile-drawer-nav {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }
          .ub-mobile-drawer-nav a {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.65rem 0.75rem;
            font-size: 0.95rem;
            font-weight: 600;
            color: #1e293b;
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.15s ease;
          }
          .ub-mobile-drawer-nav a:hover,
          .ub-mobile-drawer-nav a:active {
            background: #fff7ed;
            color: #ea580c;
          }
          .ub-nav-arr {
            color: #94a3b8;
            font-size: 0.85rem;
          }
          .ub-mobile-drawer-foot {
            margin-top: auto;
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
            padding-top: 1rem;
            border-top: 1px solid #e2e8f0;
          }
          .ub-mobile-drawer-btn-login {
            display: block;
            text-align: center;
            padding: 0.65rem 1rem;
            font-size: 0.9rem;
            font-weight: 700;
            color: #334155;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            text-decoration: none;
          }
          .ub-mobile-drawer-btn-trial {
            display: block;
            text-align: center;
            padding: 0.75rem 1rem;
            font-size: 0.95rem;
            font-weight: 700;
            color: #ffffff;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            border-radius: 10px;
            text-decoration: none;
            box-shadow: 0 6px 16px rgba(234, 88, 12, 0.3);
          }
        `}</style>
        <div className="ub-header-top-accent"></div>
        <div className="ub-header-inner">
          <div className="ub-header-brand-wrap">
            <Link href="/" className="ub-header-brand" aria-label="UdyogBill Home">
              <img
                src="/logo.png"
                alt="UdyogBill"
                onError={(e: any) => { e.target.src = "/img/logo-small.png"; }}
              />
            </Link>
            <span className="ub-brand-trust-badge">
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }}></span>
              GST Ready 2026
            </span>
          </div>

          <nav className="ub-header-nav" aria-label="Main Navigation">
            <a href="#features">Features</a>
            <a href="#why">Why UdyogBill</a>
            <a href="#use-cases">Use Cases</a>
            <a href="#how">How It Works</a>
            <a href="#invoice-formats">Invoice Formats</a>
            <Link href="/blog">Blog</Link>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="ub-header-actions">
            <Link href="/login" className="ub-nav-btn-login">
              Login
            </Link>
            <Link href="/register" className="ub-nav-btn-trial">
              Start Free Trial →
            </Link>

            {/* Mobile 3-line Hamburger Menu Button */}
            <button
              type="button"
              className="ub-hamburger-btn"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            >
              {mobileNavOpen ? (
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="ub-mobile-drawer-backdrop" onClick={() => setMobileNavOpen(false)}>
            <div className="ub-mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="ub-mobile-drawer-head">
                <span className="ub-mobile-drawer-title">Pages &amp; Navigation</span>
                <button
                  type="button"
                  className="ub-mobile-drawer-close"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>
              <nav className="ub-mobile-drawer-nav">
                <a href="#features" onClick={() => setMobileNavOpen(false)}>
                  <span>⚡ Features</span>
                  <span className="ub-nav-arr">→</span>
                </a>
                <a href="#why" onClick={() => setMobileNavOpen(false)}>
                  <span>🎯 Why UdyogBill</span>
                  <span className="ub-nav-arr">→</span>
                </a>
                <a href="#use-cases" onClick={() => setMobileNavOpen(false)}>
                  <span>🏢 Use Cases</span>
                  <span className="ub-nav-arr">→</span>
                </a>
                <a href="#how" onClick={() => setMobileNavOpen(false)}>
                  <span>⚙️ How It Works</span>
                  <span className="ub-nav-arr">→</span>
                </a>
                <a href="#invoice-formats" onClick={() => setMobileNavOpen(false)}>
                  <span>🧾 Invoice Formats</span>
                  <span className="ub-nav-arr">→</span>
                </a>
                <Link href="/blog" onClick={() => setMobileNavOpen(false)}>
                  <span>📝 Blog</span>
                  <span className="ub-nav-arr">→</span>
                </Link>
                <a href="#faq" onClick={() => setMobileNavOpen(false)}>
                  <span>❓ FAQ</span>
                  <span className="ub-nav-arr">→</span>
                </a>
                <a href="#contact" onClick={() => setMobileNavOpen(false)}>
                  <span>📞 Contact</span>
                  <span className="ub-nav-arr">→</span>
                </a>
              </nav>
              <div className="ub-mobile-drawer-foot">
                <Link href="/login" className="ub-mobile-drawer-btn-login" onClick={() => setMobileNavOpen(false)}>
                  Login
                </Link>
                <Link href="/register" className="ub-mobile-drawer-btn-trial" onClick={() => setMobileNavOpen(false)}>
                  Start 14-Day Free Trial →
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="page">
        <main id="top" role="main" aria-label="Main content">
        {/*  HERO  */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="hero-eyebrow">
                <span className="hero-dot"></span>
                GST Billing &bull; Smart Inventory &bull; Accounting
              </div>
              <h1 className="hero-title">
                Business aapka, system hamara.
                <span className="highlight">Counter se CA tak, sab one place.</span>
              </h1>
              <p className="hero-subtitle">
                Ek hi software se <strong>billing, stock, udhaar aur accounts</strong> sambhalein.
                GST bill 30 second se bhi kam time me ban jata hai, stock apne-aap update hota hai
                aur aapko hamesha pata rehta hai kis se kitna lena-dena hai.
                <strong>Business aapka, system hamara.</strong>
              </p>
              <div className="hero-actions">
                <Link href="/register" className="btn btn-primary" aria-label="Start your 14-day free trial">
                  Start 14-day free trial →
                </Link>
                <a href="#features" className="btn btn-outline">
                  See what's inside
                </a>
              </div>
              <div className="hero-note">
                <span className="hero-note-pill">No credit card</span>
                <span className="hero-note-pill">Go live in days, not months</span>
              </div>
              <div className="hero-meta-row">
                <div className="hero-meta-item">
                  <span className="hero-meta-number">10k+</span>
                  <span>Invoices generated every month</span>
                </div>
                <div className="hero-meta-item">
                  <span className="hero-meta-number">&lt;30s</span>
                  <span>Create a GST invoice</span>
                </div>
                <div className="hero-meta-item">
                  <span className="hero-meta-number">99.9%</span>
                  <span>Uptime. Backed up. Secure.</span>
                </div>
              </div>
            </div>

            <aside className="hero-card">
              <div className="hero-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }}></span>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                  <span className="hero-card-title" style={{ marginLeft: "0.35rem", fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>UdyogBill</span>
                </div>
                <span className="hero-card-chip">● Live Online</span>
              </div>

              <div className="hero-metrics-grid">
                <div className="metric-tile">
                  <span className="metric-label">Today&apos;s Billing</span>
                  <div className="metric-value">₹48,920</div>
                  <span className="metric-pill">↑ 24% vs yesterday</span>
                </div>
                <div className="metric-tile">
                  <span className="metric-label">GST Tax Invoices</span>
                  <div className="metric-value">142 Bills</div>
                  <span className="metric-pill" style={{ color: "#0284c7" }}>Instant CA Ready</span>
                </div>
              </div>

              <div className="hero-visual">
                <img
                  src="/img/software-dashboard.png"
                  alt="UdyogBill GST Billing and Smart Inventory Software Screen"
                  width={830}
                  height={605}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                />
                <span className="hero-visual-pill">Live UdyogBill</span>
              </div>

              <div className="hero-mini-row">
                <div className="mini-card">
                  <strong>⚡ 30s GST Invoicing</strong>
                  <div style={{ fontSize: "0.72rem", opacity: 0.85, marginTop: "0.15rem" }}>Thermal &amp; A4 Print Supported</div>
                </div>
                <div className="mini-card">
                  <strong>📦 Godown Inventory</strong>
                  <div style={{ fontSize: "0.72rem", opacity: 0.85, marginTop: "0.15rem" }}>Auto stock deduction on sales</div>
                </div>
              </div>

              <div className="hero-tagline">
                <span>Enterprise Security &bull; 256-bit SSL</span>
                <span className="badge">Vyapar &amp; Busy Alternate</span>
              </div>
            </aside>
          </div>
        </section>

        {/*  FEATURES  */}
        <section id="features" className="ub-section-compact ub-band-white ub-reveal-section">
          <div className="container">
            <div className="section-heading">
              <div className="section-eyebrow">Features</div>
              <h2 className="section-title">Everything you need. <span className="title-accent">Nothing you don't.</span></h2>
              <p className="section-subtitle">
                Billing and inventory at the core  - plus CRM and HRM when you're ready.
                No bloat. No learning curve. Just tools that work the way you do.
              </p>
            </div>

            <div className="features-grid">
              <article className="feature-card">
                <div className="feature-header">
                  <div className="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3h12M6 8h12M10 13h8M8 18h5c3.3 0 6-1.8 6-4s-2.7-4-6-4H8"/></svg></div>
                  <div>
                    <div className="feature-kicker">Core module</div>
                    <h3 className="feature-title">GST Billing &amp; Invoicing</h3>
                  </div>
                </div>
                <div className="feature-image">
                  <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80" alt="Professional billing workspace with invoice documents" loading="lazy" />
                </div>
                <p className="feature-desc">
                  Create <strong>GST-compliant tax invoices</strong>, bills of supply, quotations
                  and proforma invoices in seconds. CGST, SGST, IGST, HSN/SAC and
                  place of supply are calculated automatically for you.
                </p>
                <div className="feature-tags">
                  <span className="feature-tag">Thermal &amp; A4 print</span>
                  <span className="feature-tag">Multiple invoice series</span>
                  <span className="feature-tag">Customer-wise price lists</span>
                  <span className="feature-tag">GST tax invoice / bill of supply</span>
                  <span className="feature-tag">Quotation &amp; proforma invoice</span>
                  <span className="feature-tag">Delivery challan &amp; credit note</span>
                  <span className="feature-tag">Item, HSN &amp; tax mapping</span>
                  <span className="feature-tag">Round-off &amp; discount rules</span>
                  <span className="feature-tag">Preset terms &amp; bank details</span>
                  <span className="feature-tag">Print &amp; PDF in one click</span>
                </div>
              </article>

              <article className="feature-card">
                <div className="feature-header">
                  <div className="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7l8.7 5 8.7-5M12 22V12"/></svg></div>
                  <div>
                    <div className="feature-kicker">Stock &amp; locations</div>
                    <h3 className="feature-title">Smart Stock &amp; Inventory</h3>
                  </div>
                </div>
                <div className="feature-image">
                  <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80" alt="Warehouse team managing stock and inventory" loading="lazy" />
                </div>
                <p className="feature-desc">
                  Track item-wise stock across multiple locations with units, batches and
                  expiry. Every sale and purchase updates stock automatically so reports
                  always match the ground reality.
                </p>
                <div className="feature-tags">
                  <span className="feature-tag">Godown-wise stock</span>
                  <span className="feature-tag">Multi-location inventory</span>
                  <span className="feature-tag">Batch / expiry tracking</span>
                  <span className="feature-tag">Minimum / reorder levels</span>
                  <span className="feature-tag">Slow &amp; fast-moving items</span>
                  <span className="feature-tag">Purchase &amp; sales price history</span>
                  <span className="feature-tag">Barcode / QR code support</span>
                  <span className="feature-tag">Stock transfer between godowns</span>
                  <span className="feature-tag">Opening stock import from Excel</span>
                  <span className="feature-tag">Real-time valuation</span>
                </div>
              </article>

              <article className="feature-card">
                <div className="feature-header">
                  <div className="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M7 16l4-5 4 3 5-7"/></svg></div>
                  <div>
                    <div className="feature-kicker">Insights</div>
                    <h3 className="feature-title">Business &amp; GST Reports</h3>
                  </div>
                </div>
                <div className="feature-image">
                  <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80" alt="Business analyst reviewing reports on laptop" loading="lazy" />
                </div>
                <p className="feature-desc">
                  Get <strong>sales, purchase, profit &amp; loss, GST summary and day book</strong>
                  along with customer and item-wise reports. Export everything to Excel or
                  PDF and share with your CA or team in one click.
                </p>
                <div className="feature-tags">
                  <span className="feature-tag">GSTR-1 / 3B assist</span>
                  <span className="feature-tag">Sales &amp; purchase register</span>
                  <span className="feature-tag">Profit &amp; loss</span>
                  <span className="feature-tag">Party-wise outstanding</span>
                  <span className="feature-tag">Item-wise profit &amp; margins</span>
                  <span className="feature-tag">Day book &amp; cash book</span>
                  <span className="feature-tag">GST summary &amp; tax analysis</span>
                  <span className="feature-tag">Ageing &amp; overdue analysis</span>
                  <span className="feature-tag">Export to Excel / PDF</span>
                  <span className="feature-tag">CA-friendly formats</span>
                </div>
              </article>

              <article className="feature-card">
                <div className="feature-header">
                  <div className="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                  <div>
                    <div className="feature-kicker">Receivables &amp; sales</div>
                    <h3 className="feature-title">Customer, Credit &amp; CRM</h3>
                  </div>
                </div>
                <div className="feature-image">
                  <img src="https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&w=1400&q=80" alt="Team discussion around customer relationship management dashboard" loading="lazy" />
                </div>
                <p className="feature-desc">
                  Maintain a complete view of every customer including
                  <strong>ledger, outstanding balance, payment history and follow-ups</strong>.
                  Capture enquiries, track quotations and reminders, and convert more
                  leads into repeat business.
                </p>
                <div className="feature-tags">
                  <span className="feature-tag">Lead &amp; enquiry tracking</span>
                  <span className="feature-tag">Quotation history</span>
                  <span className="feature-tag">Follow-up reminders</span>
                  <span className="feature-tag">Customer 360 view</span>
                  <span className="feature-tag">Outstanding &amp; credit limits</span>
                  <span className="feature-tag">WhatsApp / SMS reminders*</span>
                  <span className="feature-tag">Source &amp; campaign tagging</span>
                  <span className="feature-tag">Lost / won reason tracking</span>
                  <span className="feature-tag">Notes &amp; call details</span>
                  <span className="feature-tag">Basic sales funnel insights</span>
                </div>
              </article>

              <article className="feature-card">
                <div className="feature-header">
                  <div className="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                  <div>
                    <div className="feature-kicker">Team</div>
                    <h3 className="feature-title">HRM, Attendance &amp; Payroll</h3>
                  </div>
                </div>
                <div className="feature-image">
                  <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=80" alt="HR team meeting and employee management workspace" loading="lazy" />
                </div>
                <p className="feature-desc">
                  Use the HRM module to manage <strong>employee profiles, departments,
                  attendance, leave and salary summaries</strong>. Keep HR data and
                  payout details aligned with what is happening in billing.
                </p>
                <div className="feature-tags">
                  <span className="feature-tag">Daily attendance register</span>
                  <span className="feature-tag">Leave balance tracking</span>
                  <span className="feature-tag">Late / overtime summary</span>
                  <span className="feature-tag">Basic payroll calculations</span>
                  <span className="feature-tag">Department &amp; role mapping</span>
                  <span className="feature-tag">User-wise access rights</span>
                  <span className="feature-tag">Staff contact &amp; KYC details</span>
                  <span className="feature-tag">Join / exit history</span>
                  <span className="feature-tag">Export salary sheet</span>
                  <span className="feature-tag">Audit-friendly logs</span>
                </div>
              </article>

              <article className="feature-card">
                <div className="feature-header">
                  <div className="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></div>
                  <div>
                    <div className="feature-kicker">Control</div>
                    <h3 className="feature-title">Customisable &amp; Secure</h3>
                  </div>
                </div>
                <div className="feature-image">
                  <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1400&q=80" alt="Cyber security and settings management on modern workstation" loading="lazy" />
                </div>
                <p className="feature-desc">
                  Customise invoice design, logo, fields, discounts and round-off rules
                  to match your style. Multi-user, role-based access and regular backups
                  keep your financial and inventory data safe.
                </p>
                <div className="feature-tags">
                  <span className="feature-tag">Multi-user rights</span>
                  <span className="feature-tag">Role-based menus</span>
                  <span className="feature-tag">Multi-company setup</span>
                  <span className="feature-tag">Cloud backup &amp; restore</span>
                  <span className="feature-tag">IP / device-level control*</span>
                  <span className="feature-tag">Custom invoice templates</span>
                  <span className="feature-tag">Logo &amp; branding options</span>
                  <span className="feature-tag">Round-off &amp; discount rules</span>
                  <span className="feature-tag">Data export &amp; import</span>
                  <span className="feature-tag">Activity &amp; change logs</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/*  Why UdyogBill  */}
        <section id="why" className="benefits-section ub-band-cream ub-reveal-section">
          <div className="container">
            <div className="section-heading">
              <div className="section-eyebrow">Why UdyogBill</div>
              <h2 className="section-title">Clarity over complexity. <span className="title-accent">Every time.</span></h2>
              <p className="section-subtitle">
                Still switching between <strong>billing, stock, WhatsApp and spreadsheets</strong>?
                With UdyogBill you get <strong>one login, one source of truth</strong> for invoices,
                inventory, CRM and HRM  - built specifically for Indian SMEs.
              </p>
            </div>
            <div className="benefits-grid">
              <div className="benefit-card">
                <div className="benefit-num">1</div>
                <h3>GST-ready from day one</h3>
                <p>
                  CGST, SGST, IGST  - calculated for you. HSN, SAC, place of supply: <strong>all automatic</strong>.
                  Tax invoices and bills of supply that stay compliant. Your CA will thank you.
                </p>
              </div>
              <div className="benefit-card">
                <div className="benefit-num">2</div>
                <h3>Stock that updates itself</h3>
                <p>
                  Every sale and purchase updates stock. Multiple godowns, batches, low-stock alerts,
                  item-wise margins. <strong>No more manual registers</strong> or guessing what's on the shelf.
                </p>
              </div>
              <div className="benefit-card">
                <div className="benefit-num">3</div>
                <h3>Billing + CRM + HRM. One login.</h3>
                <p>
                  Stop switching apps. Invoices, customer ledger, follow-ups, attendance, payroll  -
                  <strong>all in one place</strong>. Add CRM and HRM when you're ready; no extra logins.
                </p>
              </div>
              <div className="benefit-card">
                <div className="benefit-num">4</div>
                <h3>Reports that actually make sense</h3>
                <p>
                  Day book. Sales &amp; purchase register. P&amp;L. Party-wise outstanding. Export to Excel or PDF.
                  <strong>GSTR-1 and GSTR-3B</strong> friendly. Give your CA data they can use, not fix.
                </p>
              </div>
              <div className="benefit-card">
                <div className="benefit-num">5</div>
                <h3>So simple, your team will use it</h3>
                <p>
                  No accounting degree required. Words you already know: sales, purchases, dues, stock.
                  Role-based access so everyone sees only what they need. <strong>Retail or wholesale</strong>  - same tool.
                </p>
              </div>
              <div className="benefit-card">
                <div className="benefit-num">6</div>
                <h3>Safe in the cloud</h3>
                <p>
                  Automatic backups. Multi-user control. Audit trails. Your <strong>billing and inventory</strong>
                  data stays secure - no more "where's that file?" or unauthorised changes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/*  Use cases  */}
        <section id="use-cases" className="ub-band-white ub-reveal-section">
          <div className="container">
            <div className="usecase-wrapper">
              <div>
                <h2 className="usecase-title">Your industry. Your workflow. One software.</h2>
                <p className="usecase-sub">
                  Shop, warehouse, or office  - <strong>we've built for how you actually work</strong>.
                  No "one size fits none." Configure once, then bill, track stock, and manage
                  customers the way that makes sense for you.
                </p>
                <div className="usecase-badge-row">
                  <span className="usecase-badge">Retail &amp; grocery</span>
                  <span className="usecase-badge">Electronics &amp; mobile</span>
                  <span className="usecase-badge">Pharmacy &amp; medical</span>
                  <span className="usecase-badge">Hardware &amp; building material</span>
                  <span className="usecase-badge">Service &amp; agencies</span>
                  <span className="usecase-badge">Small manufacturers</span>
                </div>
              </div>
              <div>
                <ul className="usecase-list">
                  <li>
                    <span className="usecase-dot"></span>
                    <span>
                      <strong>Retail counters:</strong> Fast billing, barcode scanning, discounts,
                      multiple payment modes and a clear daily sales summary without
                      heavy accounting knowledge.
                    </span>
                  </li>
                  <li>
                    <span className="usecase-dot"></span>
                    <span>
                      <strong>Wholesale &amp; distribution:</strong> Bulk orders, party-wise
                      rates, route-wise sales, credit management and powerful reports
                      so distributors always see the full picture.
                    </span>
                  </li>
                  <li>
                    <span className="usecase-dot"></span>
                    <span>
                      <strong>Trading &amp; stock-heavy businesses:</strong> Multiple locations,
                      item-wise margins, slow and fast-moving stock and alerts that
                      support smarter purchasing decisions.
                    </span>
                  </li>
                  <li>
                    <span className="usecase-dot"></span>
                    <span>
                      <strong>Service &amp; AMC work:</strong> Service invoices with SAC codes,
                      AMC tracking, follow-ups and customer history so no service request
                      falls through the cracks.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/*  How it works  */}
        <section id="how" className="steps-section ub-band-cream ub-reveal-section">
          <div className="container">
            <div className="section-heading">
              <div className="section-eyebrow">How it works</div>
              <h2 className="section-title">Live in days. <span className="title-accent">Not months.</span></h2>
              <p className="section-subtitle">
                Sign up. Add your items and customers. Start billing. We'll help you move
                data from Excel or your old software  - so you're up and running without
                the usual headaches.
              </p>
            </div>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-num">1</div>
                <h3>Sign up. Pick your plan.</h3>
                <p>
                  Business name, email, phone. Choose billing-only or add CRM &amp; HRM. Hit start  -
                  <strong>14-day free trial</strong>, no card needed.
                </p>
              </div>
              <div className="step-card">
                <div className="step-num">2</div>
                <h3>We help you move your data</h3>
                <p>
                  Items, customers, godowns, opening stock. Add them yourself or we'll help import from
                  Excel or your old software. <strong>No re-typing everything.</strong>
                </p>
              </div>
              <div className="step-card">
                <div className="step-num">3</div>
                <h3>Start billing. For real.</h3>
                <p>
                  GST invoices, quotations, challans. Stock updates with every sale. Print thermal or A4,
                  or send PDFs. You're live.
                </p>
              </div>
              <div className="step-card">
                <div className="step-num">4</div>
                <h3>Grow when you're ready</h3>
                <p>
                  Reports, day book, GST summaries. Add CRM for leads and HRM for payroll whenever you need.
                  <strong>One platform that scales with you.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/*  Extra SEO content  */}
        <section className="ub-band-white ub-reveal-section">
          <div className="container seo-grid">
            <div className="seo-panel">
              <h3>Deep focus on billing and inventory.</h3>
              <p>
                The strongest part of UdyogBill is its <strong>billing and inventory
                engine</strong>. Set up item groups, units, purchase price, MRP, selling
                price and tax once, and every invoice or purchase keeps stock and
                valuation in sync automatically.
              </p>
              <p>
                Day book, sales and purchase registers, stock summary and item or
                customer level sales reports give you a <strong>complete view of the
                business</strong>. Your CA also gets clean, ready-to-use data for GST
                filings and audits.
              </p>
              <ul className="seo-list">
                <li>GST-ready sales / purchase register</li>
                <li>Closing stock with valuation &amp; ageing</li>
                <li>Item and party-wise margin analysis</li>
                <li>Godown-wise stock &amp; transfer tracking</li>
                <li>Round-off, discount, freight auto handling</li>
              </ul>
            </div>
            <div className="seo-panel">
              <h3>CRM and HRM that support billing instead of distracting from it.</h3>
              <p>
                You do not need a heavy, separate CRM or HR suite. UdyogBill includes
                the <strong>essential CRM and HRM capabilities</strong> that make day-to-day
                work easier without overwhelming your team.
              </p>
              <p>
                Track enquiries, quotations, follow-ups and status while always seeing
                billing and payment history for each contact. In HRM, you maintain
                a simple employee master, attendance, leave and salary summaries so
                payroll stays transparent and accurate.
              </p>
              <ul className="seo-list">
                <li>Lead / enquiry list with follow-up date</li>
                <li>Customer ledger and CRM notes in one place</li>
                <li>Employee records with department &amp; role</li>
                <li>Attendance &amp; leave tracking for payroll</li>
                <li>HR and payroll reports synced with billing</li>
              </ul>
            </div>
          </div>
        </section>

        {/*  For CAs & businesses  */}
        <section id="for-cas" className="ca-section ub-band-cream ub-reveal-section">
          <div className="container">
            <div className="section-heading">
              <div className="section-eyebrow">For professionals</div>
              <h2 className="section-title">Clean books. Happy CAs. <span className="title-accent">Zero last-minute scrambles.</span></h2>
              <p className="section-subtitle">
                CAs: get <strong>GST-ready registers and reports</strong> from your clients.
                Business owners: give your CA <strong>audit-ready data</strong>  - not messy
                spreadsheets. Everyone wins.
              </p>
            </div>
            <div className="ca-grid">
              <div className="ca-card orange">
                <div className="ca-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg></div>
                <h3>For chartered accountants and tax practitioners</h3>
                <p>
                  Your clients get <strong>GST-compliant billing software</strong> that keeps books in order.
                  You get reports that make filing and audits straightforward.
                </p>
                <ul>
                  <li>GST sales and purchase register ready for GSTR-1 and GSTR-3B</li>
                  <li>Closing stock with valuation and ageing for annual returns</li>
                  <li>Item-wise and party-wise margin and profit analysis</li>
                  <li>Day book and trial balance style views for reconciliation</li>
                  <li>Excel and PDF export so you can work in your preferred tools</li>
                </ul>
              </div>
              <div className="ca-card">
                <div className="ca-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></svg></div>
                <h3>For retailers, distributors and manufacturers</h3>
                <p>
                  One <strong>billing and inventory management</strong> system for daily operations and
                  year-end compliance. No duplicate data entry or last-minute spreadsheet fixes.
                </p>
                <ul>
                  <li>Single source of truth for invoices, stock, receivables and payables</li>
                  <li>Multi-godown and multi-location stock with transfer tracking</li>
                  <li>Customer and supplier ledgers with ageing and payment history</li>
                  <li>CRM for enquiries and follow-ups; HRM for attendance and payroll</li>
                  <li>Role-based users so staff see only what they need</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/*  SEO long-form: GST billing software guide (card layout)  */}
        <section id="learn" className="seo-long-section ub-band-white ub-reveal-section">
          <div className="container">
            <div className="section-heading">
              <div className="section-eyebrow">Learn</div>
              <h2 className="section-title">GST billing and inventory software <span className="title-accent">for Indian businesses</span></h2>
              <p className="section-subtitle">
                One platform for invoicing, stock, CRM and HRM. Built for how Indian SMEs actually work.
              </p>
            </div>
            <div className="learn-cards">
              <div className="learn-card intro">
                <h3>Why UdyogBill?</h3>
                <p>
                  <strong>UdyogBill</strong> is <strong>GST billing</strong> and <strong>inventory
                  software</strong> for Indian SMEs: retailers, wholesalers, distributors, manufacturers
                  and service providers. It brings <strong>invoicing</strong>, <strong>stock tracking</strong>,
                  <strong>CRM</strong> and <strong>HRM (attendance, leave, payroll)</strong> into one place  -
                  so you stay compliant and in control without juggling multiple tools.
                </p>
              </div>

              <div className="learn-card">
                <h3>What you get with billing and inventory software</h3>
                <p>
                  Create <strong>GST invoices</strong> in seconds. Keep real-time stock across locations.
                  Give your CA reports they can use. UdyogBill does it all: tax invoices, bills of supply,
                  quotations and delivery challans with automatic <strong>CGST</strong>, <strong>SGST</strong>
                  and <strong>IGST</strong>. Stock updates with every sale and purchase; you get
                  <strong>low stock alerts</strong>, <strong>godown-wise stock</strong> and item-wise
                  margin reports. Simple, role-based screens  - no accounting degree needed.
                </p>
              </div>

              <div className="learn-card">
                <h3>Retail billing and wholesale billing</h3>
                <p>
                  <strong>Retail billing</strong> for a single counter or <strong>wholesale billing</strong>
                  with party-wise rates and bulk orders  - both in one tool. Retailers: fast billing,
                  barcode support, multiple payment modes, daily sales summary. Wholesalers: customer-wise
                  pricing, route-wise sales, credit limits and strong <strong>sales and purchase reports</strong>.
                  One software from a small shop to multi-location trade, with <strong>inventory
                  management</strong> in sync across godowns.
                </p>
              </div>

              <div className="learn-card">
                <h3>CRM and HRM alongside billing</h3>
                <p>
                  More than <strong>billing software</strong>: built-in <strong>CRM</strong> for leads,
                  enquiries, quotations and follow-ups, and <strong>HRM</strong> for employee master,
                  attendance, leave and payroll. One login. CRM links to your customer ledger so billing
                  and follow-ups sit together. HRM keeps staff and payroll aligned with the same business.
                  Fewer logins, cleaner data  - a practical <strong>all-in-one</strong> for Indian businesses.
                </p>
              </div>

              <div className="learn-card">
                <h3>Reports, GST filing and compliance</h3>
                <p>
                  <strong>GST reports</strong>, day book, sales and purchase registers, stock summary and
                  profit analysis  - all built in. Export to Excel or PDF for your <strong>CA</strong> or for
                  <strong>GSTR-1</strong>, <strong>GSTR-3B</strong> and annual returns. <strong>Closing stock
                  with valuation</strong>, audit trails and role-based access. Regular backups keep your
                  <strong>billing and inventory</strong> data safe and audit-ready.
                </p>
              </div>

              <div className="learn-card">
                <h3>Invoice formats: thermal, A4 and your brand</h3>
                <p>
                  Multiple <strong>invoice formats</strong>: <strong>GST tax invoice</strong>, <strong>bill of
                  supply</strong>, <strong>quotation</strong>, <strong>proforma</strong>, <strong>delivery
                  challan</strong>, <strong>credit or debit note</strong>. Print <strong>thermal</strong> at
                  the counter or <strong>A4</strong> for files. Add your logo and customise fields. See
                  sample formats in the section below.
                </p>
              </div>

              <div className="learn-card">
                <h3>Solutions by industry &amp; use case</h3>
                <p>
                  Explore dedicated guides:
                  <a href="/gst-billing-software">GST billing software</a>,
                  <a href="/retail-billing-software">retail billing</a>,
                  <a href="/wholesale-billing-software">wholesale billing</a>,
                  <a href="/pharmacy-billing-software">pharmacy billing</a>,
                  <a href="/restaurant-pos-billing-software">restaurant POS</a>,
                  <a href="/inventory-management-software-india">inventory management</a>,
                  <a href="/crm-for-small-business-india">CRM for SMEs</a>,
                  <a href="/payroll-software-for-small-business-india">payroll software</a>,
                  <a href="/e-invoicing-software-india">e-invoicing</a>, and
                  <a href="/hsn-sac-code-guide">HSN/SAC guide</a>.
                </p>
              </div>

              <div className="learn-card">
                <h3>Who can use UdyogBill?</h3>
                <p>
                  <strong>Retail</strong> and <strong>wholesale</strong> billing, <strong>pharmacy and
                  medical</strong>, <strong>electronics and mobile</strong>, <strong>hardware and building
                  material</strong>, <strong>service providers and agencies</strong>, <strong>small
                  manufacturers</strong>. If you issue invoices, manage stock or track dues, one
                  <strong>Indian billing software</strong> can grow with you.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/*  Invoice formats – demo snapshots (add your images here)  */}
        <section id="invoice-formats" className="invoice-formats-section ub-band-cream ub-reveal-section">
          <div className="container">
            <div className="section-heading">
              <div className="section-eyebrow">Invoice formats</div>
              <h2 className="section-title">Every format you need. <span className="title-accent">One click away.</span></h2>
              <p className="section-subtitle">
                Tax invoice, bill of supply, quotation, proforma, delivery challan, credit note.
                <strong>Thermal</strong> for the counter. <strong>A4</strong> for the file. Your logo,
                your fields. See sample snapshots below  - then make them yours.
              </p>
            </div>
            <div className="invoice-formats-grid">
              <div className="invoice-format-slot">
                <h3 className="invoice-format-title">GST Tax Invoice</h3>
                <div className="invoice-format-placeholder">
                  <img src="/img/invoices/gst-tax-invoice.svg" alt="GST Tax Invoice sample" width="400" height="520" loading="lazy" decoding="async" />
                </div>
              </div>
              <div className="invoice-format-slot">
                <h3 className="invoice-format-title">Bill of Supply</h3>
                <div className="invoice-format-placeholder">
                  <img src="/img/invoices/bill-of-supply.svg" alt="Bill of Supply sample" width="400" height="520" loading="lazy" decoding="async" />
                </div>
              </div>
              <div className="invoice-format-slot">
                <h3 className="invoice-format-title">Quotation</h3>
                <div className="invoice-format-placeholder">
                  <img src="/img/invoices/quotation.svg" alt="Quotation sample" width="400" height="520" loading="lazy" decoding="async" />
                </div>
              </div>
              <div className="invoice-format-slot">
                <h3 className="invoice-format-title">Proforma Invoice</h3>
                <div className="invoice-format-placeholder">
                  <img src="/img/invoices/proforma-invoice.svg" alt="Proforma Invoice sample" width="400" height="520" loading="lazy" decoding="async" />
                </div>
              </div>
              <div className="invoice-format-slot">
                <h3 className="invoice-format-title">Delivery Challan</h3>
                <div className="invoice-format-placeholder">
                  <img src="/img/invoices/delivery-challan.svg" alt="Delivery Challan sample" width="400" height="520" loading="lazy" decoding="async" />
                </div>
              </div>
              <div className="invoice-format-slot">
                <h3 className="invoice-format-title">Credit / Debit Note</h3>
                <div className="invoice-format-placeholder">
                  <img src="/img/invoices/credit-debit-note.svg" alt="Credit Debit Note sample" width="400" height="520" loading="lazy" decoding="async" />
                </div>
              </div>
              <div className="invoice-format-slot">
                <h3 className="invoice-format-title">Thermal (80mm / 58mm)</h3>
                <div className="invoice-format-placeholder">
                  <img src="/img/invoices/thermal-invoice.svg" alt="Thermal invoice sample" width="400" height="520" loading="lazy" decoding="async" />
                </div>
              </div>
              <div className="invoice-format-slot">
                <h3 className="invoice-format-title">A4 Formal</h3>
                <div className="invoice-format-placeholder">
                  <img src="/img/invoices/a4-invoice.svg" alt="A4 invoice sample" width="400" height="520" loading="lazy" decoding="async" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/*  FAQ  */}
        <section id="faq" className="faq-section ub-section-compact ub-band-white ub-reveal-section">
          <div className="container">
            <div className="section-heading">
              <div className="section-eyebrow">FAQ</div>
              <h2 className="section-title">Questions? <span className="title-accent">We've got answers.</span></h2>
              <p className="section-subtitle">
                The stuff people ask before they switch  - all in one place.
                Can't find yours? Reach out. We reply within a business day.
              </p>
            </div>

            <div className="faq-grid">
              <div className="faq-intro">
                <div className="card-3d">
                  <p>
                    Built for <strong>Indian businesses</strong>  - shops, distributors, manufacturers, service providers.
                    No ERP jargon. Just clear screens and workflows that get you from "I need an invoice"
                    to "done" in seconds.
                  </p>
                  <p>
                    We'll help you move your data, set up your masters, and train your team.
                    So switching feels like an upgrade  - not a headache.
                  </p>
                  <p>
                    <strong>Below:</strong> the questions we hear most. Click to expand. Still stuck? Contact us.
                  </p>
                </div>
              </div>
              <div className="faq-items">
                <div className="faq-item">
                  <div className="faq-q">Is UdyogBill suitable for my type of business?</div>
                  <div className="faq-a">
                    Yes. Retail shops, supermarkets, wholesalers, distributors, pharmacies,
                    hardware and electronics stores, service agencies and small
                    manufacturers all use UdyogBill successfully. You can configure
                    units, GST, discounts, locations and invoice formats to match
                    your exact workflow.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Do I need an accounting background to use it?</div>
                  <div className="faq-a">
                    No. The screens are designed around everyday concepts like sales,
                    purchases, dues, payments and stock. Complex accounting entries
                    and tax calculations are handled automatically in the background.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">How do CRM and HRM help my business?</div>
                  <div className="faq-a">
                    The CRM module lets you capture enquiries, manage quotations and
                    schedule follow-ups so potential sales are not missed. HRM keeps
                    employee details, attendance, leave and salary summaries in one
                    place so payroll and approvals stay clear and auditable.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Is my data secure and backed up?</div>
                  <div className="faq-a">
                    Yes. Your data is stored on secure cloud infrastructure with
                    regular backups. Role-based access ensures each user only sees
                    the information they need, and additional Excel exports remain
                    fully under your control.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">What happens after the free trial?</div>
                  <div className="faq-a">
                    During the 14-day free trial you can see whether you need only
                    billing and inventory or the CRM and HRM modules as well. Our
                    team will review your use case and recommend a plan without
                    any pressure or hidden charges.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">What invoice formats does UdyogBill support?</div>
                  <div className="faq-a">
                    UdyogBill supports <strong>GST tax invoice</strong>, <strong>bill of supply</strong>,
                    <strong>quotation</strong>, <strong>proforma invoice</strong>, <strong>delivery challan</strong>
                    and <strong>credit or debit note</strong>. You can print in <strong>thermal (80mm / 58mm)</strong>
                    for counter billing or <strong>A4</strong> for formal copies. Each format is GST-compliant
                    with auto calculation of CGST, SGST and IGST.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Can I use UdyogBill for multiple branches or godowns?</div>
                  <div className="faq-a">
                    Yes. You can manage <strong>multiple godowns or locations</strong> and track stock
                    separately for each. Transfer stock between godowns with a few clicks. Reports show
                    location-wise stock and valuation so you always know what is where.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Can I import data from my existing software or Excel?</div>
                  <div className="faq-a">
                    Yes. Our onboarding team can help you <strong>import items, customers, opening stock
                    and other masters</strong> from Excel or from your previous billing or inventory
                    software. This reduces manual data entry and helps you go live faster.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Is UdyogBill suitable for multiple users and roles?</div>
                  <div className="faq-a">
                    Yes. You can add <strong>multiple users</strong> and assign <strong>role-based
                    access</strong> so each person sees only what they need  - for example billing, stock
                    view, reports or admin. This keeps data secure and avoids unauthorised changes.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Do you offer support and training?</div>
                  <div className="faq-a">
                    Yes. We provide <strong>onboarding support</strong>, <strong>data migration help</strong>
                    and <strong>training</strong> so your team can start using the software confidently.
                    Support is available so you can resolve queries quickly and keep your billing and
                    inventory running smoothly.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Can I manage more than one company in UdyogBill?</div>
                  <div className="faq-a">
                    Yes. UdyogBill supports <strong>multi-company</strong> setup. You can manage
                    billing, inventory and reports for different businesses or entities from one
                    login and switch between them as needed.
                  </div>
                  <div className="faq-toggle">
                    <span className="faq-toggle-icon">&gt;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/*  CTA / contact  */}
        <section className="cta-corp ub-section-spacious" id="contact">
          <style>{`
            .cta-corp { padding: 4rem 0; background: #f1f5f9; }
            .cta-corp__wrap { max-width: 1040px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1.05fr; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(15,23,42,.12); background: #fff; }
            .cta-corp__left { background: linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%); color: #f8fafc; padding: 2.5rem 2.25rem; display: flex; flex-direction: column; justify-content: center; }
            .cta-corp__tag { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #86efac; background: rgba(22,163,74,.15); border: 1px solid rgba(134,239,172,.3); padding: 4px 10px; border-radius: 999px; margin-bottom: 14px; width: fit-content; }
            .cta-corp__title { margin: 0 0 12px; font-size: clamp(1.5rem, 2vw + 1rem, 2rem); font-weight: 800; line-height: 1.2; letter-spacing: -.02em; }
            .cta-corp__text { margin: 0 0 24px; font-size: .95rem; line-height: 1.65; color: #cbd5e1; max-width: 38ch; }
            .cta-corp__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
            .cta-corp__list li { display: flex; align-items: center; gap: 10px; font-size: .9rem; color: #e2e8f0; }
            .cta-corp__tick { width: 20px; height: 20px; border-radius: 50%; background: #16a34a; flex-shrink: 0; position: relative; }
            .cta-corp__tick::after { content: ""; position: absolute; left: 7px; top: 4px; width: 5px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
            .cta-corp__right { padding: 2rem 2rem 1.75rem; }
            .cta-corp__form-title { margin: 0 0 4px; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
            .cta-corp__form-sub { margin: 0 0 20px; font-size: .85rem; color: #64748b; }
            .cta-corp__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .cta-corp__field { margin-bottom: 14px; }
            .cta-corp__field label { display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 5px; }
            .cta-corp__field input, .cta-corp__field select, .cta-corp__field textarea { width: 100%; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; font-size: 14px; font-family: inherit; color: #0f172a; background: #fff; transition: border-color .15s, box-shadow .15s; }
            .cta-corp__field input:focus, .cta-corp__field select:focus, .cta-corp__field textarea:focus { outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.12); }
            .cta-corp__field textarea { resize: vertical; min-height: 72px; }
            .cta-corp__opt { font-weight: 400; color: #94a3b8; }
            .cta-corp__submit { width: 100%; border: 0; border-radius: 8px; padding: 12px 16px; font-size: 15px; font-weight: 700; color: #fff; background: #16a34a; cursor: pointer; margin-top: 4px; transition: background .15s; }
            .cta-corp__submit:hover { background: #15803d; }
            .cta-corp__submit:disabled { opacity: .6; cursor: not-allowed; }
            .cta-corp__msg { min-height: 18px; margin: 8px 0 0; font-size: 13px; }
            .cta-corp__msg.is-error { color: #dc2626; }
            .cta-corp__msg.is-success { color: #15803d; }
            .cta-corp__sep { display: flex; align-items: center; gap: 12px; margin: 16px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
            .cta-corp__sep::before, .cta-corp__sep::after { content: ""; flex: 1; height: 1px; background: #e2e8f0; }
            .cta-corp__trial { display: block; width: 100%; box-sizing: border-box; text-align: center; padding: 12px 16px; border-radius: 8px; font-size: 15px; font-weight: 700; color: #ea580c; background: #fff; border: 2px solid #fed7aa; text-decoration: none; transition: background .15s, border-color .15s; }
            .cta-corp__trial:hover { background: #fff7ed; border-color: #fdba74; color: #c2410c; text-decoration: none; }
            .cta-corp__foot { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #f1f5f9; }
            .cta-corp__foot span { font-size: 12px; color: #64748b; display: inline-flex; align-items: center; gap: 5px; }
            .cta-corp__foot a { color: #0f172a; font-weight: 700; text-decoration: none; }
            .cta-corp__foot a:hover { color: #16a34a; }
            .cta-corp__dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; flex-shrink: 0; }
            @media (max-width: 768px) {
              .cta-corp__wrap { grid-template-columns: 1fr; }
              .cta-corp__left { padding: 2rem 1.5rem; }
              .cta-corp__right { padding: 1.5rem; }
              .cta-corp__row { grid-template-columns: 1fr; }
            }
          `}</style>
          <div className="container">
            <div className="cta-corp__wrap">
              <div className="cta-corp__left" style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)", color: "#f8fafc" }}>
                <span className="cta-corp__tag" style={{ color: "#86efac", background: "rgba(22,163,74,.2)", borderColor: "rgba(134,239,172,.4)" }}>Get started</span>
                <h2 className="cta-corp__title" style={{ color: "#ffffff" }}>Ready to run billing without the chaos?</h2>
                <p className="cta-corp__text" style={{ color: "#cbd5e1" }}>
                  Share your details and our team will help you set up GST billing,
                  stock and reports - usually within one business day.
                </p>
                <ul className="cta-corp__list">
                  <li style={{ color: "#f1f5f9" }}><span className="cta-corp__tick" aria-hidden="true"></span>14-day free trial, no credit card</li>
                  <li style={{ color: "#f1f5f9" }}><span className="cta-corp__tick" aria-hidden="true"></span>GST invoices, inventory and reports</li>
                  <li style={{ color: "#f1f5f9" }}><span className="cta-corp__tick" aria-hidden="true"></span>Free onboarding and data import help</li>
                </ul>
              </div>
              <div className="cta-corp__right">
                <h3 className="cta-corp__form-title">Request a free demo</h3>
                <p className="cta-corp__form-sub">Fill in your details. We will call or WhatsApp you shortly.</p>
                <form id="ub-home-contact-form" noValidate onSubmit={handleSubmit}>
                  <input type="text" name="website_url" className="ub-lead-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ "position": "absolute", "left": "-9999px", "opacity": "0" }} />
                  <input type="hidden" name="source" value="homepage_contact" />
                  <div className="cta-corp__row">
                    <div className="cta-corp__field">
                      <label htmlFor="ub-home-name">Full name</label>
                      <input id="ub-home-name" name="name" type="text" required maxLength={255} placeholder="Your name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                    <div className="cta-corp__field">
                      <label htmlFor="ub-home-mobile">Mobile number</label>
                      <input id="ub-home-mobile" name="mobile" type="tel" required maxLength={10} pattern="[0-9]{10}" inputMode="numeric" placeholder="10-digit number" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value.replace(/\D/g, "").slice(0,10)})} />
                    </div>
                  </div>
                  <div className="cta-corp__field">
                    <label htmlFor="ub-home-type">Business type</label>
                    <select id="ub-home-type" name="business_type" required value={form.businessType} onChange={e => setForm({...form, businessType: e.target.value})}>
                      <option value="">Select type</option>
                      <option value="retail">Retail Shop</option>
                      <option value="wholesale">Wholesale &amp; Distribution</option>
                      <option value="pharma">Pharmacy &amp; Medical</option>
                      <option value="supermarket">Supermarket &amp; Grocery</option>
                      <option value="garments">Garments &amp; Footwear</option>
                      <option value="hardware">Hardware &amp; Building Material</option>
                      <option value="manufacturing">Small Manufacturing</option>
                      <option value="services">Service &amp; AMC</option>
                      <option value="other">Other Business</option>
                    </select>
                  </div>
                  <div className="cta-corp__field">
                    <label htmlFor="ub-home-message">Message <span className="cta-corp__opt">(optional)</span></label>
                    <textarea id="ub-home-message" name="message" rows={2} maxLength={2000} placeholder="Tell us about your business needs" value={form.message} onChange={e => setForm({...form, message: e.target.value})}></textarea>
                  </div>
                  <button type="submit" className="cta-corp__submit">Request free demo</button>
                  <p className={`cta-corp__msg ${msg?.isError ? "is-error" : "is-success"}`} id="ub-home-contact-msg" role="status">{msg?.text}</p>
                </form>
                <div className="cta-corp__sep" aria-hidden="true"><span>or</span></div>
                <Link href="/register" className="cta-corp__trial">Start free trial yourself</Link>
                <div className="cta-corp__foot">
                  <span><span className="cta-corp__dot" aria-hidden="true"></span> Call: <a href="tel:+919473807622">9473807622</a></span>
                  <span><span className="cta-corp__dot" aria-hidden="true"></span> No charge during trial</span>
                  <span><span className="cta-corp__dot" aria-hidden="true"></span> Reply within 1 business day</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      </div>

      {/* Site Footer */}
      <footer className="footer" style={{
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        backgroundColor: "#0f172a",
        color: "#94a3b8",
        position: "relative",
        zIndex: 10,
        display: "block",
        padding: "0"
      }}>
        <div className="container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem" }}>
          <div className="footer-cta-strip" style={{
            padding: "2rem 0",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.25rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <p style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc", fontWeight: 600 }}>
              Ready to streamline billing, stock &amp; GST compliance for your business?
            </p>
            <div>
              <Link href="/register" className="btn btn-primary" style={{
                display: "inline-block",
                padding: "0.6rem 1.4rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#ffffff",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                borderRadius: "8px",
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(249, 115, 22, 0.35)"
              }}>
                Start 14-Day Free Trial →
              </Link>
            </div>
          </div>

          <div className="footer-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "2.5rem 2rem",
            padding: "3.5rem 0 2.5rem"
          }}>
            <div className="footer-brand">
              <div className="brand" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                <img src="/logo.png" alt="UdyogBill" style={{ height: "46px", width: "auto", background: "#ffffff", padding: "4px 8px", borderRadius: "8px" }} onError={(e: any) => { e.target.src = "/img/logo-small.png"; }} />
              </div>
              <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", lineHeight: "1.65", color: "#94a3b8", maxWidth: "34ch" }}>
                UdyogBill is a modern cloud GST billing, inventory management, CRM &amp; HRM platform crafted for Indian SMEs, retailers, distributors and manufacturers.
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: "1.6", color: "#cbd5e1" }}>
                <strong style={{ color: "#ffffff" }}>DigiOpera Private Limited</strong><br />
                Gurugram, Haryana, India
              </p>
            </div>

            <div>
              <h4 className="footer-nav-title" style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#f97316",
                margin: "0 0 1.25rem",
                borderBottom: "2px solid rgba(249, 115, 22, 0.4)",
                paddingBottom: "0.4rem",
                display: "inline-block"
              }}>Product</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <li><a href="#features" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>Features</a></li>
                <li><a href="#why" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>Why UdyogBill</a></li>
                <li><a href="#use-cases" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>Use Cases</a></li>
                <li><a href="#how" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>How It Works</a></li>
                <li><a href="#invoice-formats" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>Invoice Formats</a></li>
                <li><a href="#faq" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="footer-nav-title" style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#f97316",
                margin: "0 0 1.25rem",
                borderBottom: "2px solid rgba(249, 115, 22, 0.4)",
                paddingBottom: "0.4rem",
                display: "inline-block"
              }}>Guides &amp; Blog</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <li><Link href="/blog" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>All 280+ Articles</Link></li>
                <li><Link href="/blog/category/gst-invoicing" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>GST Invoicing Guides</Link></li>
                <li><Link href="/blog/category/pharmacy" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>Pharmacy &amp; Medical</Link></li>
                <li><Link href="/blog/category/retail" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>Retail &amp; Supermarket</Link></li>
                <li><Link href="/blog/category/hardware" style={{ color: "#cbd5e1", fontSize: "0.9rem", textDecoration: "none" }}>Hardware &amp; Building Material</Link></li>
              </ul>
            </div>

            <div className="footer-company-links">
              <h4 className="footer-nav-title" style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#f97316",
                margin: "0 0 1.25rem",
                borderBottom: "2px solid rgba(249, 115, 22, 0.4)",
                paddingBottom: "0.4rem",
                display: "inline-block"
              }}>Company &amp; Support</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                <li style={{ color: "#cbd5e1" }}>
                  Call: <a href="tel:+919473807622" style={{ color: "#ffffff", fontWeight: 700, textDecoration: "none" }}>+91 94738 07622</a>
                </li>
                <li style={{ color: "#cbd5e1" }}>
                  WhatsApp: <a href="https://wa.me/919473807622?text=Hi%2C%20UdyogBill%20ke%20baare%20mein%20jaanna%20chahta%20hoon" target="_blank" rel="noopener noreferrer" style={{ color: "#4ade80", fontWeight: 600, textDecoration: "none" }}>Chat with us</a>
                </li>
                <li style={{ color: "#cbd5e1" }}>
                  Email: <a href="mailto:support@udyogbill.com" style={{ color: "#ffffff", textDecoration: "none" }}>support@udyogbill.com</a>
                </li>
                <li style={{ color: "#94a3b8", fontSize: "0.82rem", lineHeight: "1.5" }}>
                  Landmark Cyber Park, Sector 67, Gurugram, Haryana – 122102
                </li>
                <li style={{ marginTop: "0.25rem", display: "flex", gap: "1rem" }}>
                  <Link href="/terms" style={{ color: "#cbd5e1", fontSize: "0.85rem", textDecoration: "none" }}>Terms &amp; Conditions</Link>
                  <Link href="/privacy" style={{ color: "#cbd5e1", fontSize: "0.85rem", textDecoration: "none" }}>Privacy Policy</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Native Android Mobile Apps Download Banner */}
          <div style={{
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.95))",
            border: "1px solid rgba(249, 115, 22, 0.25)",
            borderRadius: "16px",
            padding: "1.75rem 2rem",
            marginBottom: "2rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem"
          }}>
            <div style={{ maxWidth: "520px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(249, 115, 22, 0.15)", border: "1px solid rgba(249, 115, 22, 0.4)", borderRadius: "20px", padding: "0.25rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: "#f97316", marginBottom: "0.6rem" }}>
                <span>📱 100% Native Android Apps</span>
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff", margin: "0 0 0.4rem" }}>
                Download UdyogBill Mobile Apps (Direct APK)
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
                Do alag apps: Ek dukaan ke retail/wholesale GST billing ke liye aur doosra Medical Rep (MR) field force reporting ke liye jisme billing ka koi jhanjhat nahi.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              {/* Billing App Card */}
              <a
                href="/downloads/udyogbill-billing.apk"
                download="udyogbill-billing.apk"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "12px",
                  textDecoration: "none",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e: any) => e.currentTarget.style.borderColor = "#f97316"}
                onMouseOut={(e: any) => e.currentTarget.style.borderColor = "#334155"}
              >
                <div style={{ width: "42px", height: "42px", background: "linear-gradient(135deg, #f97316, #ea580c)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
                  🧾
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em" }}>Retail &amp; POS App</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffffff" }}>Download Billing APK</div>
                  <div style={{ fontSize: "0.7rem", color: "#4ade80", fontWeight: 600 }}>Android • Direct Download</div>
                </div>
              </a>

              {/* Pharma SFA App Card */}
              <a
                href="/downloads/udyogbill-sfa.apk"
                download="udyogbill-sfa.apk"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "12px",
                  textDecoration: "none",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e: any) => e.currentTarget.style.borderColor = "#10b981"}
                onMouseOut={(e: any) => e.currentTarget.style.borderColor = "#334155"}
              >
                <div style={{ width: "42px", height: "42px", background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
                  🩺
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em" }}>MR &amp; Field Force App</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffffff" }}>Download Pharma SFA APK</div>
                  <div style={{ fontSize: "0.7rem", color: "#4ade80", fontWeight: 600 }}>Pure Reporting • No Billing</div>
                </div>
              </a>
            </div>
          </div>

          {/* Local SEO Cities Row */}
          <div style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "1.25rem",
            paddingBottom: "1.25rem",
            fontSize: "0.82rem",
            color: "#94a3b8"
          }}>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#e2e8f0" }}>
              GST Billing Software by City:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem 1rem", color: "#cbd5e1" }}>
              <Link href="/city/delhi" style={{ color: "#cbd5e1", textDecoration: "none" }}>Delhi NCR</Link>
              <span>•</span>
              <Link href="/city/mumbai" style={{ color: "#cbd5e1", textDecoration: "none" }}>Mumbai</Link>
              <span>•</span>
              <Link href="/city/bengaluru" style={{ color: "#cbd5e1", textDecoration: "none" }}>Bengaluru</Link>
              <span>•</span>
              <Link href="/city/lucknow" style={{ color: "#cbd5e1", textDecoration: "none" }}>Lucknow</Link>
              <span>•</span>
              <Link href="/city/kanpur" style={{ color: "#cbd5e1", textDecoration: "none" }}>Kanpur</Link>
              <span>•</span>
              <Link href="/city/varanasi" style={{ color: "#cbd5e1", textDecoration: "none" }}>Varanasi</Link>
              <span>•</span>
              <Link href="/city/jaipur" style={{ color: "#cbd5e1", textDecoration: "none" }}>Jaipur</Link>
              <span>•</span>
              <Link href="/city/ahmedabad" style={{ color: "#cbd5e1", textDecoration: "none" }}>Ahmedabad</Link>
              <span>•</span>
              <Link href="/city/indore" style={{ color: "#cbd5e1", textDecoration: "none" }}>Indore</Link>
              <span>•</span>
              <Link href="/city/patna" style={{ color: "#cbd5e1", textDecoration: "none" }}>Patna</Link>
              <span>•</span>
              <Link href="/city/surat" style={{ color: "#cbd5e1", textDecoration: "none" }}>Surat</Link>
              <span>•</span>
              <Link href="/city/pune" style={{ color: "#cbd5e1", textDecoration: "none" }}>Pune</Link>
              <span>•</span>
              <Link href="/city/agra" style={{ color: "#cbd5e1", textDecoration: "none" }}>Agra</Link>
              <span>•</span>
              <Link href="/city/ludhiana" style={{ color: "#cbd5e1", textDecoration: "none" }}>Ludhiana</Link>
              <span>•</span>
              <Link href="/city/chandigarh" style={{ color: "#cbd5e1", textDecoration: "none" }}>Chandigarh</Link>
              <span>•</span>
              <Link href="/city/meerut" style={{ color: "#cbd5e1", textDecoration: "none" }}>Meerut</Link>
              <span>•</span>
              <Link href="/city/rajkot" style={{ color: "#cbd5e1", textDecoration: "none" }}>Rajkot</Link>
              <span>•</span>
              <Link href="/city/vadodara" style={{ color: "#cbd5e1", textDecoration: "none" }}>Vadodara</Link>
              <span>•</span>
              <Link href="/city/bhopal" style={{ color: "#cbd5e1", textDecoration: "none" }}>Bhopal</Link>
              <span>•</span>
              <Link href="/city/ghaziabad" style={{ color: "#cbd5e1", textDecoration: "none" }}>Ghaziabad</Link>
              <span>•</span>
              <Link href="/city/hyderabad" style={{ color: "#cbd5e1", textDecoration: "none" }}>Hyderabad</Link>
              <span>•</span>
              <Link href="/city/kolkata" style={{ color: "#cbd5e1", textDecoration: "none" }}>Kolkata</Link>
              <span>•</span>
              <Link href="/city/chennai" style={{ color: "#cbd5e1", textDecoration: "none" }}>Chennai</Link>
              <span>•</span>
              <Link href="/city/coimbatore" style={{ color: "#cbd5e1", textDecoration: "none" }}>Coimbatore</Link>
              <span>•</span>
              <Link href="/city/nagpur" style={{ color: "#cbd5e1", textDecoration: "none" }}>Nagpur</Link>
              <span>•</span>
              <Link href="/city/raipur" style={{ color: "#cbd5e1", textDecoration: "none" }}>Raipur</Link>
              <span>•</span>
              <Link href="/city/ranchi" style={{ color: "#cbd5e1", textDecoration: "none" }}>Ranchi</Link>
              <span>•</span>
              <Link href="/city/bhubaneswar" style={{ color: "#cbd5e1", textDecoration: "none" }}>Bhubaneswar</Link>
              <span>•</span>
              <Link href="/city/kochi" style={{ color: "#cbd5e1", textDecoration: "none" }}>Kochi</Link>
              <span>•</span>
              <Link href="/city/visakhapatnam" style={{ color: "#cbd5e1", textDecoration: "none" }}>Visakhapatnam</Link>
              <span>•</span>
              <Link href="/city/jodhpur" style={{ color: "#cbd5e1", textDecoration: "none" }}>Jodhpur</Link>
              <span>•</span>
              <Link href="/city/amritsar" style={{ color: "#cbd5e1", textDecoration: "none" }}>Amritsar</Link>
              <span>•</span>
              <Link href="/city/gorakhpur" style={{ color: "#cbd5e1", textDecoration: "none" }}>Gorakhpur</Link>
              <span>•</span>
              <Link href="/city/gwalior" style={{ color: "#cbd5e1", textDecoration: "none" }}>Gwalior</Link>
              <span>•</span>
              <Link href="/city/jabalpur" style={{ color: "#cbd5e1", textDecoration: "none" }}>Jabalpur</Link>
              <span>•</span>
              <Link href="/city/prayagraj" style={{ color: "#cbd5e1", textDecoration: "none" }}>Prayagraj</Link>
              <span>•</span>
              <Link href="/city/bareilly" style={{ color: "#cbd5e1", textDecoration: "none" }}>Bareilly</Link>
              <span>•</span>
              <Link href="/city/aligarh" style={{ color: "#cbd5e1", textDecoration: "none" }}>Aligarh</Link>
              <span>•</span>
              <Link href="/city/moradabad" style={{ color: "#cbd5e1", textDecoration: "none" }}>Moradabad</Link>
              <span>•</span>
              <Link href="/city/jalandhar" style={{ color: "#cbd5e1", textDecoration: "none" }}>Jalandhar</Link>
              <span>•</span>
              <Link href="/city/vijayawada" style={{ color: "#cbd5e1", textDecoration: "none" }}>Vijayawada</Link>
              <span>•</span>
              <Link href="/city/madurai" style={{ color: "#cbd5e1", textDecoration: "none" }}>Madurai</Link>
              <span>•</span>
              <Link href="/city/nashik" style={{ color: "#cbd5e1", textDecoration: "none" }}>Nashik</Link>
              <span>•</span>
              <Link href="/city/aurangabad" style={{ color: "#cbd5e1", textDecoration: "none" }}>Aurangabad</Link>
              <span>•</span>
              <Link href="/city/dehradun" style={{ color: "#cbd5e1", textDecoration: "none" }}>Dehradun</Link>
              <span>•</span>
              <Link href="/city/jamshedpur" style={{ color: "#cbd5e1", textDecoration: "none" }}>Jamshedpur</Link>
              <span>•</span>
              <Link href="/city/guwahati" style={{ color: "#cbd5e1", textDecoration: "none" }}>Guwahati</Link>
              <span>•</span>
              <Link href="/city/dhanbad" style={{ color: "#cbd5e1", textDecoration: "none" }}>Dhanbad</Link>
              <span>•</span>
              <Link href="/city/mirzapur" style={{ color: "#cbd5e1", textDecoration: "none" }}>Mirzapur</Link>
              <span>•</span>
              <Link href="/city/jammu" style={{ color: "#cbd5e1", textDecoration: "none" }}>Jammu</Link>
            </div>
          </div>

          <div className="footer-bottom" style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "1.5rem 0 2rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            fontSize: "0.85rem",
            color: "#94a3b8"
          }}>
            <p style={{ margin: 0 }}>© {new Date().getFullYear()} UdyogBill (DigiOpera Private Limited). All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Structured Data: Organization, WebSite, SoftwareApplication, FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://udyogbill.com/#organization",
                "name": "UdyogBill",
                "legalName": "DigiOpera Private Limited",
                "url": "https://udyogbill.com",
                "logo": "https://udyogbill.com/logo.png",
                "sameAs": [],
                "contactPoint": {
                  "@type": "ContactPoint",
                  "telephone": "+91-9473807622",
                  "contactType": "customer service",
                  "areaServed": "IN",
                  "availableLanguage": ["Hindi", "English"]
                },
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "Landmark Cyber Park, Sector 67",
                  "addressLocality": "Gurugram",
                  "addressRegion": "Haryana",
                  "postalCode": "122102",
                  "addressCountry": "IN"
                }
              },
              {
                "@type": "WebSite",
                "@id": "https://udyogbill.com/#website",
                "url": "https://udyogbill.com",
                "name": "UdyogBill",
                "publisher": {
                  "@id": "https://udyogbill.com/#organization"
                }
              },
              {
                "@type": "SoftwareApplication",
                "@id": "https://udyogbill.com/#software",
                "name": "UdyogBill",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web, Windows, Android",
                "offers": {
                  "@type": "Offer",
                  "price": "399",
                  "priceCurrency": "INR"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.9",
                  "reviewCount": "1250"
                }
              },
              {
                "@type": "FAQPage",
                "@id": "https://udyogbill.com/#faq",
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": "What invoice formats does UdyogBill support?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "UdyogBill supports GST tax invoice, bill of supply, quotation, proforma invoice, delivery challan and credit or debit note in thermal (80mm / 58mm) and A4 formats."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "Can I use UdyogBill for multiple branches or godowns?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Yes. You can manage multiple godowns or locations and track stock separately for each. Transfer stock between godowns with a few clicks."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "Can I import data from my existing software or Excel?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Yes. Our onboarding team helps you import items, customers, opening stock and other masters from Excel or your previous software."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "Is UdyogBill suitable for multiple users and roles?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Yes. You can add multiple users and assign role-based access so each person sees only what they need."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "Is my data secure and backed up?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Yes. Your data is stored on secure cloud infrastructure with regular backups and role-based security access."
                    }
                  }
                ]
              }
            ]
          })
        }}
      />
    </div>
  );
}
