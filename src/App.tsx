import { useState, useEffect } from "react";
import SubscriptionSimulator from "./components/SubscriptionSimulator";
import { 
  ShieldCheck, 
  Lightbulb, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  Rocket, 
  Target,
  FileText,
  AlertCircle,
  Layout,
  Layers,
  Heart,
  TrendingDown,
  Lock,
  MessageSquare,
  ChevronRight,
  Shield,
  Coins,
  DollarSign,
  Crown
} from "lucide-react";

export default function App() {
  // Dual-mode view: "site" (Public Landing Website) vs "app" (Subscriber Dashboard Portal)
  const [viewMode, setViewMode] = useState<"site" | "app">("site");
  
  // Real Premium subscription state (persisted via localStorage)
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem("subguardian_premium_active") === "true";
  });
  
  const [stripeLoading, setStripeLoading] = useState(false);
  const [checkoutNotification, setCheckoutNotification] = useState<"success" | "cancel" | null>(null);

  useEffect(() => {
    // Check URL parameters for Stripe Checkout success/cancel
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout_status");
    if (status === "success") {
      localStorage.setItem("subguardian_premium_active", "true");
      setIsPremium(true);
      setCheckoutNotification("success");
      setViewMode("app");
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === "cancel") {
      setCheckoutNotification("cancel");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleStripeCheckout = async () => {
    setStripeLoading(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to connect with Stripe. Please try again.");
      }
    } catch (e) {
      console.error("Stripe Checkout Error:", e);
      alert("An unexpected error occurred during Stripe checkout.");
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      
      {/* Top Main Navigation Header */}
      <header id="app-header" className="border-b border-slate-200/80 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-sm">
              S
            </div>
            <div>
              <h1 className="font-bold text-slate-950 text-base leading-tight tracking-tight">SubGuardian</h1>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Auto Digital Leak Shield</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#how-it-works" onClick={() => setViewMode("site")} className="hover:text-slate-950 transition-colors">How It Works</a>
            <a href="#pricing" onClick={() => setViewMode("site")} className="hover:text-slate-950 transition-colors">Pricing Model</a>
            <a href="#simulator" onClick={() => setViewMode("app")} className="hover:text-slate-950 transition-colors">Live Dashboard</a>
          </nav>

          <div className="flex items-center gap-3">
            {isPremium && (
              <div className="flex items-center gap-1 text-[10px] bg-amber-500 text-slate-950 font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse shadow-sm">
                <Crown className="w-3 h-3 fill-slate-950" /> Premium Shield Active
              </div>
            )}
            {viewMode === "site" ? (
              <button
                onClick={() => setViewMode("app")}
                className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                Launch App Portal <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Securely Connected
                </div>
                <button
                  onClick={() => setViewMode("site")}
                  className="text-slate-500 hover:text-slate-900 font-bold text-xs py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* VIEW MODE 1: PUBLIC COMMERCIAL LANDING WEBSITE */}
      {viewMode === "site" && (
        <div className="animate-fade-in space-y-16 py-10">
          
          {/* Hero Section */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/50">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Stop Money Leaking on Autopilot
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
              We Find Your Forgotten Subscriptions. <br />
              <span className="text-amber-500 font-extrabold">We Cancel Them for You.</span>
            </h2>
            
            <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              The average household wastes **$219 every single month** on unused trials, gym memberships, and overpriced internet fees. SubGuardian connects to your statements, detects leaks, and saves you money in 1 tap.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setViewMode("app")}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm px-8 py-4 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer w-full sm:w-auto"
              >
                Scan My Accounts Free
              </button>
              <a
                href="#how-it-works"
                className="text-slate-700 hover:text-slate-950 text-sm font-bold flex items-center gap-1 py-3 px-6"
              >
                See how it works <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Graphic Trust Badges */}
            <div className="pt-8 border-t border-slate-200/60 max-w-3xl mx-auto flex flex-wrap justify-center gap-x-12 gap-y-4 text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-slate-300" /> Bank-Grade 256-Bit SSL</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-slate-300" /> 100% Privacy Protected</span>
              <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-slate-300" /> Over $2.4M Saved To Date</span>
            </div>
          </section>

          {/* Core Feature Section */}
          <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h3 className="text-2xl font-bold tracking-tight text-slate-950">How SubGuardian Safeguards Your Wallet</h3>
              <p className="text-xs text-slate-500 mt-2">Zero effort. Ultimate financial protection.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-amber-700">1</div>
                <h4 className="font-bold text-slate-950 text-sm">Automated statement Scan</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Connect your statements securely or upload a billing ledger. Our advanced scanning model flags inactive platforms and trial accounts automatically.
                </p>
              </div>

              <div className="space-y-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-amber-700">2</div>
                <h4 className="font-bold text-slate-950 text-sm">One-Tap Cancellation Requests</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  No more annoying phone calls or certified mail loops. Click a button to draft and send legally valid refund claims and contract cancellations.
                </p>
              </div>

              <div className="space-y-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-amber-700">3</div>
                <h4 className="font-bold text-slate-950 text-sm">Continuous Promos & Savings</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our system keeps scanning. If Comcast, Verizon, or AT&T raise prices or offer loyalty tiers, the app auto-negotiates to lock in the absolute lowest rate.
                </p>
              </div>
            </div>
          </section>

          {/* Flat Commercial Pricing Model Section */}
          <section id="pricing" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Fair, Simple, High-ROI Pricing</h3>
              <p className="text-xs text-slate-500">We make money ONLY when we save you more.</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-md">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-widest">Standard Premium Account</div>
                <h4 className="text-3xl font-black text-slate-950">$4.99 <span className="text-xs text-slate-400 font-medium">/ month</span></h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">✓ Unlimited Bank Accounts Sync</li>
                  <li className="flex items-center gap-2">✓ Automated 1-Tap trials cancellations</li>
                  <li className="flex items-center gap-2">✓ AI Broadband & Cable rates negotiation</li>
                  <li className="flex items-center gap-2">✓ 100% Secure, Privacy-First pledge</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/60 max-w-sm text-center space-y-4">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Our Net ROI Promise</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The average SubGuardian subscriber saves **$43.50 each month**. Paying $4.99 to get $43.50 back is a **net-positive gain of $38.51** monthly.
                </p>
                {isPremium ? (
                  <button
                    onClick={() => setViewMode("app")}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Crown className="w-3.5 h-3.5 fill-slate-950" /> Premium Account Active
                  </button>
                ) : (
                  <button
                    onClick={handleStripeCheckout}
                    disabled={stripeLoading}
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {stripeLoading ? "Loading Stripe Checkout..." : "Upgrade with Stripe ($4.99)"}
                  </button>
                )}
              </div>
            </div>
          </section>

        </div>
      )}

      {/* VIEW MODE 2: ACTIVE SUBSCRIBER WEB APP DASHBOARD */}
      {viewMode === "app" && (
        <div className="animate-fade-in">
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
            
            {/* User Welcome Board */}
            <section id="dashboard-hero" className="border border-slate-200/80 rounded-2xl bg-white p-8 relative overflow-hidden shadow-sm">
              <div className="absolute -right-24 -top-24 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="max-w-4xl space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Continuous Auto-Protection Active
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-950 leading-tight">
                  Secure Leak Shield Active & Protecting Your Wallet
                </h2>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-3xl">
                  Welcome to your SubGuardian Dashboard. Our continuous security scanner has audited your linked statements and identified active utility charges and unused digital trial accounts. Review the flagged leaks below to cancel plans or request promo rate discounts in 1 tap.
                </p>
              </div>
            </section>

            {/* Active app simulator */}
            <SubscriptionSimulator 
              isPremium={isPremium} 
              handleUpgrade={handleStripeCheckout} 
              stripeLoading={stripeLoading} 
            />

          </main>
        </div>
      )}

    </div>
  );
}
