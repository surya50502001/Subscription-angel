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
  id: number;
  userId: number;
  provider: string;
  name: string;
  category: "entertainment" | "utility" | "fitness" | "productivity" | "other" | string;
  amount: number;
  currency: string; // 'USD' or 'INR'
  frequency: "monthly" | "annually" | string;
  lastTransactionDate?: string | null;
  status: "active" | "flagged" | "cancellation_requested" | "awaiting_confirmation" | "cancelled" | "verified_cancelled";
  potentialSavings: number;
  confirmedSavings: number;
  virtualCardId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  
  // Frontend dynamic items for compatibility
  observed?: {
    merchant: string;
    amount: number;
    currency: string;
    date: string;
    frequency: string;
    description: string;
  };
  inferred?: {
    likelyRecurring: boolean;
    likelySubscription: boolean;
    possibleCategory: string;
    estimatedSavings: number;
  };
  unknown?: {
    actualServiceUsage: string;
    whetherUserWantsService: string;
    cancellationEligibility: string;
    refundEligibility: string;
  };
}

export interface PredefinedIdea {
  id: string;
  title: string;
  shortDesc: string;
  prompt: string;
  icon: string;
}

export interface VirtualCard {
  id: number;
  userId: number;
  providerId: string;
  externalCardId: string;
  status: "pending" | "active" | "frozen" | "terminated" | "failed";
  last4: string;
  brand: string;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
}

