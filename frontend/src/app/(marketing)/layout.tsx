"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  X, Menu, MessageCircle, Phone, ArrowRight,
  CheckCircle, Loader2
} from "lucide-react";
import { initAttribution, getAttributionData, detectIndustryCode } from "@/lib/attribution";

function ContactPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", businessName: "", mobile: "", email: "",
    city: "", businessType: "", message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Naam zaroori hai";
    if (!form.businessName.trim()) e.businessName = "Business ka naam zaroori hai";
    if (!/^\d{10}$/.test(form.mobile)) e.mobile = "10 digit mobile number daalo";
    if (!form.email.includes("@")) e.email = "Sahi email daalo";
    if (!form.city.trim()) e.city = "Sheher ka naam zaroori hai";
    if (!form.businessType) e.businessType = "Business type chunna zaroori hai";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    const attr = getAttributionData();
    const industry = detectIndustryCode(window.location.pathname, form.businessType);
    try {
      await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050") + "/api/v1/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: "contact-popup",
          industryCode: industry,
          utmSource: attr.utmSource,
          utmMedium: attr.utmMedium,
          utmCampaign: attr.utmCampaign,
          landingPage: attr.landingPage || window.location.pathname,
          referrerUrl: attr.referrerUrl,
          searchKeyword: attr.searchKeyword,
          deviceType: attr.deviceType,
        }),
      });
    } catch {}
    setLoading(false);
    setSubmitted(true);
  };

  const businessTypes = [
    "Pharma Distributor", "FMCG Distributor", "Garment Shop",
    "Wholesale Business", "Retail Shop", "Bakery", "Manufacturing", "Other"
  ];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{animation:"slideUp 0.3s ease-out"}}>
        <div style={{background:"linear-gradient(135deg,#f97316,#16a34a)"}} className="p-6 rounded-t-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
          <h2 className="text-xl font-bold text-white" style={{fontFamily:"Poppins,sans-serif"}}>Free Demo Book Karo</h2>
          <p className="text-white/85 text-sm mt-1">Hum aapse <strong>24 ghante</strong> ke andar contact karenge 🙏</p>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:"#dcfce7"}}>
              <CheckCircle className="w-8 h-8" style={{color:"#16a34a"}} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2" style={{fontFamily:"Poppins,sans-serif"}}>Shukriya! 🙏</h3>
            <p className="text-gray-600 mb-4">Aapki request mil gayi. Hamari team aapse jaldi contact karegi.</p>
            <a href="https://wa.me/919473807622?text=Hi%2C%20UdyogBill%20ke%20baare%20mein%20jaanna%20chahta%20hoon"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-semibold"
              style={{background:"#25D366"}}>
              <MessageCircle className="w-4 h-4" /> WhatsApp pe Baat Karo
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Aapka Naam *</label>
              <input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="Jaise: Ramesh Gupta"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${errors.name?"border-red-400":"border-gray-300"}`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Business ka Naam *</label>
              <input type="text" value={form.businessName} onChange={e=>setForm(f=>({...f,businessName:e.target.value}))}
                placeholder="Jaise: Gupta Pharma Distributors"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${errors.businessName?"border-red-400":"border-gray-300"}`} />
              {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number *</label>
                <input type="tel" maxLength={10} value={form.mobile}
                  onChange={e=>setForm(f=>({...f,mobile:e.target.value.replace(/\D/g,"").slice(0,10)}))}
                  placeholder="10 digit number"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${errors.mobile?"border-red-400":"border-gray-300"}`} />
                {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                  placeholder="aap@gmail.com"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${errors.email?"border-red-400":"border-gray-300"}`} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sheher *</label>
                <input type="text" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}
                  placeholder="Jaise: Lucknow"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${errors.city?"border-red-400":"border-gray-300"}`} />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Type *</label>
                <select value={form.businessType} onChange={e=>setForm(f=>({...f,businessType:e.target.value}))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none ${errors.businessType?"border-red-400":"border-gray-300"}`}>
                  <option value="">Chuniye...</option>
                  {businessTypes.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                {errors.businessType && <p className="text-red-500 text-xs mt-1">{errors.businessType}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Koi Sawaal? (Optional)</label>
              <textarea rows={2} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))}
                placeholder="Aapka koi bhi sawaal ya requirement likh sakte hain..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none resize-none" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              style={{background: loading ? "#fb923c" : "#f97316", fontFamily:"Poppins,sans-serif"}}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? "Bhej rahe hain..." : "Free Demo Book Karo"}
            </button>
            <p className="text-center text-xs text-gray-400">📞 24 ghante ke andar call aayegi • Koi charge nahi</p>
          </form>
        )}
      </div>
    </div>
  );
}

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Industries", href: "/industries" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function Navbar({ onDemoClick }: { onDemoClick: () => void }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white shadow-lg" : "bg-white/95 backdrop-blur-md"}`}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="UdyogBill" className="h-10 w-auto object-contain" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${pathname === l.href ? "text-orange-600 bg-orange-50 font-bold" : "text-slate-700 hover:text-orange-600 hover:bg-slate-50"}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-bold text-slate-700 hover:text-orange-600 px-3 py-2 rounded-lg transition-colors">Login</Link>
          <button onClick={onDemoClick} className="text-sm font-bold text-white px-4 py-2 rounded-lg shadow-sm hover:brightness-105 transition-all" style={{background:"#16a34a"}}>
            📞 Free Demo
          </button>
          <Link href="/register" className="text-sm font-bold text-white px-4 py-2 rounded-lg shadow-sm hover:brightness-105 transition-all flex items-center gap-1" style={{background:"#f97316"}}>
            Free Trial <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg text-slate-800 hover:bg-slate-100">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-2 shadow-xl">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-lg text-sm font-semibold text-slate-800 hover:bg-orange-50 hover:text-orange-600">
              {l.label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMenuOpen(false)} className="text-center py-2.5 text-sm font-bold text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50">Login</Link>
            <button onClick={() => { setMenuOpen(false); onDemoClick(); }} className="py-2.5 text-sm font-bold text-white rounded-lg shadow-sm" style={{background:"#16a34a"}}>📞 Free Demo Book Karo</button>
            <Link href="/register" onClick={() => setMenuOpen(false)} className="text-center py-2.5 text-sm font-bold text-white rounded-lg shadow-sm" style={{background:"#f97316"}}>Free Trial Shuru Karo →</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer({ onDemoClick }: { onDemoClick: () => void }) {
  return (
    <footer style={{background:"#111827"}} className="text-gray-300">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div>
            <img src="/logo.png" alt="UdyogBill" className="h-11 w-auto object-contain mb-3 bg-white px-2 py-1 rounded-md" />
            <p className="text-sm text-gray-400 leading-relaxed mb-4">Har vyapar ka smart saathi. GST billing, stock management, aur reports — sab ek jagah.</p>
            <div className="flex gap-3">
              {["f","in","li","yt"].map(s=>(
                <a key={s} href="#" className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors" style={{background:"#1f2937"}}>{s}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4" style={{fontFamily:"Poppins,sans-serif"}}>Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[["Home","/"],["Features","/features"],["Pricing","/pricing"],["Blog","/blog"],["Industries","/industries"],["About Us","/about"],["Contact","/contact"]].map(([l,h])=>(
                <li key={h}><Link href={h} className="hover:text-orange-400 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4" style={{fontFamily:"Poppins,sans-serif"}}>Industries</h4>
            <ul className="space-y-2 text-sm">
              {[["Pharma Distributor","/industries/pharma"],["FMCG Distributor","/industries/fmcg"],["Garment Shop","/industries/garments"],["Wholesale Business","/industries/wholesale"],["Retail Shop","/industries/retail"],["Bakery","/industries/bakery"]].map(([l,h])=>(
                <li key={h}><Link href={h} className="hover:text-orange-400 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4" style={{fontFamily:"Poppins,sans-serif"}}>Hamare Baare Mein</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" style={{color:"#f97316"}} /><a href="tel:+919473807622" className="hover:underline">+91 94738 07622</a></li>
              <li className="flex items-center gap-2"><MessageCircle className="w-4 h-4" style={{color:"#25D366"}} /><a href="https://wa.me/919473807622?text=Hi%2C%20UdyogBill%20ke%20baare%20mein%20jaanna%20chahta%20hoon" target="_blank" rel="noopener noreferrer" className="hover:text-green-400">WhatsApp pe baat karo</a></li>
              <li className="text-gray-400 text-xs">support@udyogbill.com</li>
            </ul>
            <button onClick={onDemoClick} className="mt-4 w-full text-white text-sm font-bold py-2.5 rounded-lg transition-colors" style={{background:"#f97316"}}>Free Demo Book Karo</button>
          </div>
        </div>

        {/* Local SEO Cities Row */}
        <div className="border-t border-gray-800/80 pt-6 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
            GST Billing Software by City:
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400">
            <Link href="/city/delhi" className="hover:text-orange-400 transition-colors">Delhi NCR</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/mumbai" className="hover:text-orange-400 transition-colors">Mumbai</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/bengaluru" className="hover:text-orange-400 transition-colors">Bengaluru</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/lucknow" className="hover:text-orange-400 transition-colors">Lucknow</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/kanpur" className="hover:text-orange-400 transition-colors">Kanpur</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/varanasi" className="hover:text-orange-400 transition-colors">Varanasi</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/jaipur" className="hover:text-orange-400 transition-colors">Jaipur</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/ahmedabad" className="hover:text-orange-400 transition-colors">Ahmedabad</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/indore" className="hover:text-orange-400 transition-colors">Indore</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/patna" className="hover:text-orange-400 transition-colors">Patna</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/surat" className="hover:text-orange-400 transition-colors">Surat</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/pune" className="hover:text-orange-400 transition-colors">Pune</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/agra" className="hover:text-orange-400 transition-colors">Agra</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/ludhiana" className="hover:text-orange-400 transition-colors">Ludhiana</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/chandigarh" className="hover:text-orange-400 transition-colors">Chandigarh</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/meerut" className="hover:text-orange-400 transition-colors">Meerut</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/rajkot" className="hover:text-orange-400 transition-colors">Rajkot</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/vadodara" className="hover:text-orange-400 transition-colors">Vadodara</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/bhopal" className="hover:text-orange-400 transition-colors">Bhopal</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/ghaziabad" className="hover:text-orange-400 transition-colors">Ghaziabad</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/hyderabad" className="hover:text-orange-400 transition-colors">Hyderabad</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/kolkata" className="hover:text-orange-400 transition-colors">Kolkata</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/chennai" className="hover:text-orange-400 transition-colors">Chennai</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/coimbatore" className="hover:text-orange-400 transition-colors">Coimbatore</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/nagpur" className="hover:text-orange-400 transition-colors">Nagpur</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/raipur" className="hover:text-orange-400 transition-colors">Raipur</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/ranchi" className="hover:text-orange-400 transition-colors">Ranchi</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/bhubaneswar" className="hover:text-orange-400 transition-colors">Bhubaneswar</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/kochi" className="hover:text-orange-400 transition-colors">Kochi</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/visakhapatnam" className="hover:text-orange-400 transition-colors">Visakhapatnam</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/jodhpur" className="hover:text-orange-400 transition-colors">Jodhpur</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/amritsar" className="hover:text-orange-400 transition-colors">Amritsar</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/gorakhpur" className="hover:text-orange-400 transition-colors">Gorakhpur</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/gwalior" className="hover:text-orange-400 transition-colors">Gwalior</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/jabalpur" className="hover:text-orange-400 transition-colors">Jabalpur</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/prayagraj" className="hover:text-orange-400 transition-colors">Prayagraj</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/bareilly" className="hover:text-orange-400 transition-colors">Bareilly</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/aligarh" className="hover:text-orange-400 transition-colors">Aligarh</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/moradabad" className="hover:text-orange-400 transition-colors">Moradabad</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/jalandhar" className="hover:text-orange-400 transition-colors">Jalandhar</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/vijayawada" className="hover:text-orange-400 transition-colors">Vijayawada</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/madurai" className="hover:text-orange-400 transition-colors">Madurai</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/nashik" className="hover:text-orange-400 transition-colors">Nashik</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/aurangabad" className="hover:text-orange-400 transition-colors">Aurangabad</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/dehradun" className="hover:text-orange-400 transition-colors">Dehradun</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/jamshedpur" className="hover:text-orange-400 transition-colors">Jamshedpur</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/guwahati" className="hover:text-orange-400 transition-colors">Guwahati</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/dhanbad" className="hover:text-orange-400 transition-colors">Dhanbad</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/mirzapur" className="hover:text-orange-400 transition-colors">Mirzapur</Link>
            <span className="text-gray-700">•</span>
            <Link href="/city/jammu" className="hover:text-orange-400 transition-colors">Jammu</Link>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2026 UdyogBill. All rights reserved. | हर व्यापार का स्मार्ट साथी</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-300">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-300">Terms of Service</Link>
            <Link href="/refund" className="hover:text-gray-300">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FloatingButtons({ onDemoClick }: { onDemoClick: () => void }) {
  return (
    <div
      className="fixed bottom-6 right-4 flex flex-col gap-3"
      style={{ zIndex: 999999, pointerEvents: "auto" }}
    >
      <a
        href="tel:+919473807622"
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110"
        style={{ background: "#f97316" }}
        title="Call Us"
      >
        <Phone className="w-5 h-5 text-white" />
      </a>
      <a
        href="https://wa.me/919473807622?text=Hi%2C%20UdyogBill%20ke%20baare%20mein%20jaanna%20chahta%20hoon"
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110"
        style={{ background: "#25D366" }}
        title="WhatsApp"
      >
        <MessageCircle className="w-5 h-5 text-white" />
      </a>
    </div>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    initAttribution();
    // Completely isolate marketing site from ERP dark / amber / navy / emerald theme classes
    const themeClasses = ["dark", "theme-dark", "theme-light", "theme-vibrant", "theme-navy", "theme-emerald", "theme-amber"];
    document.documentElement.classList.remove(...themeClasses);
    document.body.classList.remove(...themeClasses);
    document.documentElement.classList.add("marketing-active");
    document.body.classList.add("marketing-active");

    return () => {
      document.documentElement.classList.remove("marketing-active");
      document.body.classList.remove("marketing-active");
    };
  }, []);

  if (isHomePage) {
    return (
      <div className="marketing-site-wrapper min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
        {children}
        <FloatingButtons onDemoClick={() => setPopupOpen(true)} />
        <ContactPopup open={popupOpen} onClose={() => setPopupOpen(false)} />
      </div>
    );
  }

  return (
    <div className="marketing-site-wrapper min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      <Navbar onDemoClick={() => setPopupOpen(true)} />
      <main className="flex-1 pt-16 pb-12 bg-white text-slate-900">{children}</main>
      <Footer onDemoClick={() => setPopupOpen(true)} />
      <FloatingButtons onDemoClick={() => setPopupOpen(true)} />
      <ContactPopup open={popupOpen} onClose={() => setPopupOpen(false)} />
    </div>
  );
}
