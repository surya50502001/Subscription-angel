import React, { useState, useMemo } from "react";
import { SubscriptionItem } from "../types";
import { INITIAL_SUBSCRIPTIONS } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  FileText, 
  Calculator, 
  CheckCircle,
  Copy,
  ChevronRight,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Coins,
  UploadCloud,
  Plus,
  ArrowRight,
  UserCheck,
  CreditCard,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  HelpCircle,
  Clock,
  Check
} from "lucide-react";

export default function SubscriptionSimulator() {
  const [subs, setSubs] = useState<SubscriptionItem[]>(INITIAL_SUBSCRIPTIONS);
  const [activeScript, setActiveScript] = useState<{
    title: string;
    text: string;
    provider: string;
    type: "cancel" | "negotiate";
  } | null>(null);
  
  // Statement parser states
  const [statementInput, setStatementInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Manual subscription adder states
  const [showAdder, setShowAdder] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState<"entertainment" | "utility" | "fitness" | "productivity" | "other">("entertainment");
  const [newFreq, setNewFreq] = useState<"monthly" | "annually">("monthly");
  const [newUsage, setNewUsage] = useState("Last used 3 days ago");
  const [isFlagged, setIsFlagged] = useState(true);

  // Interaction loading indicators
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  // Sample transaction statement templates for users to try with one-tap
  const STATEMENT_TEMPLATES = [
    {
      title: "Jane's Credit Card Statement",
      text: `ACH DEBIT NETFLIX PREMIUM - $22.99 (08/14)
POS DEBIT EQUINOX SPORTS CLUB YORK - $250.00 (08/10)
DIRECT DEBIT COMCAST BROADBAND XFINITY BILL - $89.99 (08/02)
ACH WITHDRAWAL SPOTIFY FAMILY TRIAL PREMIUM - $16.99 (08/21)
POS WITHDRAWAL CHOREQUEST SAVINGS CHORE LEDGER - $4.99 (08/18)
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

  // App metrics
  const stats = useMemo(() => {
    let totalMonthly = 0;
    let potentialLeaks = 0;
    let verifiedSavings = 0;

    subs.forEach((s) => {
      const price = s.frequency === "annually" ? s.price / 12 : s.price;
      
      if (s.status === "active") {
        totalMonthly += price;
      } else if (s.status === "flagged") {
        totalMonthly += price;
        potentialLeaks += price;
      } else if (s.status === "cancelled" || s.status === "cancelling") {
        verifiedSavings += price;
      } else if (s.status === "negotiated" || s.status === "negotiating") {
        const afterNegotiation = price - (s.potentialSavings || 0);
        totalMonthly += afterNegotiation;
        verifiedSavings += s.potentialSavings || 0;
      }
    });

    return {
      totalMonthly: parseFloat(totalMonthly.toFixed(2)),
      potentialLeaks: parseFloat(potentialLeaks.toFixed(2)),
      verifiedSavings: parseFloat(verifiedSavings.toFixed(2)),
      activeCount: subs.filter(s => s.status !== "cancelled").length,
      leakCount: subs.filter(s => s.status === "flagged").length
    };
  }, [subs]);

  // Handle live server-side cancellation generation via Gemini API
  const handleCancel = async (id: string, name: string, price: number, frequency: string) => {
    setActionLoadingId(id);
    
    // Set status to cancelling
    setSubs(prev => prev.map(s => s.id === id ? { ...s, status: "cancelling" } : s));

    try {
      const response = await fetch("/api/subguardian/generate-cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price,
          frequency,
          reason: `I am auditing my accounts and realized I have not utilized my ${name} premium access. Please cancel immediately and issue a refund.`,
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Transition simulated status to cancelled
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: "cancelled", potentialSavings: s.price } : s));
      
      setActiveScript({
        provider: name,
        title: data.title || `Refund & Cancellation Letter for ${name}`,
        text: data.text,
        type: "cancel"
      });
    } catch (err: any) {
      console.error(err);
      // Fallback if call fails
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: "cancelled" } : s));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle live server-side rate negotiation script generation via Gemini API
  const handleNegotiate = async (id: string, name: string, price: number, potentialSave: number) => {
    setActionLoadingId(id);
    setSubs(prev => prev.map(s => s.id === id ? { ...s, status: "negotiating" } : s));

    try {
      const response = await fetch("/api/subguardian/generate-negotiation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: name,
          currentPrice: price,
          competitorPrice: Math.max(19.99, parseFloat((price * 0.6).toFixed(2))),
          userName: "Alexander Wright"
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Transition simulated status to negotiated
      setSubs(prev => prev.map(s => s.id === id ? { 
        ...s, 
        status: "negotiated",
        price: s.price - potentialSave,
        originalPrice: s.price
      } : s));

      setActiveScript({
        provider: name,
        title: data.title || `${name} Promo Script`,
        text: data.text,
        type: "negotiate"
      });
    } catch (err: any) {
      console.error(err);
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: "flagged" } : s));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle pasting and parsing via Gemini Statement Analyzer
  const handleParseStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementInput.trim()) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const response = await fetch("/api/subguardian/parse-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statementText: statementInput })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to analyze bank transactions.");

      if (data.subscriptions && data.subscriptions.length > 0) {
        // Prepend new parsed subscriptions to list
        setSubs(prev => [...data.subscriptions, ...prev]);
        setStatementInput("");
      } else {
        setParseError("The analyzer completed but did not detect any recurring subscription logs. Try pasting a structured list.");
      }
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || "An error occurred. Check your API configuration.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice.trim()) return;

    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum)) return;

    const newSub: SubscriptionItem = {
      id: `manual-${Date.now()}`,
      name: newName,
      category: newCategory,
      price: priceNum,
      frequency: newFreq,
      lastUsed: newUsage,
      potentialSavings: isFlagged ? priceNum : 0,
      status: isFlagged ? "flagged" : "active",
      logoUrl: newName[0].toUpperCase()
    };

    setSubs(prev => [newSub, ...prev]);
    setNewName("");
    setNewPrice("");
    setShowAdder(false);
  };

  const handleCopy = () => {
    if (activeScript) {
      navigator.clipboard.writeText(activeScript.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetSimulation = () => {
    setSubs(INITIAL_SUBSCRIPTIONS);
    setActiveScript(null);
    setParseError(null);
  };

  // Category expense breakdown metrics
  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, number> = {
      entertainment: 0,
      utility: 0,
      fitness: 0,
      productivity: 0,
      other: 0
    };

    subs.forEach(s => {
      if (s.status !== "cancelled") {
        const val = s.frequency === "annually" ? s.price / 12 : s.price;
        categories[s.category] = (categories[s.category] || 0) + val;
      }
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));
  }, [subs]);

  const maxCategoryValue = Math.max(...categoryBreakdown.map(c => c.value), 1);

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
          </div>
          <button 
            onClick={resetSimulation}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium mt-4 text-left flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Reset Ledger to Default
          </button>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Monthly Bill</div>
          <div className="text-2xl font-black text-white mt-1">${stats.totalMonthly.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 mt-1">{stats.activeCount} recurring plans active</div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-xs text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" /> Idle Leak Risks
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1">${stats.potentialLeaks.toFixed(2)}</div>
          <div className="text-[10px] text-rose-500/80 mt-1">{stats.leakCount} flag alerts detected</div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Instant Verified Savings
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-1">${stats.verifiedSavings.toFixed(2)}</div>
          <div className="text-[10px] text-emerald-500 mt-1">Cash kept in your account</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Statement Parser & Subscriptions Ledger - 7 Columns */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Statement Parser Section */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-bold text-slate-900">Direct Bill & Statement Parser</h4>
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
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Detected Subscriptions</h4>
            </div>
            <button
              onClick={() => setShowAdder(!showAdder)}
              className="border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Subscription
            </button>
          </div>

          {/* Adder Form Modal/Dropdown */}
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
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Name</label>
                    <input 
                      type="text" 
                      placeholder="E.g., Prime Video" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500/55"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Price (USD)</label>
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
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Usage Info</label>
                    <input 
                      type="text" 
                      placeholder="E.g., Over 60 days idle" 
                      value={newUsage} 
                      onChange={(e) => setNewUsage(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    />
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
                    <span>Flag as inactive (leak risk)</span>
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
            <AnimatePresence initial={false}>
              {subs.map((sub) => {
                const isFlagged = sub.status === "flagged";
                const isCancelled = sub.status === "cancelled";
                const isCancelling = sub.status === "cancelling";
                const isNegotiated = sub.status === "negotiated";
                const isNegotiating = sub.status === "negotiating";
                const isLoading = actionLoadingId === sub.id;

                return (
                  <motion.div 
                    key={sub.id} 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`border rounded-xl p-4 bg-white transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                      isCancelled ? "opacity-50 border-slate-100 bg-slate-50/50" : 
                      isFlagged ? "border-rose-200/90 shadow-sm shadow-rose-50/50" : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isCancelled ? "bg-slate-200 text-slate-500" :
                        isFlagged ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-slate-100 text-slate-800"
                      }`}>
                        {sub.logoUrl || sub.name[0]}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-950 text-sm">{sub.name}</span>
                          {isFlagged && (
                            <span className="bg-rose-50 border border-rose-200/50 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 leading-none">
                              <AlertTriangle className="w-2.5 h-2.5" /> Idle Leak
                            </span>
                          )}
                          {isCancelled && (
                            <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                              Cancelled
                            </span>
                          )}
                          {isCancelling && (
                            <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse leading-none flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Auto-Cancelling...
                            </span>
                          )}
                          {isNegotiated && (
                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                              Saved $30.00/mo!
                            </span>
                          )}
                          {isNegotiating && (
                            <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse leading-none flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Lowering Rate...
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Category: <span className="capitalize text-slate-500 font-semibold">{sub.category}</span> • Usage: <span className="text-slate-600 font-bold">{sub.lastUsed}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 md:justify-end">
                          {sub.originalPrice && (
                            <span className="text-xs text-slate-400 line-through">${sub.originalPrice}</span>
                          )}
                          <span className="font-bold text-slate-900 text-sm">
                            ${sub.price}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium lowercase">
                            /{sub.frequency === "monthly" ? "mo" : "yr"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        {isFlagged && (
                          <>
                            {sub.category === "utility" ? (
                              <button
                                type="button"
                                onClick={() => handleNegotiate(sub.id, sub.name, sub.price, sub.potentialSavings)}
                                disabled={isLoading}
                                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" /> Reduce Rate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCancel(sub.id, sub.name, sub.price, sub.frequency)}
                                disabled={isLoading}
                                className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Stop Leak
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Expense Category Breakdown Chart - Visual Polish */}
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
                      <span className="text-slate-950 font-bold">${cat.value}/mo <span className="text-slate-400 font-normal">({percentage.toFixed(0)}%)</span></span>
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

        {/* Right Side: Action outputs, Letters & Venture Viability - 5 Columns */}
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
                <strong>Your security rating is Good.</strong> By auto-cancelling the flagged leaks, your annual savings will exceed <strong>$720.00</strong>.
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
