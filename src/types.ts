export interface PricingTier {
  name: string;
  price: string;
  features: string[];
}

export interface MonetizationStrategy {
  modelType: string;
  pricingTiers: PricingTier[];
  arpuEstimate: string;
}

export interface LaunchPhase {
  phase: string;
  timeline: string;
  tasks: string[];
}

export interface LandingHero {
  headline: string;
  subheadline: string;
  cta: string;
}

export interface SaaSAnalysis {
  name: string;
  tagline: string;
  marketSizeAnalysis: string;
  monetizationStrategy: MonetizationStrategy;
  everydayValueHook: string;
  launchPlan: LaunchPhase[];
  retentionLoop: string;
  viralMechanisms: string;
  exampleLandingHero: LandingHero;
}

export interface SubscriptionItem {
  id: string;
  name: string;
  category: "entertainment" | "utility" | "fitness" | "productivity" | "other";
  price: number;
  frequency: "monthly" | "annually";
  lastUsed: string; // ISO date or description
  potentialSavings: number; // e.g. lower plan available, or unused
  status: "active" | "flagged" | "cancelling" | "cancelled" | "negotiating" | "negotiated";
  originalPrice?: number;
  logoUrl?: string;
}

export interface PredefinedIdea {
  id: string;
  title: string;
  shortDesc: string;
  prompt: string;
  icon: string;
}
