import { SaaSAnalysis } from "../types";
import { 
  DollarSign, 
  Target, 
  MapPin, 
  RefreshCw, 
  Share2, 
  Flame, 
  Layout, 
  ArrowRight,
  TrendingUp,
  Briefcase
} from "lucide-react";

interface SaasEvaluationProps {
  analysis: SaaSAnalysis;
}

export default function SaasEvaluation({ analysis }: SaasEvaluationProps) {
  const {
    name,
    tagline,
    marketSizeAnalysis,
    monetizationStrategy,
    everydayValueHook,
    launchPlan,
    retentionLoop,
    viralMechanisms,
    exampleLandingHero
  } = analysis;

  return (
    <div id="saas-evaluation-root" className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-8 space-y-10 animate-fade-in">
      {/* Brand & Identity Header */}
      <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/50 mb-3">
            <Flame className="w-3 h-3 text-amber-600 animate-pulse" /> AI Venture Approved
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{name}</h2>
          <p className="text-lg text-slate-500 font-medium mt-1">{tagline}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-right md:min-w-[180px]">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Est. Annual ARPU</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{monetizationStrategy.arpuEstimate || "$45"}</div>
          <div className="text-xs text-slate-500 mt-0.5">Per paying user account</div>
        </div>
      </div>

      {/* Grid: Audience Hook and Levers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-500" /> Market Depth & Audience
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-100">
            {marketSizeAnalysis}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" /> Everyday Value Hook
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-100">
            {everydayValueHook}
          </p>
        </div>
      </div>

      {/* Monetization Model */}
      <div className="space-y-4 pt-6 border-t border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-slate-500" /> Monetization Strategy
          </h3>
          <p className="text-sm text-slate-500 font-medium">Model Type: <span className="text-slate-800 font-semibold">{monetizationStrategy.modelType}</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {monetizationStrategy.pricingTiers?.map((tier, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">{tier.name}</div>
                <div className="text-2xl font-bold text-slate-900 mb-4">{tier.price}</div>
                <ul className="space-y-2.5">
                  {tier.features?.map((feat, fIdx) => (
                    <li key={fIdx} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Growth & Retention Mechanics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-slate-500 animate-spin-slow" /> The Churn Prevention Loop
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-100">
            {retentionLoop}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Share2 className="w-4 h-4 text-slate-500" /> Organic Growth & Virality
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-100">
            {viralMechanisms}
          </p>
        </div>
      </div>

      {/* 30-Day Launch Roadmap */}
      <div className="space-y-4 pt-6 border-t border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-500" /> 30-Day Action Blueprint
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {launchPlan?.map((step, idx) => (
            <div key={idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 relative">
              <div className="absolute top-4 right-4 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-500">
                {step.timeline}
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Phase {idx + 1}</div>
              <h4 className="text-sm font-bold text-slate-950 mb-3">{step.phase}</h4>
              <ul className="space-y-2">
                {step.tasks?.map((task, tIdx) => (
                  <li key={tIdx} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <span className="text-slate-400 font-bold mt-0.5">✓</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Example Landing Hero Mockup */}
      <div className="pt-6 border-t border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Layout className="w-4 h-4 text-slate-500" /> High-Conversion Landing Page Mockup
        </h3>
        <div className="border border-slate-200 rounded-xl bg-slate-950 text-white p-8 relative overflow-hidden shadow-inner">
          <div className="absolute -right-20 -top-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-2xl text-center mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-amber-400 border border-white/10">
              Demo Preview Link
            </span>
            <h4 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {exampleLandingHero.headline}
            </h4>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
              {exampleLandingHero.subheadline}
            </p>
            <div className="pt-2">
              <button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-6 py-3 rounded-full inline-flex items-center gap-2 transition-colors">
                {exampleLandingHero.cta} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
