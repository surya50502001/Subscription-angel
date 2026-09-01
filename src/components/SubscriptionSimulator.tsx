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
  Loader2,
  CreditCard as CardIcon, 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle,
  Home,
  Clock,
  TrendingDown,
  Settings as SettingsIcon,
  ChevronRight,
  AlertCircle,
  X,
  Calendar,
  Bell,
  Info,
  ChevronDown
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { SubscriptionItem, VirtualCard } from "../types.ts";
import { motion, AnimatePresence } from "motion/react";
import { getProvider } from "../lib/providers.ts";

export const SubscriptionSimulator: React.FC = () => {
  const { user, token, loginWithGoogle, logout } = useAuth();
  
  // App navigation state (Sidebar / Mobile bar)
  const [activeTab, setActiveTab] = useState<"dashboard" | "subscriptions" | "renewals" | "cards" | "savings" | "settings">("dashboard");

  // Ledger lists
  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [linkingSubId, setLinkingSubId] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState("none");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [upcomingRenewals, setUpcomingRenewals] = useState<any[]>([]);

  // Cancellation Wizard Modal
  const [cancellingSub, setCancellingSub] = useState<SubscriptionItem | null>(null);
  const [wizardStep, setWizardStep] = useState<"select_mode" | "processing" | "intervention">("select_mode");
  const [selectedCancelMode, setSelectedCancelMode] = useState<"automatic" | "assisted" | "guided" | null>(null);

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

  // Card charge simulation states
  const [simulatingCardId, setSimulatingCardId] = useState<number | null>(null);
  const [simMerchant, setSimMerchant] = useState("");
  const [simAmount, setSimAmount] = useState("");
  const [simResult, setSimResult] = useState<any>(null);

  // Custom visual toast alerts
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Loading indicator for operations
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Show Toast helper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sample templates for billing statement import
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
      showToast("Could not sync subscription records.", "error");
    } finally {
      setLoadingSubs(false);
    }
  };

  const fetchCards = async () => {
    if (!token) return;
    setLoadingCards(true);
    try {
      const res = await fetch("/api/cards", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards || []);
      }
    } catch (err) {
      console.error("Failed to fetch virtual cards:", err);
      showToast("Could not retrieve virtual security cards.", "error");
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchSubscriptions();
      fetchCards();
    } else {
      setSubs([]);
      setCards([]);
      setIsPremium(false);
    }
  }, [user, token]);

  const handleCreateCard = async (brand: string = "Visa", currency: string = "USD") => {
    if (!token) return;
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ brand, currency })
      });
      if (res.ok) {
        showToast("Virtual Security Card created successfully!");
        await fetchCards();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to issue virtual card.", "error");
      }
    } catch (err) {
      console.error("Error creating card:", err);
    }
  };

  const handleFreezeCard = async (cardId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/cards/${cardId}/freeze`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Card frozen. Future renewal charges will decline.");
        await fetchCards();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to freeze card.", "error");
      }
    } catch (err) {
      console.error("Error freezing card:", err);
    }
  };

  const handleUnfreezeCard = async (cardId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/cards/${cardId}/unfreeze`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Card reactivated successfully.");
        await fetchCards();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to unfreeze card.", "error");
      }
    } catch (err) {
      console.error("Error unfreezing card:", err);
    }
  };

  const handleTerminateCard = async (cardId: number) => {
    if (!token) return;
    if (!confirm("Are you sure you want to permanently delete this virtual card? Future payments to this card will be permanently blocked.")) return;
    try {
      const res = await fetch(`/api/cards/${cardId}/terminate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Virtual card has been permanently destroyed.", "info");
        await fetchCards();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to terminate card.", "error");
      }
    } catch (err) {
      console.error("Error terminating card:", err);
    }
  };

  const handleLinkCard = async (subId: number, cardId: number | null) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/subscriptions/${subId}/link-card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ cardId })
      });
      if (res.ok) {
        showToast(cardId ? "Security card linked to subscription!" : "Card connection unlinked.");
        await fetchSubscriptions();
        setLinkingSubId(null);
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to link card.", "error");
      }
    } catch (err) {
      console.error("Error linking card:", err);
    }
  };

  const handleSimulateCharge = async (cardId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/cards/${cardId}/simulate-charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          merchant: simMerchant || undefined,
          amount: simAmount ? parseFloat(simAmount) : undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data.transaction);
        setSimMerchant("");
        setSimAmount("");
        if (data.transaction.status === "approved") {
          showToast("Simulation successful: Payment Approved!");
        } else {
          showToast(`Simulation declined: ${data.transaction.declineReason || "Card status constraint."}`, "error");
        }
        await fetchCards();
        await fetchSubscriptions();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Simulation failed.", "error");
      }
    } catch (err) {
      console.error("Simulation error:", err);
    }
  };

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
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Stripe Checkout failed:", err);
      showToast(err.message || "Failed to initiate checkout portal.", "error");
    } finally {
      setStripeLoading(false);
    }
  };

  // Step 1: Open the cancellation wizard
  const openCancelWizard = (sub: SubscriptionItem) => {
    const defaultMode = getProvider(sub.provider).cancellationMode || "guided";
    setCancellingSub(sub);
    setSelectedCancelMode(defaultMode as any);
    setWizardStep("select_mode");
  };

  // Step 2: Trigger formal subscription cancellation after mode select
  const handleProceedCancelWizard = async () => {
    if (!cancellingSub || !token) return;
    setWizardStep("processing");
    try {
      const response = await fetch(`/api/subscriptions/${cancellingSub.id}/request-cancel`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: `Unused account identified by SubGuardian leak monitor.`
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await fetchSubscriptions();

      setActiveScript({
        provider: cancellingSub.provider,
        title: `Cancellation Assistant: ${cancellingSub.provider}`,
        text: `${data.generatedMessage}\n\n=========================================\nOFFICIAL CANCELLATION LINK: ${data.cancellationUrl}\nINSTRUCTIONS:\n${data.instructions}`,
        type: "cancel",
        subId: cancellingSub.id
      });
      
      setWizardStep("intervention");
      showToast(`AI Cancellation script ready for ${cancellingSub.provider}!`);
    } catch (err: any) {
      console.error("Cancellation generation failed:", err);
      showToast(err.message || "Failed to initialize cancellation process.", "error");
      setWizardStep("select_mode");
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
      setCancellingSub(null);
      showToast("Cancellation successfully submitted! Awaiting provider confirmation.");
      await fetchSubscriptions();
    } catch (err: any) {
      console.error("Submit cancellation failed:", err);
      showToast(err.message || "Failed to update cancellation state.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Step 1.75: Confirm provider accepted cancellation (transitions to cancelled)
  const handleConfirmProviderAccepted = async (subId: number, freezeLinkedCard: boolean = false) => {
    if (!token) return;
    setActionLoadingId(subId);
    try {
      const response = await fetch(`/api/subscriptions/${subId}/confirm-provider-accepted`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ freezeCard: freezeLinkedCard })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to confirm provider cancellation.");

      setActiveScript(null);
      setCancellingSub(null);
      showToast(data.cardActionMessage || "Cancellation confirmed. We will verify billing has ceased.");
      await fetchSubscriptions();
    } catch (err: any) {
      console.error("Confirm provider cancelled failed:", err);
      showToast(err.message || "Failed to confirm accepted state.", "error");
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
        showToast("No new transactions scanned yet. Awaiting fresh statement parser run.", "info");
        return;
      }

      setActiveScript(null);
      setCancellingSub(null);
      showToast("Cancellation fully verified! Savings have been logged.", "success");
      await fetchSubscriptions();
    } catch (err: any) {
      console.error("Verification confirmation failed:", err);
      showToast(err.message || "Failed to verify cancellation.", "error");
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
      
      setCancellingSub(sub);
      setWizardStep("intervention");
      showToast(`AI loyalty negotiation blueprint generated!`);
    } catch (err: any) {
      console.error("Negotiation failed:", err);
      showToast(err.message || "Failed to generate promo negotiation script.", "error");
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
      if (!response.ok) throw new Error(data.error || "Failed to analyze statement.");

      setStatementInput("");
      showToast("Statement scan completed! New subscriptions flagged.", "success");
      await fetchSubscriptions();
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || "Failed to complete AI scanner parsing.");
    } finally {
      setIsParsing(false);
    }
  };

  // Manually add subscription details
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice.trim() || !token) return;

    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum)) {
      showToast("Please enter a valid numeric price amount.", "error");
      return;
    }

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

      if (!response.ok) throw new Error("Failed to insert subscription record.");

      setNewName("");
      setNewPrice("");
      setShowAdder(false);
      showToast("Subscription manual listing added.");
      await fetchSubscriptions();
    } catch (err: any) {
      console.error("Manual add failed:", err);
      showToast(err.message || "Could not add subscription.", "error");
    }
  };

  const handleCopy = () => {
    if (activeScript) {
      navigator.clipboard.writeText(activeScript.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Script copied to clipboard!");
    }
  };

  // Toggle alert reminders
  const handleToggleReminder = async (subId: number, currentVal: boolean) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/subscriptions/${subId}/reminder`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !currentVal })
      });
      if (response.ok) {
        showToast(!currentVal ? "Renewal email alerts enabled." : "Alerts muted.");
        await fetchSubscriptions();
      } else {
        const data = await response.json();
        showToast(data.error || "Failed to update alerts.", "error");
      }
    } catch (err) {
      console.error("Failed to toggle alert reminder:", err);
    }
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    const symbol = currencyCode === "INR" || currencyCode === "inr" ? "₹" : "$";
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Dynamic calculations
  const stats = useMemo(() => {
    let totalMonthly = 0;
    let potentialLeaks = 0;
    let confirmedSavings = 0;

    subs.forEach((s) => {
      const normalizedAmount = s.frequency === "annually" ? s.amount / 12 : s.amount;
      
      if (s.status === "active" || s.status === "flagged" || s.status === "cancellation_requested" || s.status === "awaiting_confirmation" || s.status === "cancelled") {
        totalMonthly += normalizedAmount;
      }

      if (s.status === "flagged") {
        potentialLeaks += normalizedAmount;
      }

      if (s.status === "verified_cancelled") {
        confirmedSavings += normalizedAmount;
      }
    });

    const activeCount = subs.filter(s => s.status !== "verified_cancelled").length;
    const leakCount = subs.filter(s => s.status === "flagged").length;
    const protectedCount = subs.filter(s => s.status !== "verified_cancelled" && s.virtualCardId !== null).length;

    return {
      totalMonthly,
      potentialLeaks,
      confirmedSavings,
      activeCount,
      leakCount,
      protectedCount
    };
  }, [subs]);

  // Expenses category breakdown
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

  // Custom styling brand gradients and visual representations
  const getBrandColor = (providerName: string) => {
    const norm = providerName.toLowerCase();
    if (norm.includes("netflix")) return "from-red-600 to-red-900 text-white";
    if (norm.includes("spotify")) return "from-emerald-500 to-green-700 text-white";
    if (norm.includes("adobe")) return "from-rose-500 to-red-600 text-white";
    if (norm.includes("hulu")) return "from-emerald-400 to-teal-500 text-slate-950";
    if (norm.includes("chatgpt") || norm.includes("openai")) return "from-teal-600 to-emerald-800 text-white";
    if (norm.includes("equinox") || norm.includes("gym")) return "from-slate-700 to-slate-900 text-white";
    if (norm.includes("comcast") || norm.includes("xfinity")) return "from-indigo-600 to-blue-700 text-white";
    if (norm.includes("youtube") || norm.includes("google")) return "from-red-500 to-rose-600 text-white";
    return "from-slate-600 to-slate-800 text-white";
  };

  const getProviderInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-800 border-emerald-200/50";
      case "flagged":
        return "bg-amber-50 text-amber-800 border-amber-200/50 animate-pulse";
      case "cancellation_requested":
      case "awaiting_confirmation":
        return "bg-indigo-50 text-indigo-800 border-indigo-200/50";
      case "cancelled":
        return "bg-rose-50 text-rose-800 border-rose-200/50";
      case "verified_cancelled":
        return "bg-slate-100 text-slate-500 border-slate-200/50 line-through";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200/50";
    }
  };

  // Skeleton Loading Generator
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="bg-white border border-slate-150 rounded-2xl p-6 space-y-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
            </div>
          </div>
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <div className="h-8 bg-slate-200 rounded flex-1" />
            <div className="h-8 bg-slate-200 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );

  // Auth Guard
  if (!user) {
    return (
      <div id="auth-gate-root" className="max-w-md mx-auto my-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-md text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950">Access Subscription Guardian</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Connect securely with your Google Account to audit statement histories, issue sandboxed safety cards, and deploy AI billing protection.
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
    <div className="min-h-[70vh] flex flex-col md:flex-row gap-8 relative pb-20">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              toast.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" :
              toast.type === "info" ? "bg-slate-50 text-slate-800 border-slate-200" :
              "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
          >
            {toast.type === "error" ? <XCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="w-full md:w-64 shrink-0 bg-white border border-slate-200/80 rounded-2xl p-4 self-start shadow-sm space-y-6 hidden md:block">
        <div className="px-2 pt-2 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            <span className="font-extrabold text-sm text-slate-950 tracking-tight">SubGuardian</span>
          </div>
          <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase border border-slate-200/50">Sandbox</span>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
              activeTab === "dashboard" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              activeTab === "subscriptions" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              Subscriptions
            </div>
            {stats.leakCount > 0 && (
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("renewals")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
              activeTab === "renewals" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            Upcoming Renewals
          </button>
          <button
            onClick={() => setActiveTab("cards")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              activeTab === "cards" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CardIcon className="w-4 h-4" />
              Virtual Cards
            </div>
            {cards.length > 0 && (
              <span className="bg-slate-100 text-[10px] text-slate-700 font-bold px-1.5 py-0.5 rounded-full">{cards.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("savings")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
              activeTab === "savings" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Savings Ledger
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
              activeTab === "settings" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-500 space-y-1.5 leading-normal">
            <p className="font-bold text-slate-700 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-500" /> Privacy Lock Active
            </p>
            <p>Statements and tokens are private. No billing details are exposed to normal interfaces.</p>
          </div>
        </div>
      </aside>

      {/* MOBILE NAV TAB BAR (Bottom fixed) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-40 md:hidden">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold ${
            activeTab === "dashboard" ? "text-slate-950" : "text-slate-400"
          }`}
        >
          <Home className="w-4 h-4 mb-1" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold relative ${
            activeTab === "subscriptions" ? "text-slate-950" : "text-slate-400"
          }`}
        >
          <FileText className="w-4 h-4 mb-1" />
          Ledger
          {stats.leakCount > 0 && <span className="absolute top-2 right-6 w-2 h-2 bg-amber-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab("cards")}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold ${
            activeTab === "cards" ? "text-slate-950" : "text-slate-400"
          }`}
        >
          <CardIcon className="w-4 h-4 mb-1" />
          Cards
        </button>
        <button
          onClick={() => setActiveTab("savings")}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold ${
            activeTab === "savings" ? "text-slate-950" : "text-slate-400"
          }`}
        >
          <TrendingDown className="w-4 h-4 mb-1" />
          Savings
        </button>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 space-y-8 pb-10">

        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Overview</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Your Subscription Protection</h2>
              </div>
              
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 flex items-center gap-3 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-700 font-semibold">{user.email}</span>
                <button onClick={logout} className="text-slate-400 hover:text-rose-600 transition-colors" title="Log Out">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4 Large Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Monthly Spending */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Monthly Spending</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{formatCurrency(stats.totalMonthly, "INR")}</h3>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <span>↓ 12% this month</span>
                  </p>
                </div>
              </div>

              {/* Active Subscriptions */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Protection</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{stats.activeCount} <span className="text-xs text-slate-400 font-normal">plans tracked</span></h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Continuous monitoring active
                  </p>
                </div>
              </div>

              {/* Potential Savings */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Idle Leak Risk</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-amber-600">{formatCurrency(stats.potentialLeaks, "INR")}</h3>
                  <p className="text-[11px] text-amber-600 font-semibold mt-1">
                    {stats.leakCount > 0 ? `${stats.leakCount} leak sources flagged` : "No idle leaks active"}
                  </p>
                </div>
              </div>

              {/* Protected Subscriptions */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Protected Plans</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-emerald-600">{stats.protectedCount} <span className="text-xs text-slate-400 font-normal">secured</span></h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Linked to Sandbox Cards
                  </p>
                </div>
              </div>

            </div>

            {/* Premium Upgrade callout if free */}
            {!isPremium && (
              <div className="bg-gradient-to-r from-amber-50 to-amber-100/30 border border-amber-200/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shrink-0">
                    <Crown className="w-5 h-5 fill-slate-950" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-950">Activate Premium Autopilot Guard</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Unlock cloud SQL durability, AI negotiation assistants, and full premium cancellation protection for just ₹49/month.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={stripeLoading}
                  className="bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl cursor-pointer shrink-0 transition-all shadow-sm"
                >
                  Upgrade Instantly
                </button>
              </div>
            )}

            {/* Two-Column Grid: Renewing Soon and Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Renewing Soon Timeline */}
              <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-500" /> Renewing Soon
                  </h3>
                  <button onClick={() => setActiveTab("renewals")} className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-0.5 transition-colors">
                    View timeline <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {upcomingRenewals.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No active plans scheduled</p>
                    <p className="text-[11px] text-slate-400">Add or scan subscriptions to track upcoming renewal cycles.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {upcomingRenewals.slice(0, 3).map((item) => (
                      <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getBrandColor(item.provider)} flex items-center justify-center font-black text-xs`}>
                            {getProviderInitials(item.provider)}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-950 leading-tight">{item.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{item.frequency}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900">{formatCurrency(item.amount, item.currency)}</span>
                            <span className={`block text-[9px] font-bold mt-0.5 ${item.daysUntilRenewal <= 3 ? "text-rose-500" : "text-slate-500"}`}>
                              In {item.daysUntilRenewal} {item.daysUntilRenewal === 1 ? "day" : "days"}
                            </span>
                          </div>
                          <button
                            onClick={() => setActiveTab("subscriptions")}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200/50 text-slate-800 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spend Category Breakdown */}
              <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-500" /> Expense Allocation
                </h3>
                
                <div className="space-y-4 pt-2">
                  {categoryBreakdown.map((cat, idx) => {
                    const percentage = stats.totalMonthly > 0 ? (cat.value / stats.totalMonthly) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="capitalize text-slate-500 font-semibold">{cat.name}</span>
                          <span className="text-slate-950 font-bold">
                            {formatCurrency(cat.value, "USD")}/mo <span className="text-slate-400 font-normal">({percentage.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-slate-950 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: SUBSCRIPTIONS LEDGER */}
        {activeTab === "subscriptions" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Protection Ledger</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Subscriptions Guard</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdder(!showAdder)}
                  className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Subscription
                </button>
              </div>
            </div>

            {/* Manual Subscription Adder Drawer/Form */}
            <AnimatePresence>
              {showAdder && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden"
                >
                  <form onSubmit={handleManualAdd} className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Add Custom Recurring Charge</h4>
                      <button type="button" onClick={() => setShowAdder(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Provider Name</label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. Netflix, Disney+"
                          className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Price Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={newPrice}
                          onChange={(e) => setNewPrice(e.target.value)}
                          placeholder="e.g. 649.00"
                          className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Currency</label>
                        <select
                          value={newCurrency}
                          onChange={(e) => setNewCurrency(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Billing Frequency</label>
                        <select
                          value={newFreq}
                          onChange={(e) => setNewFreq(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="annually">Annually</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none"
                        >
                          <option value="entertainment">Entertainment</option>
                          <option value="utility">Utility</option>
                          <option value="fitness">Fitness</option>
                          <option value="productivity">Productivity</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer py-2">
                          <input
                            type="checkbox"
                            checked={isFlagged}
                            onChange={(e) => setIsFlagged(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-0 w-4 h-4"
                          />
                          Flag as underutilized leak
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAdder(false)}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-2 px-4 rounded-xl border border-slate-200/60"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-sm"
                      >
                        Save Subscription
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Statement Parser */}
            <div className="bg-slate-55 border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">AI Digital Statement Scanner</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Paste bank or card transaction history. Our parser will instantly catalog subscriptions.</p>
                </div>
              </div>

              <form onSubmit={handleParseStatement} className="space-y-3">
                <textarea
                  rows={3}
                  value={statementInput}
                  onChange={(e) => setStatementInput(e.target.value)}
                  placeholder="Paste billing statement text here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Try Demo Statement:</span>
                    {STATEMENT_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setStatementInput(tmpl.text)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] px-2.5 py-1 rounded-lg transition-colors"
                      >
                        {tmpl.title}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isParsing || !statementInput.trim()}
                    className="bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning logs...
                      </>
                    ) : (
                      <>Run Intelligent Scan</>
                    )}
                  </button>
                </div>
                {parseError && (
                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {parseError}
                  </p>
                )}
              </form>
            </div>

            {/* List Header */}
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Statements Ledger</h3>
            </div>

            {/* Subscriptions Grid Container */}
            {loadingSubs ? (
              renderSkeletons()
            ) : subs.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 bg-white space-y-4">
                <FileText className="w-12 h-12 mx-auto text-slate-300" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-600">No subscriptions protected yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Paste a bank statement above or add custom items to activate SubGuardian leak protection on your accounts.
                  </p>
                </div>
                <button
                  onClick={() => setShowAdder(true)}
                  className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Plan
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subs.map((sub) => {
                  const isLinked = sub.virtualCardId !== null;
                  const linkedCard = cards.find(c => c.id === sub.virtualCardId);
                  
                  return (
                    <div 
                      key={sub.id} 
                      className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition-shadow hover:shadow-md ${
                        sub.status === "verified_cancelled" ? "opacity-70 border-slate-200" : "border-slate-200/80"
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Title, Category, and Status */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getBrandColor(sub.provider)} flex items-center justify-center font-black text-sm`}>
                              {getProviderInitials(sub.provider)}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 leading-tight">{sub.name}</h4>
                              <span className="text-[9px] bg-slate-50 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-wider mt-1 inline-block capitalize">
                                {sub.category}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusStyle(sub.status)}`}>
                            {sub.status === "active" ? "Monitored" : 
                             sub.status === "flagged" ? "Idle Leak" :
                             sub.status === "cancellation_requested" ? "Intervention Begun" :
                             sub.status === "awaiting_confirmation" ? "Pending Provider" :
                             sub.status === "cancelled" ? "Awaiting Statement" : "Savings Logged"}
                          </span>
                        </div>

                        {/* Price Details */}
                        <div className="flex items-baseline justify-between pt-1">
                          <div className="space-y-0.5">
                            <span className="text-2xl font-black text-slate-900">{formatCurrency(sub.amount, sub.currency)}</span>
                            <span className="text-[10px] text-slate-400 capitalize block">Per {sub.frequency}</span>
                          </div>

                          {sub.nextRenewalDate && (
                            <div className="text-right text-[10px] text-slate-400">
                              <span className="font-semibold text-slate-600 block">Next Renewal</span>
                              <span>{new Date(sub.nextRenewalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          )}
                        </div>

                        {/* Connected Card Information */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs">
                            <CardIcon className="w-4 h-4 text-slate-400" />
                            {isLinked && linkedCard ? (
                              <div>
                                <span className="font-bold text-slate-800">Connected Guard</span>
                                <span className="block text-[10px] text-slate-400">•••• {linkedCard.last4} ({linkedCard.brand})</span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-500">Unprotected</span>
                                <span className="block text-[10px] text-amber-600 font-semibold">Subject to forced auto-renewal</span>
                              </div>
                            )}
                          </div>

                          {/* Link Toggle Action */}
                          {linkingSubId === sub.id ? (
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                handleLinkCard(sub.id, val ? parseInt(val) : null);
                              }}
                              className="bg-white border border-slate-200 rounded-lg text-[10px] p-1 text-slate-800"
                              defaultValue={sub.virtualCardId || ""}
                            >
                              <option value="">-- Unlink card --</option>
                              {cards.map(c => (
                                <option key={c.id} value={c.id}>
                                  •••• {c.last4} ({c.brand})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setLinkingSubId(sub.id)}
                              className="text-xs text-slate-500 hover:text-slate-900 font-bold transition-colors cursor-pointer"
                            >
                              {isLinked ? "Change" : "Connect Card"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Action intervention Footer */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleNegotiate(sub)}
                          disabled={actionLoadingId !== null || sub.status === "verified_cancelled"}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200/60 disabled:opacity-50 text-slate-700 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          Reduce Rate
                        </button>

                        <div className="flex items-center gap-2">
                          {sub.status !== "verified_cancelled" && (
                            <>
                              {sub.status === "active" || sub.status === "flagged" ? (
                                <button
                                  type="button"
                                  onClick={() => openCancelWizard(sub)}
                                  disabled={actionLoadingId !== null}
                                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                  Stop Billing
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancellingSub(sub);
                                    setWizardStep("intervention");
                                    setActiveScript({
                                      provider: sub.provider,
                                      title: `Active Interventions: ${sub.provider}`,
                                      text: `Proceed with the active interventions on file for ${sub.provider}.`,
                                      type: "cancel",
                                      subId: sub.id
                                    });
                                  }}
                                  className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all"
                                >
                                  Intervene
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: UPCOMING RENEWALS */}
        {activeTab === "renewals" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Title */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calendar Alerts</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">Upcoming Renewals</h2>
            </div>

            {/* List of upcoming renewals with explicit email alerts toggle */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Upcoming Renewal Schedule</span>
                <span className="text-[10px] text-slate-400">Pulsing dot represents high leak risk (within 7 days)</span>
              </div>

              {upcomingRenewals.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Bell className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">Perfect Record: No renewals scheduled</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    We'll watch your statement logs. If any billing updates are detected, alerts appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-150">
                  {upcomingRenewals.map((item) => {
                    const isUrgent = item.daysUntilRenewal <= 7;
                    const subItem = subs.find(s => s.id === item.id);
                    const alertEnabled = subItem?.renewalReminderEnabled ?? true;

                    return (
                      <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getBrandColor(item.provider)} flex items-center justify-center font-black text-xs shrink-0`}>
                            {getProviderInitials(item.provider)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-950">{item.name}</h4>
                              {isUrgent && (
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Renewal charge: {formatCurrency(item.amount, item.currency)} • {item.frequency}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-8">
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-bold text-slate-800 block">
                              {new Date(item.nextRenewalDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <span className={`text-[10px] font-semibold ${isUrgent ? "text-rose-500" : "text-slate-400"}`}>
                              Due in {item.daysUntilRenewal} {item.daysUntilRenewal === 1 ? "day" : "days"}
                            </span>
                          </div>

                          {/* Alerts Toggle Switch */}
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">Alerts</span>
                            <button
                              type="button"
                              onClick={() => handleToggleReminder(item.id, alertEnabled)}
                              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                                alertEnabled ? "bg-slate-950" : "bg-slate-200"
                              }`}
                            >
                              <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                                alertEnabled ? "translate-x-4.5" : "translate-x-0"
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: VIRTUAL SECURITY CARDS */}
        {activeTab === "cards" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Single-use Security Cards</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Virtual Cards</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreateCard("Visa", "INR")}
                  className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Create Security Card
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl text-xs text-slate-600 leading-normal flex items-start gap-2.5">
              <Info className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block mb-1">How Virtual Safety Cards Stop Leak Subscriptions</span>
                <span>
                  Connect dedicated single-purpose sandboxed cards to Netflix, Spotify, or gym subscriptions. If you initiate a cancellation through SubGuardian and the merchant attempts to continue charges, the transaction declines immediately.
                </span>
              </div>
            </div>

            {loadingCards ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : cards.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 bg-white space-y-4">
                <CardIcon className="w-12 h-12 mx-auto text-slate-300" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-600">No safety cards created</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Issue a dedicated virtual security card and connect it to your recurring billers to completely bypass unwanted auto-renewals.
                  </p>
                </div>
                <button
                  onClick={() => handleCreateCard("Visa", "INR")}
                  className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Issue Security Card
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {cards.map((card) => {
                  const linkedSubs = subs.filter(s => s.virtualCardId === card.id);
                  const isSimulating = simulatingCardId === card.id;

                  return (
                    <div key={card.id} className="space-y-4">
                      
                      {/* Realistic Physical Card Overlay */}
                      <div className="relative w-full h-48 rounded-2xl overflow-hidden group border border-white/10 p-0">
                        {/* Background glowing blurred gradients (placed OUTSIDE the glass container so they are blurred by it) */}
                        {card.status === "active" ? (
                          <>
                            <div className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-emerald-500/40 blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-indigo-500/50 blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                          </>
                        ) : card.status === "frozen" ? (
                          <>
                            <div className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-amber-500/40 blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-orange-500/40 blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                          </>
                        ) : (
                          <>
                            <div className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-rose-500/30 blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-slate-500/40 blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                          </>
                        )}

                        {/* Glass Surface itself */}
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-2xl border border-white/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] rounded-2xl p-6 flex flex-col justify-between overflow-hidden text-white">
                          {/* Diagonal glare/reflection lines */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] via-white/[0.08] to-transparent pointer-events-none" />
                          <div className="absolute -inset-y-12 -inset-x-24 w-40 h-72 bg-white/[0.05] rotate-45 transform -translate-x-full group-hover:translate-x-[350%] transition-transform duration-1000 ease-out pointer-events-none" />

                          <div className="absolute right-0 bottom-0 bg-slate-950/20 text-[9px] uppercase font-black tracking-widest px-4 py-2.5 rounded-tl-xl border-l border-t border-white/15 pointer-events-none text-slate-200 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                            Sandbox / Demo
                          </div>

                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-amber-300 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">SubGuardian Card</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                card.status === "active" ? "bg-emerald-400 animate-pulse" :
                                card.status === "frozen" ? "bg-amber-400" : "bg-rose-400"
                              }`} />
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase border ${
                                card.status === "active" ? "bg-emerald-500/30 text-emerald-100 border-emerald-400/30" :
                                card.status === "frozen" ? "bg-amber-500/30 text-amber-100 border-amber-400/30" :
                                "bg-rose-500/30 text-rose-100 border-rose-400/30"
                              } [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]`}>
                                {card.status}
                              </span>
                            </div>
                          </div>

                          {/* Golden metallic security chip illustration */}
                          <div className="relative z-10 w-9 h-6 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-500 border border-amber-600/30 p-1 flex flex-col justify-between shadow-inner">
                            <div className="w-full h-[1px] bg-amber-800/20" />
                            <div className="w-full h-[1px] bg-amber-800/20" />
                            <div className="absolute top-0 bottom-0 left-[35%] w-[1px] bg-amber-800/20" />
                            <div className="absolute top-0 bottom-0 right-[35%] w-[1px] bg-amber-800/20" />
                          </div>

                          {/* Masked numbers */}
                          <div className="space-y-1 relative z-10">
                            <span className="text-[9px] text-slate-200 font-bold uppercase tracking-wider block [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Card Number</span>
                            <span className="text-lg font-mono tracking-widest block text-white font-bold [text-shadow:0_1.5px_3px_rgba(0,0,0,0.85)]">
                              ••••  ••••  ••••  {card.last4}
                            </span>
                          </div>

                          {/* Footer Card Holders details */}
                          <div className="flex justify-between items-end relative z-10">
                            <div>
                              <span className="text-[8px] text-slate-200 font-bold uppercase block [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">Expiry / CVV</span>
                              <span className="text-[11px] font-mono text-white font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">12/30 • •••</span>
                            </div>
                            <span className="font-black italic text-white text-xs tracking-wider uppercase [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                              {card.brand}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Controls */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Actions</span>
                          <span className="text-xs text-slate-500">Linked plans: {linkedSubs.length}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {card.status === "active" ? (
                            <button
                              onClick={() => handleFreezeCard(card.id)}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Freeze Card
                            </button>
                          ) : card.status === "frozen" ? (
                            <button
                              onClick={() => handleUnfreezeCard(card.id)}
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Unfreeze Card
                            </button>
                          ) : null}

                          {card.status !== "terminated" && (
                            <button
                              onClick={() => handleTerminateCard(card.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Destroy Card
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSimulatingCardId(isSimulating ? null : card.id);
                              setSimResult(null);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Simulate Charge
                          </button>
                        </div>

                        {/* Interactive Sandbox Transaction Simulator Drawer */}
                        {linkedSubs.some(s => s.nextRenewalDate && (new Date(s.nextRenewalDate).getTime() - new Date().getTime()) <= 7 * 24 * 60 * 60 * 1000) && (
                          <div className="text-xs text-rose-500 font-bold">Renewal Alert: Linked plan is renewing soon!</div>
                        )}

                        <AnimatePresence>
                          {isSimulating && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-t border-slate-100 pt-4 space-y-3 overflow-hidden"
                            >
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Interactive Charge Simulator</span>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={simMerchant}
                                  onChange={(e) => setSimMerchant(e.target.value)}
                                  placeholder="Merchant (e.g. Netflix)"
                                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                                <input
                                  type="number"
                                  value={simAmount}
                                  onChange={(e) => setSimAmount(e.target.value)}
                                  placeholder="Amount (e.g. 14.99)"
                                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>

                              <button
                                onClick={() => handleSimulateCharge(card.id)}
                                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs py-2 rounded-xl transition-all"
                              >
                                Trigger Sandbox Transaction Webhook
                              </button>

                              {simResult && (
                                <div className={`p-3 rounded-lg border text-[11px] leading-relaxed font-semibold ${
                                  simResult.status === "approved" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
                                }`}>
                                  <p>Status: {simResult.status.toUpperCase()}</p>
                                  {simResult.declineReason && <p>Decline Reason: {simResult.declineReason}</p>}
                                  <p className="font-normal text-[10px] text-slate-400 mt-0.5">Tx ID: {simResult.externalTransactionId}</p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Connected Subscriptions indicator */}
                        {linkedSubs.length > 0 && (
                          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 space-y-1">
                            <span className="font-bold text-slate-700 block">Connected Plan:</span>
                            {linkedSubs.map(s => (
                              <div key={s.id} className="flex justify-between">
                                <span>{s.name}</span>
                                <span className="font-bold text-slate-700">{formatCurrency(s.amount, s.currency)}/mo</span>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 5: SAVINGS & MILESTONES */}
        {activeTab === "savings" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Title */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Financial Impact Ledger</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">Savings & Milestones</h2>
            </div>

            {/* Total Confirmed Savings Board */}
            <div className="bg-slate-950 text-white rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-1.5 z-10">
                <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest block">Wallet Leak Stop</span>
                <h3 className="text-xl font-bold">Lifetime Verified Savings</h3>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  Every time SubGuardian successfully verifies a cancelled or negotiated subscription, the stopped charges are added to your verified savings pool.
                </p>
              </div>

              <div className="text-center md:text-right shrink-0 z-10">
                <span className="text-4xl font-black text-amber-500">{formatCurrency(stats.confirmedSavings, "INR")}</span>
                <span className="block text-[10px] text-slate-400 uppercase font-bold mt-1">Saved Monthly</span>
              </div>
            </div>

            {/* Achievements & Milestones List */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Milestones Achieved</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0 mt-0.5">✓</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Digital Statement Scanner</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Audited uploaded bank statement texts and successfully identified recurring digital subscriptions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0 mt-0.5">✓</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Virtual Shield Deployment</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Issued sandboxed payment cards and connected them directly to the billing details of active plan lists.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0 mt-0.5">3</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500">Auto Renewal Interventions (Awaiting verification)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Flag active billing records as idle leaks, complete structured cancellations, and upload next month's statements to complete verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Savings List */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Saved Subscriptions</h3>
              {subs.filter(s => s.status === "verified_cancelled").length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No cancelled subscriptions logged yet. Flag and cancel idle plans in the ledger.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {subs.filter(s => s.status === "verified_cancelled").map(s => (
                    <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">{s.name}</span>
                      <span className="text-emerald-600 font-bold">+{formatCurrency(s.amount, s.currency)}/mo</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Title */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">Settings & Billing</h2>
            </div>

            {/* Account Details */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Your Profile</h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block">Account Email</span>
                  <span className="text-slate-900 font-semibold mt-0.5 block">{user.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Protection Tier</span>
                  <span className="text-slate-900 font-semibold mt-0.5 block capitalize flex items-center gap-1.5">
                    {isPremium ? (
                      <>
                        <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Premium protection
                      </>
                    ) : (
                      "Basic Protection Free"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* System Status Metrics */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">System Connections</h3>
              
              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Durable Database (PostgreSQL Cloud SQL)</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-pulse" /> Active Connected
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Antigravity Secure Card Webhook Gateway</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-pulse" /> Listening Active
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Gemini API Parser Node</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-pulse" /> Fully Functional
                  </span>
                </div>
              </div>
            </div>

            {/* Account Log out */}
            <button
              onClick={logout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2.5 px-4 rounded-xl border border-rose-200/40 transition-colors"
            >
              Sign Out Account
            </button>

          </div>
        )}

      </div>

      {/* PREMIUM STEP-BY-STEP CANCELLATION MODAL DIALOG */}
      <AnimatePresence>
        {cancellingSub && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getBrandColor(cancellingSub.provider)} flex items-center justify-center font-black text-xs`}>
                    {getProviderInitials(cancellingSub.provider)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">Cancel {cancellingSub.name}</h3>
                    <span className="text-[10px] text-slate-500 font-bold mt-0.5 block">{formatCurrency(cancellingSub.amount, cancellingSub.currency)} / {cancellingSub.frequency}</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setCancellingSub(null);
                    setActiveScript(null);
                  }} 
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Container with steps */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">

                {/* Step A: Select Mode */}
                {wizardStep === "select_mode" && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">How should SubGuardian handle this?</h4>
                      <p className="text-[11px] text-slate-400 mt-1">Select the preferred intervention level to securely stop merchant billing.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      
                      {/* Automatic Card Option */}
                      <div 
                        onClick={() => setSelectedCancelMode("automatic")}
                        className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-start gap-3 select-none ${
                          selectedCancelMode === "automatic" ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950" : "border-slate-200 hover:border-slate-350"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {selectedCancelMode === "automatic" && <span className="w-2.5 h-2.5 bg-slate-950 rounded-full" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1">⚡ Automatic Cancellation</span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">Instantly stop billing via direct, automated API integration with our sandbox networks.</span>
                        </div>
                      </div>

                      {/* Assisted Card Option */}
                      <div 
                        onClick={() => setSelectedCancelMode("assisted")}
                        className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-start gap-3 select-none ${
                          selectedCancelMode === "assisted" ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950" : "border-slate-200 hover:border-slate-350"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {selectedCancelMode === "assisted" && <span className="w-2.5 h-2.5 bg-slate-950 rounded-full" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1">✋ Assisted Cancellation</span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">Our loyalty negotiation and legal support engine drafts and files requests directly to provider emails.</span>
                        </div>
                      </div>

                      {/* Guided Card Option */}
                      <div 
                        onClick={() => setSelectedCancelMode("guided")}
                        className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-start gap-3 select-none ${
                          selectedCancelMode === "guided" ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950" : "border-slate-200 hover:border-slate-350"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {selectedCancelMode === "guided" && <span className="w-2.5 h-2.5 bg-slate-950 rounded-full" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1">↗ Guided cancellation</span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">Open secure portal link directly, guided by dynamic step-by-step assistant letters.</span>
                        </div>
                      </div>

                    </div>

                    {/* Explanatory sentence box */}
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-[11px] text-slate-600 leading-normal">
                      <span className="font-bold text-slate-800 block mb-1">Method Explanation:</span>
                      {selectedCancelMode === "automatic" && "SubGuardian will automatically communicate with the provider's API to immediately terminate your billing."}
                      {selectedCancelMode === "assisted" && "Our AI engine will compose a custom cancellation letter and handle provider communication for you."}
                      {selectedCancelMode === "guided" && "We'll open Netflix's secure cancellation portal and provide guided, step-by-step instructions."}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setCancellingSub(null)}
                        className="w-1/2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-3 rounded-xl border border-slate-200 text-center"
                      >
                        Keep Subscription
                      </button>
                      <button
                        type="button"
                        onClick={handleProceedCancelWizard}
                        className="w-1/2 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs py-3 rounded-xl shadow-md text-center"
                      >
                        Proceed with Cancellation
                      </button>
                    </div>
                  </div>
                )}

                {/* Step B: Processing Loader */}
                {wizardStep === "processing" && (
                  <div className="py-12 text-center space-y-4">
                    <Loader2 className="w-8 h-8 text-slate-950 animate-spin mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Activating Leak Safeguard...</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                        Generating professional cancellation blueprint and negotiating ruleset for {cancellingSub.provider}...
                      </p>
                    </div>
                  </div>
                )}

                {/* Step C: Intervention Display & AI Letter Letters */}
                {wizardStep === "intervention" && activeScript && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          AI Intervention output
                        </span>
                        <h4 className="text-xs font-black text-slate-900 mt-1.5">{activeScript.title}</h4>
                      </div>

                      <button
                        onClick={handleCopy}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-[10px] text-slate-700 leading-normal overflow-y-auto max-h-[160px] whitespace-pre-wrap select-all">
                      {activeScript.text}
                    </div>

                    <div className="border-t border-slate-100 pt-3.5 space-y-3">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Structured Intervention Steps</span>
                      
                      {cancellingSub.status === "flagged" || cancellingSub.status === "active" || cancellingSub.status === "cancellation_requested" ? (
                        <div className="space-y-2.5">
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Step 1: Submit the generated letter to the merchant via their cancellation portal.
                          </p>
                          <button
                            onClick={() => handleSubmitCancel(cancellingSub.id)}
                            disabled={actionLoadingId !== null}
                            className="w-full bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold py-3 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            I Have Filed This Request with the Provider
                          </button>
                        </div>
                      ) : cancellingSub.status === "awaiting_confirmation" ? (
                        <div className="space-y-2.5">
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Step 2: Wait for the merchant's confirmation email. Once confirmed, tap below.
                          </p>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handleConfirmProviderAccepted(cancellingSub.id, true)}
                              disabled={actionLoadingId !== null}
                              className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold py-3 rounded-xl shadow-sm transition-colors cursor-pointer"
                            >
                              Confirm & Freeze Card
                            </button>
                            <button
                              onClick={() => handleConfirmProviderAccepted(cancellingSub.id, false)}
                              disabled={actionLoadingId !== null}
                              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold py-3 rounded-xl transition-colors cursor-pointer"
                            >
                              Confirm Only
                            </button>
                          </div>
                        </div>
                      ) : cancellingSub.status === "cancelled" ? (
                        <div className="space-y-2.5">
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Step 3: Run statements verification to guarantee the stopped charges have actually ceased billing.
                          </p>
                          <button
                            onClick={() => handleVerifyCancellation(cancellingSub.id)}
                            disabled={actionLoadingId !== null}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl shadow-sm transition-colors cursor-pointer"
                          >
                            Verify Charge Ceased
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-600 font-bold text-center flex items-center justify-center gap-1">
                          <Check className="w-4 h-4" /> Cancellation fully verified! Stopped billing logged.
                        </p>
                      )}
                    </div>
                  </div>
                )}

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default SubscriptionSimulator;
