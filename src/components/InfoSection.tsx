import { Shield, Sparkles, TrendingUp, Users, DollarSign } from "lucide-react";

export default function InfoSection() {
  return (
    <section id="saas-theory-section" className="bg-white border border-slate-200/80 rounded-xl p-8 mb-10 shadow-sm">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-4">
          The Anatomy of a SaaS Used by Everyone and Gets Money
        </h2>
        <p className="text-slate-600 leading-relaxed mb-6">
          To build a software product that commands a massive audience while easily extracting subscription fees, you cannot rely on nice-to-have features or complex corporate tools. You must focus on a **Direct ROI Utility**—software that mathematically guarantees a net-positive financial result for the user's personal wallet or business ledger.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <h3 className="text-sm font-medium text-slate-950 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" /> Universal Appeal
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every modern consumer has subscription fatigue. From streaming, gaming, and gyms to insurance, broadband, and cloud storage—digital spending leaks are a universal pain point that spans across all demographics.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-950 uppercase tracking-wider mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-600" /> Effortless Pricing Hook
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              If a tool audits your statements, identifies $70 in wasted monthly trials/fees, and cancels them with a tap, it pays for itself. Monetization is friction-free because the user pays a fraction of the *already recovered* cash.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-950 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" /> Negative Churn Loop
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Because bank statements update constantly and forgotten trials arise repeatedly, users keep the guardian running in the background. Unsubscribing feels like exposing your bank account to silent bleeding.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-950 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" /> Organic Virality
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              When users successfully save $120 on their phone bills or cancel a hard-to-reach gym contract via an AI-generated letter, they share their savings screenshots on social networks, driving zero-CAC growth.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
