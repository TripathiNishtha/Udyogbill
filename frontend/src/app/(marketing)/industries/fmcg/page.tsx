import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "FMCG Distributor Billing Software India | UdyogBill",
  description: "FMCG distributors ke liye GST billing software. Case-pack conversion, scheme management, route management, distributor billing. India ka trusted FMCG software.",
  alternates: {
    canonical: "https://udyogbill.com/industries/fmcg",
  },
};

export default function IndustryPage() {
  const features = [{icon:'📦',title:'Case-Pack Conversion',desc:'Case mein khareedo, piece mein becho — conversion automatic. Koi confusion nahi.'},{icon:'🎯',title:'Scheme Management',desc:'Company ke schemes, discounts, cashback — sab auto-apply ho jaata hai.'},{icon:'🗺️',title:'Route Management',desc:'Route-wise billing aur delivery. Salesman route performance track karo.'},{icon:'🏷️',title:'MRP Tracking',desc:'MRP se zyada price nahi ja sakta — system automatically check karta hai.'},{icon:'📊',title:'Distributor Reports',desc:'Party-wise, item-wise, route-wise — detailed reports ek click mein.'},{icon:'🔄',title:'Return Management',desc:'Company ko wapas karna ho ya customer se — returns easily manage karo.'}];
  return (
    <>
      <section className="py-20" style={{background:"linear-gradient(135deg,#fff7ed,#f0fdf4)"}}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-6xl mb-4">📦</div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4" style={{fontFamily:"Poppins,sans-serif"}}>
                FMCG Distributor <br/>
                <span style={{color:"#f97316"}}>Ke Liye Billing Software</span>
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">FMCG distributors ke liye GST billing software. Case-pack conversion, scheme management, route management, distributor billing. India ka trusted FMCG software.</p>
              <div className="flex gap-4 flex-wrap">
                <Link href="/register" className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl" style={{background:"#f97316"}}>
                  Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="https://wa.me/919473807622" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl border-2" style={{borderColor:"#25D366",color:"#16a34a"}}>
                  <MessageCircle className="w-4 h-4" /> Demo Chahiye
                </a>
              </div>
            </div>
            <div className="rounded-2xl p-6" style={{background:"linear-gradient(135deg,#16a34a15,#f9731615)"}}>
              <h3 className="font-bold text-gray-800 mb-4" style={{fontFamily:"Poppins,sans-serif"}}>In Samasyon Ka Solution:</h3>
              <div className="space-y-3">
                {[["Case se piece mein conversion manually karna padta tha","Auto case-pack conversion — ek click mein"],["Scheme aur discount manually calculate karna hota tha","Scheme, discount, cash-back auto-calculate"],["Multiple routes ka management mushkil tha","Route-wise billing aur performance tracking"]].map(([p,s])=>(
                  <div key={p} className="bg-white rounded-xl p-4">
                    <div className="text-xs text-red-500 mb-1">❌ {p}</div>
                    <div className="text-sm font-medium text-gray-700 flex items-start gap-2"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{color:"#16a34a"}} />{s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8" style={{fontFamily:"Poppins,sans-serif"}}>Khas Features — Sirf Aapke Liye</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-5 rounded-xl border border-gray-100 bg-white hover:shadow-md transition-all">
                <div className="text-2xl shrink-0">{f.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm mb-1" style={{fontFamily:"Poppins,sans-serif"}}>{f.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14" style={{background:"linear-gradient(135deg,#f97316,#16a34a)"}}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4" style={{fontFamily:"Poppins,sans-serif"}}>Aaj Hi Try Karo — Free!</h2>
          <p className="text-white/80 mb-8">5 minute mein setup. No credit card. Full support.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="bg-white font-bold px-7 py-3.5 rounded-xl text-sm hover:scale-105 transition-all" style={{color:"#f97316"}}>Free Trial Shuru Karo</Link>
            <a href="https://wa.me/919473807622" target="_blank" rel="noopener noreferrer" className="border-2 border-white font-bold px-7 py-3.5 rounded-xl text-sm text-white hover:bg-white/10 transition-all">WhatsApp Demo</a>
          </div>
        </div>
      </section>
    </>
  );
}

