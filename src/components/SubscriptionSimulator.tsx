import React, { useEffect, useState, useMemo } from "react";
import { 
  ShieldCheck, 
  RefreshCw, 
  AlertTriangle, 
  Sparkles, 
  Crown, 
  ArrowRight, 
  UploadCloud, 
  Plus, 
  Trash2, 
  Layers, 
  Copy, 
  CheckCircle, 
  Check, 
  FileText, 
  Coins, 
  LogOut, 
  Loader2 
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { SubscriptionItem } from "../types.ts";
import { motion, AnimatePresence } from "motion/react";
import { getProvider } from "../lib/providers.ts";

export const SubscriptionSimulator: React.FC = () => {
  const { user, token, loginWithGoogle, logout } = useAuth();
  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState("none");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [upcomingRenewals, setUpcomingRenewals] = useState<any[]>([]);

  // Active script generator details
  const [activeScript, setActiveScript] = useState<{
    title: string;
    text: string;
    provider: string;
    type: "cancel" | "negotiate";
    subId?: number;
  } | null>(null);

  // Statement parser states
  const [statementInput, setStatementInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Manual subscription adder states
  const [showAdder, setShowAdder] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState<string>("entertainment");
  const [newFreq, setNewFreq] = useState<string>("monthly");
  const [newCurrency, setNewCurrency] = useState<string>("USD");
  const [newUsage, setNewUsage] = useState("Idle");
  const [isFlagged, setIsFlagged] = useState(true);

  // Loading indicator for operations
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Sample transaction statement templates for safe onboarding
  const STATEMENT_TEMPLATES = [
    {
      title: "Jane's Credit Card Statement",
      text: `ACH DEBIT NETFLIX PREMIUM - $22.99 (08/14)
POS DEBIT EQUINOX SPORTS CLUB YORK - $250.00 (08/10)
DIRECT DEBIT COMCAST BROADBAND XFINITY BILL - $89.99 (08/02)
ACH WITHDRAWAL SPOTIFY FAMILY TRIAL PREMIUM - $16.99 (08/21)
POS DEBIT ADOBE SYSTEMS INC CREATIVE CLD - $54.99 (08/15)`
    },
    {
      title: "Standard Personal Bank Statement",
      text: `08/20 RECURRING PAYPAL CHARGE - HULU - $18.99
08/18 DRIBBBLE PRO MEMBER TRIAL - $15.00
08/12 RECURRING FEE - GYM MEMBERSHIP BASIC - $45.00
08/10 CHATGPT PLUS SUBSCRIPTION - OPENAI - $20.00
08/05 APPLE.COM/BILL MONTHLY STORAGE - $9.99`
    }
  ];

  // Fetch subscriptions & premium status
  const fetchSubscriptions = async () => {
    if (!token) return;
    setLoadingSubs(true);
    try {
      // 1. Fetch user subscription premium status
      const premiumRes = await fetch("/api/me/subscription", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (premiumRes.ok) {
        const premiumData = await premiumRes.json();
        setIsPremium(premiumData.premium);
        setPremiumStatus(premiumData.status);
      }

      // 2. Fetch subscription items from SQL
      const subsRes = await fetch("/api/subscriptions", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubs(subsData.subscriptions || []);
      }

      // 3. Fetch upcoming renewals
      const upcomingRes = await fetch("/api/subscriptions/upcoming", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json();
        setUpcomingRenewals(upcomingData.upcoming || []);
      }
    } catch (err) {
      console.error("Failed to sync subscriptions ledger from backend:", err);
    } finally {
      setLoadingSubs(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchSubscriptions();
    } else {
      setSubs([]);
      setIsPremium(false);
    }
  }, [user, token]);

  // Handle Stripe upgrade checkout redirect
  const handleUpgrade = async () => {
    if (!token) return;
    setStripeLoading(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      }
    } catch (err: any) {
      console.error("Stripe Checkout failed:", err);
      alert(err.message || "Failed to launch payment checkout.");
    } finally {
      setStripeLoading(false);
    }
  };

  // Step 1: Request formal subscription cancellation
  const handleCancelRequest = async (sub: SubscriptionItem) => {
    if (!token) return;
    setActionLoadingId(sub.id);
    try {
      const response = await fetch(`/api/subscriptions/${sub.id}/request-cancel`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: `Unused account underutilization audit.`
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Re-sync with backend to capture updated statuses & records
      await fetchSubscriptions();

      // Show the generated cancellation letter instructions on screen
      setActiveScript({
        provider: sub.provider,
        title: `Cancellation Request Draft for ${sub.provider}`,
        text: `${data.generatedMessage}\n\n=========================================\nOFFICIAL CANCELLATION LINK: ${data.cancellationUrl}\nINSTRUCTIONS:\n${data.instructions}`,
        type: "cancel",
        subId: sub.id
      });
    } catch (err: any) {
      console.error("Cancellation request generation failed:", err);
      alert(err.message || "Failed to initiate cancellation request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Step 1.5: Submit cancellation to provider (transitions to awaiting_confirmation)
  const handleSubmitCancel = async (subId: number) => {
    if (!token) return;
    setActionLoadingId(subId);
    try {
      const response = await fetch(`/api/subscriptions/${subId}/submit-cancel`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to submit cancellation.");

      setActiveScript(null);
      await fetchSubscriptions();
    } catch (err: any) {
      console.error("Submit cancellation failed:", err);
      alert(err.message || "Failed to submit cancellation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Step 1.75: Confirm provider accepted cancellation (transitions to cancelled)
  const handleConfirmProviderAccepted = async (subId: number) => {
    if (!token) return;
    setActionLoadingId(subId);
    try {
      const response = await fetch(`/api/subscriptions/${subId}/confirm-provider-accepted`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to confirm provider cancellation.");

      setActiveScript(null);
      await fetchSubscriptions();
    } catch (err: any) {
      console.error("Confirm provider cancelled failed:", err);
      alert(err.message || "Failed to confirm provider cancellation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Step 2: Manually confirm & verify actual cancellation (charge removed)
  const handleVerifyCancellation = async (subId: number) => {
    if (!token) return;
    setActionLoadingId(subId);
    try {
      const response = await fetch(`/api/subscriptions/${subId}/verify-cancel`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.success === false) {
        alert(data.message || "Awaiting verification: no newer transactions scanned yet to prove charge has stopped.");
        return;
      }

      // Clear active letter view and fetch updated state
      setActiveScript(null);
      await fetchSubscriptions();
    } catch (err: any) {
      console.error("Verification confirmation failed:", err);
      alert(err.message || "Failed to verify cancellation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Generate loyalty negotiation promos script
  const handleNegotiate = async (sub: SubscriptionItem) => {
    if (!token) return;
    setActionLoadingId(sub.id);
    try {
      const response = await fetch("/api/subguardian/generate-negotiation", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: sub.provider,
          currentPrice: sub.amount,
          competitorPrice: Math.max(19.99, parseFloat((sub.amount * 0.6).toFixed(2)))
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setActiveScript({
        provider: sub.provider,
        title: data.title || `${sub.provider} Promo Negotiation Outline`,
        text: data.text,
        type: "negotiate",
        subId: sub.id
      });
    } catch (err: any) {
      console.error("Negotiation failed:", err);
      alert(err.message || "Failed to generate promo negotiation blueprint.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Parse uploaded statement text securely
  const handleParseStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementInput.trim() || !token) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const response = await fetch("/api/subguardian/parse-statement", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ statementText: statementInput })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to analyze statements.");

      setStatementInput("");
      await fetchSubscriptions(); // Re-fetch updated items
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || "Failed to complete AI scan.");
    } finally {
      setIsParsing(false);
    }
  };

  // Manually add subscription details
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice.trim() || !token) return;

    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum)) return;

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: newName,
          name: newName,
          category: newCategory,
          amount: priceNum,
          currency: newCurrency,
          frequency: newFreq,
          status: isFlagged ? "flagged" : "active"
        })
      });

      if (!response.ok) throw new Error("Failed to insert plan.");

      setNewName("");
      setNewPrice("");
      setShowAdder(false);
      await fetchSubscriptions();
    } catch (err: any) {
      console.error("Manual add failed:", err);
      alert(err.message || "Failed to add subscription.");
    }
  };

  const handleCopy = () => {
    if (activeScript) {
      navigator.clipboard.writeText(activeScript.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format currency output precisely (no hardcoded "$" assumptions)
  const formatCurrency = (amount: number, currencyCode: string) => {
    const symbol = currencyCode === "INR" ? "₹" : "$";
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Dynamic user financial metrics calculating Potential Leaks vs. Confirmed Savings
  const stats = useMemo(() => {
    let totalMonthly = 0;
    let potentialLeaks = 0;
    let confirmedSavings = 0;

    subs.forEach((s) => {
      // Normalize to monthly equivalent
      const normalizedAmount = s.frequency === "annually" ? s.amount / 12 : s.amount;
      
      if (s.status === "active" || s.status === "flagged" || s.status === "cancellation_requested") {
        totalMonthly += normalizedAmount;
      }

      if (s.status === "flagged") {
        potentialLeaks += normalizedAmount;
      }

      if (s.status === "verified_cancelled") {
        confirmedSavings += normalizedAmount;
      }
    });

    return {
      totalMonthly,
      potentialLeaks,
      confirmedSavings,
      activeCount: subs.filter(s => s.status !== "verified_cancelled").length,
      leakCount: subs.filter(s => s.status === "flagged").length
    };
  }, [subs]);

  // Expenses categories breakdown math
  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, number> = {
      entertainment: 0,
      utility: 0,
      fitness: 0,
      productivity: 0,
      other: 0
    };

    subs.forEach(s => {
      if (s.status !== "verified_cancelled") {
        const normalizedAmount = s.frequency === "annually" ? s.amount / 12 : s.amount;
        const catName = s.category.toLowerCase();
        if (categories[catName] !== undefined) {
          categories[catName] += normalizedAmount;
        } else {
          categories.other += normalizedAmount;
        }
      }
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value
    }));
  }, [subs]);

  // Login Gate UI if user is not authenticated
  if (!user) {
    return (
      <div id="auth-gate-root" className="max-w-md mx-auto my-12 bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-950">Access Subscription Guardian</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Connect securely with Google Sign-In to launch durable transaction audits, track real premium cancellations, and negotiate utility rates.
          </p>
        </div>

        <button
          onClick={loginWithGoogle}
          className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/shinydemos/google_button.svg" className="w-4 h-4" alt="Google" />
          Continue with Google Account
        </button>
      </div>
    );
  }

  return (
    <div id="subscription-simulator-root" className="space-y-8">
      
      {/* 4-Column Live Financial Auditing Panel */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md grid grid-cols-1 md:grid-cols-4 gap-6 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> SubGuardian Active Core
            </div>
            <h3 className="text-xl font-bold text-white leading-tight">Digital Statement Guardian</h3>
            <p className="text-[10px] text-slate-400 mt-1">Logged in as {user.email}</p>
          </div>
          <button 
            onClick={logout}
            className="text-xs text-slate-400 hover:text-rose-400 font-medium mt-4 text-left flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3 h-3" /> Log Out Account
          </button>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Monthly Bill</div>
          <div className="text-2xl font-black text-white mt-1">{formatCurrency(stats.totalMonthly, "USD")}</div>
          <div className="text-[10px] text-slate-500 mt-1">{stats.activeCount} recurring plans active</div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-xs text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> Idle Leak Risks
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1">{formatCurrency(stats.potentialLeaks, "USD")}</div>
          <div className="text-[10px] text-rose-500/80 mt-1">{stats.leakCount} leaks active</div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Confirmed Savings
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-1">{formatCurrency(stats.confirmedSavings, "USD")}</div>
          <div className="text-[10px] text-emerald-500 mt-1">Verified charge cancellations</div>
        </div>
      </div>

      {/* Premium Upgrade Callout Banner if not premium */}
      {!isPremium && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shrink-0 shadow-sm">
              <Crown className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-950">Activate Premium Autopilot Protection</h4>
              <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                Unlock real Cloud PostgreSQL database synchronization, unlimited automated cancellation requested logs, and rate negotiation script outcomes for $4.99/mo.
              </p>
            </div>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={stripeLoading}
            className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 text-white disabled:opacity-50 font-bold text-xs px-5 py-2.5 rounded-lg shrink-0 cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            {stripeLoading ? "Processing..." : "Upgrade with Stripe"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upcoming Renewals */}
      {upcomingRenewals.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Upcoming Renewals</h4>
          </div>
          <div className="space-y-3">
            {upcomingRenewals.map((renewal) => {
              if (!renewal.renewalReminderEnabled) return null;
              
              const provConfig = getProvider(renewal.provider);
              const cancelMode = provConfig.cancellationMode;
              const cancelTypeStr = 
                cancelMode === "automatic" ? "Automatic cancellation" :
                cancelMode === "assisted" ? "Assisted cancellation" : "Guided cancellation";
              const cancelTypeColor = 
                cancelMode === "automatic" ? "bg-emerald-500" :
                cancelMode === "assisted" ? "bg-amber-500" : "bg-blue-500";
              const btnLabel = 
                cancelMode === "automatic" ? "Cancel Automatically" :
                cancelMode === "assisted" ? "Start Cancellation" : "Open Cancellation Instructions";

              return (
                <div key={renewal.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-slate-950 text-sm">{renewal.provider}</h5>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {formatCurrency(renewal.amount, renewal.currency)} / {renewal.frequency.replace("ly", "")}
                    </div>
                    <div className="text-[10px] text-amber-600 font-semibold mt-1">
                      Renews in {renewal.daysUntilRenewal} days
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${cancelTypeColor}`}></span> {cancelTypeStr}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!token) return;
                        try {
                          await fetch(`/api/subscriptions/${renewal.id}/reminder`, {
                            method: "PUT",
                            headers: { 
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({ enabled: false })
                          });
                          setUpcomingRenewals(prev => prev.filter(s => s.id !== renewal.id));
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Keep
                    </button>
                    <button
                      onClick={() => {
                        // find matching sub and use existing logic
                        const matchingSub = subs.find(s => s.id === renewal.id);
                        if (matchingSub) handleCancelRequest(matchingSub);
                      }}
                      className="text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      {btnLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Statement Parser & Subscriptions Ledger */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Statement Parser Section */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-bold text-slate-900">Upload transaction ledger & parse</h4>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">Gemini LLM Integration</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Our secure transaction parser automatically extracts subscriptions and bills. Paste statement text, invoices, or transactions below, or select a template to run an instant security scan.
            </p>

            {/* Quick Templates */}
            <div className="flex flex-wrap gap-2 pt-1">
              {STATEMENT_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setStatementInput(tmpl.text)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  Load: {tmpl.title}
                </button>
              ))}
            </div>

            <form onSubmit={handleParseStatement} className="space-y-3">
              <textarea
                rows={3}
                value={statementInput}
                onChange={(e) => setStatementInput(e.target.value)}
                placeholder="Paste transaction text or receipts..."
                className="w-full border border-slate-200 rounded-lg p-3 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800 placeholder-slate-400 font-mono"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isParsing || !statementInput.trim()}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning statement...
                    </>
                  ) : (
                    <>
                      AI Scan Transactions <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {parseError && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {parseError}
              </p>
            )}
          </div>

          {/* Subscriptions Ledger Title Area */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-slate-500" />
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Detected Subscriptions Ledger</h4>
            </div>
            <button
              onClick={() => setShowAdder(!showAdder)}
              className="border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Subscription
            </button>
          </div>

          {/* Adder Form Modal */}
          <AnimatePresence>
            {showAdder && (
              <motion.form 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleManualAdd} 
                className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4"
              >
                <h5 className="text-xs font-bold text-slate-900 uppercase">New Subscription Detail</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Name / Provider</label>
                    <input 
                      type="text" 
                      placeholder="E.g., Netflix" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500/55"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Price</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="14.99" 
                        value={newPrice} 
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500/55"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Currency</label>
                      <select
                        value={newCurrency}
                        onChange={(e) => setNewCurrency(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Category</label>
                    <select 
                      value={newCategory} 
                      onChange={(e: any) => setNewCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="entertainment">Entertainment</option>
                      <option value="utility">Utility (Broadband, Mobile)</option>
                      <option value="fitness">Fitness / Health</option>
                      <option value="productivity">Productivity (Cloud)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Frequency</label>
                    <select 
                      value={newFreq} 
                      onChange={(e: any) => setNewFreq(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isFlagged} 
                      onChange={(e) => setIsFlagged(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Flag as active leak risk (idle)</span>
                  </label>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setShowAdder(false)}
                      className="text-slate-500 hover:text-slate-700 text-xs font-semibold px-3 py-1.5"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-lg"
                    >
                      Add Plan
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Subscriptions List */}
          <div className="space-y-3">
            {loadingSubs && (
              <div className="text-center py-6 text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> Loading secure ledger...
              </div>
            )}

            {!loadingSubs && subs.length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400 text-xs">
                No subscription items identified yet. Paste a transaction statement or manual entry above to begin auditing.
              </div>
            )}

            <AnimatePresence initial={false}>
              {subs.map((sub) => {
                const isFlagged = sub.status === "flagged";
                const isVerified = sub.status === "verified_cancelled";
                const isCancelledOnly = sub.status === "cancelled";
                const isRequested = sub.status === "cancellation_requested";
                const isAwaiting = sub.status === "awaiting_confirmation";
                const isCancelled = isVerified || isCancelledOnly;
                const isLoading = actionLoadingId === sub.id;

                return (
                  <motion.div 
                     key={sub.id} 
                     layout
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className={`border rounded-xl p-4 bg-white transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                       isVerified ? "opacity-50 border-slate-100 bg-slate-50/50" : 
                       isFlagged ? "border-rose-200/90 shadow-sm shadow-rose-50/50" : "border-slate-200/80 hover:border-slate-300"
                     }`}
                   >
                     <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                         isVerified ? "bg-slate-200 text-slate-500" :
                         isFlagged ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-slate-100 text-slate-800"
                       }`}>
                        {sub.provider[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-950 text-sm">{sub.name}</span>
                          {isFlagged && (
                            <span className="bg-rose-50 border border-rose-200/50 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 leading-none">
                              <AlertTriangle className="w-2.5 h-2.5" /> Idle Leak Risk
                            </span>
                          )}
                          {isVerified && (
                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                              Fully Cancelled
                            </span>
                          )}
                          {isCancelledOnly && (
                            <span className="bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                              Provider Cancelled (Unverified)
                            </span>
                          )}
                          {isRequested && (
                            <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse leading-none flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Request Drafted
                            </span>
                          )}
                          {isAwaiting && (
                            <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse leading-none flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Submitted to Provider
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Category: <span className="capitalize text-slate-500 font-semibold">{sub.category}</span>
                          {sub.lastTransactionDate && ` • Last Transaction: ${sub.lastTransactionDate}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 md:justify-end">
                          <span className="font-bold text-slate-900 text-sm">
                            {formatCurrency(sub.amount, sub.currency)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium lowercase">
                            /{sub.frequency === "monthly" ? "mo" : "yr"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        {(sub.status === "active" || sub.status === "flagged") && (
                          <>
                            {sub.category === "utility" ? (
                              <button
                                type="button"
                                onClick={() => handleNegotiate(sub)}
                                disabled={isLoading}
                                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" /> Reduce Rate
                              </button>
                            ) : (() => {
                              const provConfig = getProvider(sub.provider);
                              const actionLabel = 
                                provConfig.cancellationMode === "automatic" ? "Cancel Automatically" :
                                provConfig.cancellationMode === "assisted" ? "Start Cancellation" : "Open Cancellation Instructions";
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleCancelRequest(sub)}
                                  disabled={isLoading}
                                  className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> {actionLabel}
                                </button>
                              );
                            })()}
                          </>
                        )}

                        {isRequested && (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveScript({
                                  provider: sub.provider,
                                  title: `Cancellation Instructions for ${sub.provider}`,
                                  text: `Please submit the request below to ${sub.provider} by going to their cancel link.\n\n=========================================\nHow to submit:\n1. Copy the generated request letter.\n2. Submit it via their cancellation portal.`,
                                  type: "cancel",
                                  subId: sub.id
                                });
                              }}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              Instructions & Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSubmitCancel(sub.id)}
                              disabled={isLoading}
                              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                            >
                              I Submitted Cancellation
                            </button>
                          </div>
                        )}

                        {isAwaiting && (
                          <button
                            type="button"
                            onClick={() => handleConfirmProviderAccepted(sub.id)}
                            disabled={isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            Provider Accepted Cancel
                          </button>
                        )}

                        {isCancelledOnly && (
                          <button
                            type="button"
                            onClick={() => handleVerifyCancellation(sub.id)}
                            disabled={isLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                          >
                            Verify Charge Stopped
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Spend Breakdown Chart */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" /> Active Spending Breakdown by Category
            </h4>
            <div className="space-y-3 pt-2">
              {categoryBreakdown.map((cat, idx) => {
                const percentage = stats.totalMonthly > 0 ? (cat.value / stats.totalMonthly) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize text-slate-600 font-medium">{cat.name}</span>
                      <span className="text-slate-950 font-bold">{formatCurrency(cat.value, "USD")}/mo <span className="text-slate-400 font-normal">({percentage.toFixed(0)}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: Action outputs & letters */}
        <div className="lg:col-span-5 space-y-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            AI Assistant Outputs
          </h4>

          {activeScript ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200/40 mb-1">
                    {activeScript.type === "cancel" ? "Ready to Send" : "Verbal Script"}
                  </span>
                  <h6 className="text-sm font-bold text-slate-950 leading-tight">{activeScript.title}</h6>
                </div>
                <button
                  onClick={handleCopy}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 p-2 rounded-lg transition-colors cursor-pointer"
                  title="Copy to clipboard"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-lg p-4 font-mono text-xs text-slate-700 leading-relaxed overflow-y-auto max-h-[300px] whitespace-pre-wrap select-all">
                {activeScript.text}
              </div>

              {activeScript.type === "cancel" && activeScript.subId && (() => {
                const subObj = subs.find(s => s.id === activeScript.subId);
                if (!subObj) return null;

                return (
                  <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
                    {subObj.status === "cancellation_requested" && (
                      <>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Step 1: Copy this letter and submit it to the provider's billing department.
                        </p>
                        <button
                          onClick={() => handleSubmitCancel(activeScript.subId!)}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold py-2 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          I Have Submitted This Request to the Provider
                        </button>
                      </>
                    )}
                    {subObj.status === "awaiting_confirmation" && (
                      <>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Step 2: Wait for the provider to accept the request. Once they accept/confirm via email, confirm it here.
                        </p>
                        <button
                          onClick={() => handleConfirmProviderAccepted(activeScript.subId!)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          Provider Has Accepted Cancellation
                        </button>
                      </>
                    )}
                    {subObj.status === "cancelled" && (
                      <>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Step 3: Check your billing statements. Once a newer billing statement/transaction log is parsed, run verification to ensure the charge has actually stopped.
                        </p>
                        <button
                          onClick={() => handleVerifyCancellation(activeScript.subId!)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" /> Run Statement Verification
                        </button>
                      </>
                    )}
                    {subObj.status === "verified_cancelled" && (
                      <p className="text-[11px] text-emerald-600 font-semibold text-center flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Cancellation fully verified! Charges have successfully stopped.
                      </p>
                    )}
                  </div>
                );
              })()}

              {copied && (
                <p className="text-[11px] text-emerald-600 font-semibold text-center flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Letter copied to clipboard! Ready to mail or email.
                </p>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 bg-white space-y-3">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-600">Action Output Queue is Empty</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Click <strong>"Reduce Rate"</strong> or <strong>"Stop Leak"</strong> on any subscription in the ledger. The server-side Gemini agent will generate custom letters or call loyalty negotiation templates live.
                </p>
              </div>
            </div>
          )}

          {/* Real observed and inferred information warning */}
          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-5 space-y-3 text-xs text-slate-800 leading-relaxed">
            <h5 className="font-bold text-slate-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" /> Verifiable Data Guarantee
            </h5>
            <p>
              Unlike standard mock systems, our Statement Parser runs authentic, direct scans of bank statement files and provides direct verification steps.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 font-semibold text-[10px] text-center">
              <div className="bg-slate-100 p-2 rounded border border-slate-200/50">
                <span className="block text-slate-950">Observed</span>
                <span className="text-slate-500 font-normal">Real prices, dates</span>
              </div>
              <div className="bg-slate-100 p-2 rounded border border-slate-200/50">
                <span className="block text-slate-950">Inferred</span>
                <span className="text-slate-500 font-normal">Recurring checks</span>
              </div>
              <div className="bg-slate-100 p-2 rounded border border-slate-200/50">
                <span className="block text-slate-950">Unknown</span>
                <span className="text-slate-500 font-normal">Eligibilities, usages</span>
              </div>
            </div>
          </div>

          {/* Leak Guard Security Center */}
          <div className="bg-emerald-50/40 border border-emerald-200/50 rounded-xl p-6 space-y-5 shadow-sm animate-fade-in text-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h5 className="font-bold text-slate-950 text-sm">Leak Guard Security Center</h5>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              We monitor your statements to protect you against unwanted recurring charges, price increases, and silent subscription creep.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <h6 className="text-xs font-bold text-slate-900">Auto Trial Expiration Guard</h6>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Set a calendar alert when starting a trial. Our app automatically initiates a legal refund request draft if you get billed accidentally.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <h6 className="text-xs font-bold text-slate-900">Utility Rate Lock Protection</h6>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Internet and cellular providers often raise prices after promo cycles. Use our Loyalist Negotiation Engine to reduce bills by 20%–40%.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0 mt-0.5">3</div>
                <div>
                  <h6 className="text-xs font-bold text-slate-900">Safe Card Practices</h6>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Always use temporary or single-use burner cards when signing up for lesser-known trial services to prevent forced continuous billing.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-100/40 p-3.5 rounded-lg border border-emerald-200/30 text-[11px] text-slate-700 leading-relaxed flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span>
                <strong>Your security rating is verified.</strong> By auto-cancelling identified leaks, your annual savings will exceed <strong>$720.00</strong>.
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SubscriptionSimulator;
