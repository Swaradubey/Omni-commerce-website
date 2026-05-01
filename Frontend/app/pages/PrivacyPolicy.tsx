import { Link } from 'react-router';
import { ArrowLeft, Lock, Eye, Database, Share2, Bell } from 'lucide-react';

export function PrivacyPolicy() {
  const lastUpdated = "May 1, 2026";

  const sections = [
    {
      title: "1. Information We Collect",
      content: "We collect information you provide directly to us, such as when you create an account, make a purchase, or communicate with us. This may include your name, email address, phone number, shipping address, and payment information.",
      icon: <Database className="w-5 h-5 text-blue-400" />
    },
    {
      title: "2. How We Use Your Information",
      content: "We use the information we collect to provide, maintain, and improve our services, process your transactions, send you technical notices and updates, and respond to your comments and questions.",
      icon: <Eye className="w-5 h-5 text-purple-400" />
    },
    {
      title: "3. Data Security",
      content: "We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. However, no security system is impenetrable.",
      icon: <Lock className="w-5 h-5 text-cyan-400" />
    },
    {
      title: "4. Sharing of Information",
      content: "We do not share your personal information with third parties except as described in this Privacy Policy, such as with your consent or to comply with legal obligations.",
      icon: <Share2 className="w-5 h-5 text-emerald-400" />
    },
    {
      title: "5. Your Choices",
      content: "You may update or correct your account information at any time by logging into your account. You may also opt-out of receiving promotional communications from us by following the instructions in those communications.",
      icon: <Bell className="w-5 h-5 text-amber-400" />
    }
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white selection:bg-purple-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-20 lg:py-32">
        {/* Navigation */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>

        {/* Header */}
        <header className="mb-16">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium uppercase tracking-widest text-purple-400">Security & Privacy</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">Policy</span>
          </h1>
          <p className="text-white/40 text-lg">
            Last updated on <span className="text-white/60 font-medium">{lastUpdated}</span>
          </p>
        </header>

        {/* Content */}
        <div className="space-y-12">
          {sections.map((section, index) => (
            <section key={index} className="group p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 rounded-xl bg-white/5 border border-white/10">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-4 group-hover:text-purple-400 transition-colors">
                    {section.title}
                  </h2>
                  <p className="text-white/60 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-20 p-8 rounded-3xl border border-dashed border-white/10 text-center">
          <p className="text-white/40 text-sm mb-6">
            Your privacy is important to us. If you have any concerns, please get in touch.
          </p>
          <Link 
            to="/contact" 
            className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white text-black font-bold transition-all hover:scale-105 active:scale-95"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
