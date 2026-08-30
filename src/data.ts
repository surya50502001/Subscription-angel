import { PredefinedIdea, SubscriptionItem } from "./types";

export const PREDEFINED_IDEAS: PredefinedIdea[] = [
  {
    id: "sub-guardian",
    title: "Subscription Guardian",
    shortDesc: "Auto-scan bills, find digital leaks, cancel unused plans, and auto-negotiate rates.",
    prompt: "A personal digital expense auditor and bill negotiator that analyzes emails and bank statements to find, warn, and cancel recurring underutilized subscriptions, while auto-generating bill discount requests.",
    icon: "ShieldAlert"
  },
  {
    id: "chore-quest",
    title: "Gamified Kid Saver",
    shortDesc: "Chore tracking, pocket money ledgers, and collaborative family progress boards.",
    prompt: "A gamified chore and financial literacy app for families where kids complete challenges to earn allowances, managed via smart digital savings cards with parental permission loops.",
    icon: "Gamepad2"
  },
  {
    id: "elder-care",
    title: "ElderCare Compass",
    shortDesc: "A simplified companion dashboard for older family check-ins and medical alerts.",
    prompt: "An easy-to-use check-in, medication alert, and cognitive activity hub for seniors, synced with a companion dashboard for family members to prevent caregiver anxiety.",
    icon: "HeartHandshake"
  },
  {
    id: "warranty-safe",
    title: "Warranty Safe & Guard",
    shortDesc: "Scan receipts, track return windows, and alert before warranty policies expire.",
    prompt: "A universal receipt scanner and purchase ledger that automatically extracts return policies, warranty durations, and coordinates automated service claims before they expire.",
    icon: "Receipt"
  },
  {
    id: "meal-prep",
    title: "Eco Meal Prep Engine",
    shortDesc: "Zero-waste recipe planners linked directly to local supermarket deliveries.",
    prompt: "A recipe and meal prep scheduler designed to minimize food waste by building dynamic grocery list plans that perfectly combine ingredients and order them through local grocery APIs with one tap.",
    icon: "Utensils"
  }
];

export const INITIAL_SUBSCRIPTIONS: SubscriptionItem[] = [
  {
    id: "sub-1",
    name: "Netflix Premium",
    category: "entertainment",
    price: 22.99,
    frequency: "monthly",
    lastUsed: "24 days ago",
    potentialSavings: 22.99,
    status: "flagged",
    logoUrl: "N"
  },
  {
    id: "sub-2",
    name: "Comcast Xfinity Broadband",
    category: "utility",
    price: 89.99,
    frequency: "monthly",
    lastUsed: "Daily",
    potentialSavings: 30.00,
    status: "flagged",
    logoUrl: "C"
  },
  {
    id: "sub-3",
    name: "Gym Membership Premium",
    category: "fitness",
    price: 65.00,
    frequency: "monthly",
    lastUsed: "58 days ago",
    potentialSavings: 65.00,
    status: "flagged",
    logoUrl: "G"
  },
  {
    id: "sub-4",
    name: "Spotify Family Premium",
    category: "entertainment",
    price: 16.99,
    frequency: "monthly",
    lastUsed: "Yesterday",
    potentialSavings: 0.00,
    status: "active",
    logoUrl: "S"
  },
  {
    id: "sub-5",
    name: "Adobe Creative Cloud",
    category: "productivity",
    price: 54.99,
    frequency: "monthly",
    lastUsed: "14 days ago",
    potentialSavings: 54.99,
    status: "flagged",
    logoUrl: "A"
  },
  {
    id: "sub-6",
    name: "Notion Pro",
    category: "productivity",
    price: 10.00,
    frequency: "monthly",
    lastUsed: "Today",
    potentialSavings: 0.00,
    status: "active",
    logoUrl: "N"
  },
  {
    id: "sub-7",
    name: "Gymbox Basic Plus",
    category: "fitness",
    price: 120.00,
    frequency: "annually",
    lastUsed: "300 days ago",
    potentialSavings: 120.00,
    status: "flagged",
    logoUrl: "G"
  }
];
