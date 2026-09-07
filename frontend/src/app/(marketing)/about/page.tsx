import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Shield, Zap, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About UdyogBill - Hamari Kahani | Indian MSME Billing Platform",
  description: "UdyogBill ki kahani — kaise shuru hua, kyun banaya, aur hamara vision kya hai. Hum Indian vyapariyon ke liye best billing software banate hain.",
  alternates: {
    canonical: "https://udyogbill.com/about",
  },
  openGraph: {
    title: "About UdyogBill - Hamari Kahani",
    description: "DigiOpera Private Limited dwara banaya gaya UdyogBill — har vyapari ka smart billing saathi.",
    url: "https://udyogbill.com/about",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <>
      <section className="py-20" style={{background:"linear-gradient(135deg,#fff7ed,#f0fdf4)"}}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="text-5xl mb-6">🇮🇳</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6" style={{fontFamily:"Poppins,sans-serif"}}>
            Hamari Kahani —{" "}
            <span style={{color:"#f97316"}}>हर व्यापार का स्मार्ट साथी</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            UdyogBill ek simple soch se shuru hua — ki Indian vyapari ka kaam aasaan hona chahiye.
            GST aayi, digitalization aayi, lekin aam vyapari ke liye software ya toh bahut mehnga tha
            ya bahut complicated. Tab UdyogBill ka janam hua.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-4" style={{fontFamily:"Poppins,sans-serif"}}>
                Kyun Banaya UdyogBill?
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>Hamare founders ne dekha ki India mein crore vyapari hain — pharma distributors, FMCG dealers, garment shop owners, wholesale traders — jo abhi bhi Excel ya purani software se kaam kar rahe hain.</p>
                <p>GST aane ke baad compliance aur bhi complex ho gayi. Lekin available software ya toh bahut mehnga tha, ya sikhna bahut mushkil tha.</p>
                <p>UdyogBill banaya gaya ek <strong>simple, affordable, aur powerful</strong> solution ke roop mein — jo Hindi mein samjha bhi de aur business bhi chalaye.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Heart, title: "Vyapari First", desc: "Har feature vyapari ki zaroorat se bana hai, kisi tech idea se nahi", color: "#ef4444" },
                { icon: Shield, title: "Data Safe", desc: "Aapka data sirf aapka hai — full security, daily backup", color: "#3b82f6" },
                { icon: Zap, title: "Super Fast", desc: "2 minute mein invoice — itni fast koi nahi", color: "#f97316" },
                { icon: Users, title: "Support Team", desc: "Hindi mein baat karo — hum samjhenge", color: "#16a34a" },
              ].map(v => {
                const Icon = v.icon;
                return (
                  <div key={v.title} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{background:`${v.color}15`}}>
                      <Icon className="w-4 h-4" style={{color:v.color}} />
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm mb-1" style={{fontFamily:"Poppins,sans-serif"}}>{v.title}</h3>
                    <p className="text-gray-500 text-xs">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mission */}
          <div className="rounded-2xl p-8 mb-12" style={{background:"linear-gradient(135deg,#fff7ed,#f0fdf4)"}}>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4" style={{fontFamily:"Poppins,sans-serif"}}>Hamara Mission</h2>
            <p className="text-gray-700 text-lg leading-relaxed">
              "India ke har chhote aur medium vyapari ko <strong style={{color:"#f97316"}}>world-class billing software</strong> milna chahiye —
              aasaan, affordable, aur apni bhasha mein. UdyogBill yahi sapna le kar chala hai."
            </p>
          </div>

          {/* Numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { num: "2024", label: "Company Founded" },
              { num: "20+", label: "Happy Businesses" },
              { num: "14+", label: "Industries Supported" },
              { num: "100%", label: "India Focused" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="text-3xl font-black mb-1" style={{fontFamily:"Poppins,sans-serif",color:"#f97316"}}>{s.num}</div>
                <div className="text-gray-500 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 text-center" style={{background:"linear-gradient(135deg,#16a34a,#15803d)"}}>
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-white mb-4" style={{fontFamily:"Poppins,sans-serif"}}>Humare Saath Judiye</h2>
          <p className="text-green-100 mb-8">20+ businesses already UdyogBill pe hain. Aap bhi aiye.</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white font-bold px-7 py-3.5 rounded-xl text-lg" style={{color:"#16a34a"}}>
            Free Trial Shuru Karo <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
