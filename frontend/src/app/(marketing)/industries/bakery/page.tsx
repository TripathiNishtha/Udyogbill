import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Bakery Billing Software India | Recipe Management | UdyogBill",
  description: "Bakeries ke liye billing software. Recipe management, daily production planning, fresh item billing, shift reports. India ka trusted bakery billing solution.",
  alternates: {
    canonical: "https://udyogbill.com/industries/bakery",
  },
};

export default function IndustryPage() {
  const features = [{icon:'📖',title:'Recipe Management',desc:'Har item ki recipe store karo. Jab produce karo, raw material automatically use hota hai.'},{icon:'📅',title:'Production Planning',desc:'Daily production plan banao. Kya banana hai, kitna — sab organized.'},{icon:'⏰',title:'Fresh Item Tracking',desc:'Fresh items ki shelf life set karo. Expiry hone se pehle alert milega.'},{icon:'🔄',title:'Shift Management',desc:'Morning, evening shift — alag-alag production aur sales track karo.'},{icon:'💰',title:'Counter Billing',desc:'Fast counter billing. Cash, card, UPI sab accept karo.'},{icon:'📊',title:'Wastage Reports',desc:'Kitna wasted — daily wastage track karo. Cost control easy hogi.'}];
  return (
    <>
      <section className="py-20" style={{background:"linear-gradient(135deg,#fff7ed,#f0fdf4)"}}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-6xl mb-4">🍞</div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4" style={{fontFamily:"Poppins,sans-serif"}}>
                Bakery Business <br/>
                <span style={{color:"#f97316"}}>Ke Liye Billing Software</span>
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">Bakeries ke liye billing software. Recipe management, daily production planning, fresh item billing, shift reports. India ka trusted bakery billing solution.</p>
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
                {[["Recipe se raw material ka hisaab mushkil tha","Recipe management — raw material auto-calculate"],["Daily production plan banana time-consuming tha","Daily production planning ek click mein"],["Fresh items ki expiry track karna mushkil tha","Fresh item expiry alerts — waste zero"]].map(([p,s])=>(
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

