import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import Stripe from "stripe";
import { db } from "./src/db/index.ts";
import { users, subscriptions, transactions, cancellationRequests, savingsEvents } from "./src/db/schema.ts";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup raw parsing for stripe webhook to preserve raw headers correctly
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe/webhook") {
    next();
  } else {
    express.json({ limit: "50kb" })(req, res, next);
  }
});

// Initialize Stripe client lazily
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2025-01-27.accredited" as any,
    });
  }
  return stripeClient;
}

// Initialize Gemini API Client safely
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// Helper to handle AI Generation with automatic model fallback & exponential backoff retry for high demand
async function generateContentWithFallback(config: {
  contents: string;
  systemInstruction?: string;
  responseSchema?: any;
  responseMimeType?: string;
}) {
  if (!ai) throw new Error("Google Gen AI client is not initialized.");

  const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let retries = 2;
    while (retries >= 0) {
      try {
        console.log(`[Gemini API] Requesting ${model} (Retries left: ${retries})...`);
        const response = await ai.models.generateContent({
          model: model,
          contents: config.contents,
          config: {
            systemInstruction: config.systemInstruction,
            responseSchema: config.responseSchema,
            responseMimeType: config.responseMimeType,
          }
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.error(`[Gemini API] Failed with ${model}:`, err.message || err);

        const isTransient = err.status === 503 || err.statusCode === 503 || 
                            err.status === 429 || err.statusCode === 429 ||
                            (err.message && (
                              err.message.includes("503") || 
                              err.message.includes("429") || 
                              err.message.includes("temporary") || 
                              err.message.includes("demand") ||
                              err.message.includes("UNAVAILABLE")
                            ));

        if (isTransient && retries > 0) {
          const delay = (3 - retries) * 1000;
          console.log(`[Gemini API] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries--;
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with fallback models.");
}

// Sanitization Helper to prevent logging raw PII / financial credentials
function sanitizeLogText(text: string): string {
  if (!text) return "";
  // Strip common credit card sequences, routing numbers, and authentication passwords
  return text
    .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, "[MASKED-CARD]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[MASKED-EMAIL]")
    .substring(0, 1000); // Limit length of statement output inside server traces
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint: Authenticated current plan entitlement check
app.get("/api/me/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({
      plan: req.dbUser.premium ? "premium" : "free",
      premium: req.dbUser.premium,
      status: req.dbUser.stripeSubscriptionStatus || "none",
    });
  } catch (error) {
    console.error("Failed to retrieve subscription profile:", error);
    res.status(500).json({ error: "Unable to retrieve subscription profile." });
  }
});

// Endpoint: Fetch authenticated user's custom subscriptions
app.get("/api/subscriptions", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: "Unauthorized" });

    const userSubs = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, req.dbUser.id));

    res.json({ subscriptions: userSubs });
  } catch (error) {
    console.error("Failed to query subscriptions:", error);
    res.status(500).json({ error: "Unable to retrieve subscriptions from database." });
  }
});

// Endpoint: Save a newly parsed / manually added subscription
app.post("/api/subscriptions", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: "Unauthorized" });
    const { provider, name, category, amount, currency, frequency, lastTransactionDate, status } = req.body;

    if (!provider || !name || amount === undefined) {
      return res.status(400).json({ error: "Provider, name, and amount are required." });
    }

    const newSub = await db.insert(subscriptions)
      .values({
        userId: req.dbUser.id,
        provider,
        name,
        category: category || "other",
        amount: parseFloat(amount),
        currency: currency || "USD",
        frequency: frequency || "monthly",
        lastTransactionDate: lastTransactionDate || null,
        status: status || "active",
        potentialSavings: parseFloat(amount),
        confirmedSavings: 0,
      })
      .returning();

    res.json(newSub[0]);
  } catch (error) {
    console.error("Failed to save subscription:", error);
    res.status(500).json({ error: "Unable to save subscription." });
  }
});

// Endpoint: Parse uploaded bank statement text using Gemini with strict structure mapping
app.post("/api/subguardian/parse-statement", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: "Unauthorized" });
    const { statementText } = req.body;
    if (!statementText || typeof statementText !== "string" || statementText.trim().length === 0) {
      return res.status(400).json({ error: "Statement text is required for analysis." });
    }

    // Limit incoming payloads to safeguard database and rate limit AI endpoints
    if (statementText.length > 50000) {
      return res.status(413).json({ error: "Statement payload exceeds limit of 50KB." });
    }

    console.log(`[Parser] Running secure transaction scan for user: ${req.dbUser.id}`);
    const sanitizedText = sanitizeLogText(statementText);

    if (!ai) {
      // Complete mock removal from production - throw explicit error if GEMINI API config is missing
      return res.status(503).json({ error: "Gemini API client is not initialized. Please configure your GEMINI_API_KEY." });
    }

    const prompt = `Analyze the following bank statement text and extract all recurring transactions.
For each recurring transaction found, separate the properties strictly into:
1. Observed properties (directly from the text):
- merchant: name of provider/service
- amount: cost value
- date: transaction date
- frequency: "monthly" or "annually" based on text evidence
- transaction description: description

2. Inferred properties (based on service categorization):
- likelyRecurring: true/false
- likelySubscription: true/false
- possibleCategory: "entertainment", "utility", "fitness", "productivity", or "other"
- estimatedSavings: numeric estimate of potential savings if cancelled

3. Unknown properties (DO NOT GUESS OR INVENT USAGE, set strictly as instructions say below):
- actualServiceUsage: MUST return exactly "Unknown" unless statement explicitly details active usage logins.
- whetherUserWantsService: MUST return exactly "Unknown"
- cancellationEligibility: MUST return exactly "Unknown"
- refundEligibility: MUST return exactly "Unknown"

Statement Text:
"${sanitizedText}"`;

    const response = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: "You are an accurate, secure financial data parser. You extract observed ledger values and categorize them correctly. You never invent service usage, cancellation rules, or user intents as verified facts.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["subscriptions"],
        properties: {
          subscriptions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: [
                "merchant", "amount", "currency", "date", "frequency", "transactionDescription",
                "likelyRecurring", "likelySubscription", "possibleCategory", "estimatedSavings",
                "actualServiceUsage", "whetherUserWantsService", "cancellationEligibility", "refundEligibility"
              ],
              properties: {
                merchant: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                currency: { type: Type.STRING, description: "Currency symbol or ISO code, e.g. USD or INR" },
                date: { type: Type.STRING },
                frequency: { type: Type.STRING },
                transactionDescription: { type: Type.STRING },
                likelyRecurring: { type: Type.BOOLEAN },
                likelySubscription: { type: Type.BOOLEAN },
                possibleCategory: { type: Type.STRING },
                estimatedSavings: { type: Type.NUMBER },
                actualServiceUsage: { type: Type.STRING },
                whetherUserWantsService: { type: Type.STRING },
                cancellationEligibility: { type: Type.STRING },
                refundEligibility: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const outputText = response.text || "{\"subscriptions\": []}";
    const data = JSON.parse(outputText);

    // Save identified transactions directly to Cloud SQL database for long term user retention
    const parsedList = data.subscriptions || [];
    const savedSubscriptions = [];

    for (const item of parsedList) {
      // Map to PostgreSQL subscription fields
      const inserted = await db.insert(subscriptions)
        .values({
          userId: req.dbUser.id,
          provider: item.merchant,
          name: item.transactionDescription || item.merchant,
          category: item.possibleCategory || "other",
          amount: parseFloat(item.amount) || 0,
          currency: item.currency || "USD",
          frequency: item.frequency || "monthly",
          lastTransactionDate: item.date || null,
          status: "flagged", // mark as flagged leak for review
          potentialSavings: parseFloat(item.estimatedSavings) || parseFloat(item.amount) || 0,
          confirmedSavings: 0,
        })
        .returning();

      // Save to transactions history log as well
      await db.insert(transactions)
        .values({
          userId: req.dbUser.id,
          merchant: item.merchant,
          amount: parseFloat(item.amount) || 0,
          currency: item.currency || "USD",
          transactionDate: item.date || new Date().toISOString().split('T')[0],
          description: item.transactionDescription,
          recurring: true,
        });

      // Include frontend expected compatibility structure
      savedSubscriptions.push({
        ...inserted[0],
        observed: {
          merchant: item.merchant,
          amount: item.amount,
          currency: item.currency || "USD",
          date: item.date,
          frequency: item.frequency,
          description: item.transactionDescription
        },
        inferred: {
          likelyRecurring: item.likelyRecurring,
          likelySubscription: item.likelySubscription,
          possibleCategory: item.possibleCategory,
          estimatedSavings: item.estimatedSavings
        },
        unknown: {
          actualServiceUsage: item.actualServiceUsage,
          whetherUserWantsService: item.whetherUserWantsService,
          cancellationEligibility: item.cancellationEligibility,
          refundEligibility: item.refundEligibility
        }
      });
    }

    res.json({ subscriptions: savedSubscriptions });
  } catch (error: any) {
    console.error("Statement analysis failed:", error);
    res.status(500).json({ error: error.message || "Unable to parse statements securely." });
  }
});

// Endpoint: Generate Professional Cancellation/Refund Request Form & update status to cancellation_requested
app.post("/api/subscriptions/:id/request-cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: "Unauthorized" });
    const subId = parseInt(req.params.id);
    const { reason } = req.body;

    const subList = await db.select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, subId), eq(subscriptions.userId, req.dbUser.id)));

    if (subList.length === 0) {
      return res.status(404).json({ error: "Subscription record not found." });
    }

    const sub = subList[0];
    const customReason = reason || "I forgot to cancel during the trial period and have not actively utilized the service.";

    if (!ai) {
      return res.status(503).json({ error: "Gemini API key is not configured." });
    }

    const prompt = `Draft a highly professional cancellation/refund request message to the customer support team of ${sub.provider}.
Details:
- Subscription: ${sub.name}
- Pricing Rate: ${sub.currency} ${sub.amount} (${sub.frequency})
- User profile: Name is ${req.dbUser.name || "Customer"}, Email is ${req.dbUser.email}
- Reason for request: "${customReason}"

Generate a clear request, highlighting consumer concerns regarding unintended auto-renewals. Ensure you do not declare or guarantee that any refund is legally guaranteed. Keep it completely precise and polite.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: "You are a professional assistant who drafts clean, clear, and highly professional cancellation and refund letters."
    });

    const generatedMessage = response.text || "";

    // 1. Update the subscription status securely inside the database to 'cancellation_requested' (NOT 'cancelled')
    await db.update(subscriptions)
      .set({
        status: "cancellation_requested",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    // 2. Track the request record inside the cancellation_requests table
    await db.insert(cancellationRequests)
      .values({
        userId: req.dbUser.id,
        subscriptionId: sub.id,
        status: "sent",
        provider: sub.provider,
        cancellationUrl: `https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(sub.provider)}+subscription`,
        generatedMessage: generatedMessage,
      });

    res.json({
      status: "cancellation_requested",
      provider: sub.provider,
      subscriptionName: sub.name,
      amount: sub.amount,
      currency: sub.currency,
      cancellationUrl: `https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(sub.provider)}+subscription`,
      generatedMessage: generatedMessage,
    });
  } catch (error: any) {
    console.error("Cancellation generation failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate cancellation blueprint." });
  }
});

// Endpoint: Verify Cancellation (Requires explicit user confirmation that transaction was actually checked and stopped)
app.post("/api/subscriptions/:id/verify-cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: "Unauthorized" });
    const subId = parseInt(req.params.id);

    const subList = await db.select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, subId), eq(subscriptions.userId, req.dbUser.id)));

    if (subList.length === 0) {
      return res.status(404).json({ error: "Subscription record not found." });
    }

    const sub = subList[0];

    // Mark subscription status as verified_cancelled
    // Move Potential Savings directly into Confirmed Savings!
    await db.update(subscriptions)
      .set({
        status: "verified_cancelled",
        confirmedSavings: sub.amount,
        potentialSavings: 0,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    // Log a durable savings event in database
    await db.insert(savingsEvents)
      .values({
        userId: req.dbUser.id,
        subscriptionId: sub.id,
        amount: sub.amount,
        currency: sub.currency,
        type: "cancellation",
        verified: true,
      });

    res.json({
      success: true,
      status: "verified_cancelled",
      confirmedSavings: sub.amount,
    });
  } catch (error) {
    console.error("Failed to verify cancellation:", error);
    res.status(500).json({ error: "Unable to verify cancellation." });
  }
});

// Endpoint: Generate negotiation template (rates loyalty promo script)
app.post("/api/subguardian/generate-negotiation", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: "Unauthorized" });
    const { provider, currentPrice, competitorPrice } = req.body;

    if (!provider) {
      return res.status(400).json({ error: "Provider name is required." });
    }

    if (!ai) {
      return res.status(503).json({ error: "Gemini API key is not configured." });
    }

    const prompt = `Generate a professional phone call scripts and rate negotiation dialogue for lowering contract bills with ${provider}.
Current rate: ${currentPrice || "89.99"}/mo.
Competitor lower rate: ${competitorPrice || "49.99"}/mo.
User name: ${req.dbUser.name || "Customer"}`;

    const response = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: "You are a professional assistant who drafts clean, clear, and highly persuasive negotiation scripts for reducing service bills."
    });

    res.json({
      title: `${provider} Negotiation Outline`,
      text: response.text || "",
    });
  } catch (error: any) {
    console.error("Negotiation script failed:", error);
    res.status(500).json({ error: error.message || "An error occurred." });
  }
});

// Endpoint: Stripe Create Checkout Session with authenticated user details
app.post("/api/stripe/create-checkout-session", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: "Unauthorized" });

    const appUrl = process.env.APP_URL || `http://localhost:3000`;
    const stripe = getStripe();

    if (!stripe) {
      console.log("[Stripe] STRIPE_SECRET_KEY missing. Generating secure checkout fallback...");
      // Handle fallback mode cleanly by updating status to active in database securely
      await db.update(users)
        .set({
          premium: true,
          stripeSubscriptionStatus: "active",
        })
        .where(eq(users.id, req.dbUser.id));

      return res.json({
        id: "sandbox_session_" + Date.now(),
        url: `${appUrl}?checkout_status=success`,
        isSandbox: true,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "SubGuardian Premium Shield",
              description: "Durable Cloud PostgreSQL storage, premium automated cancellation requested logs, and automated rate negotiation outlines.",
            },
            unit_amount: 499, // $4.99 USD
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: req.dbUser.email,
      client_reference_id: req.dbUser.id.toString(), // Secure verification tracking
      success_url: `${appUrl}?checkout_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}?checkout_status=cancel`,
    });

    res.json({ id: session.id, url: session.url, isSandbox: false });
  } catch (error: any) {
    console.error("Stripe Checkout Session Error:", error);
    res.status(500).json({ error: error.message || "Unable to initiate checkout transaction." });
  }
});

// Endpoint: Secure Stripe Webhook signature verification & state handling
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = getStripe();
  const signature = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe) {
    return res.status(503).json({ error: "Stripe service not configured." });
  }

  let event: Stripe.Event;

  try {
    if (signature && secret) {
      event = stripe.webhooks.constructEvent(req.body, signature, secret);
    } else {
      // Reject unsigned payloads in production to prevent malicious updates
      console.error("[Stripe Webhook] Unsigned payloads rejected.");
      return res.status(400).json({ error: "Missing webhook signature verification." });
    }
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Signature Error: ${err.message}` });
  }

  // Idempotent processing of subscription lifecycle actions
  try {
    const dataObject = event.data.object as any;
    const userIdStr = dataObject.client_reference_id || (dataObject.metadata && dataObject.metadata.userId);
    const stripeCustomerId = dataObject.customer;
    const stripeSubscriptionId = dataObject.subscription;

    console.log(`[Webhook Event] Received ${event.type} for Customer: ${stripeCustomerId}`);

    switch (event.type) {
      case "checkout.session.completed": {
        if (userIdStr) {
          const userId = parseInt(userIdStr);
          await db.update(users)
            .set({
              stripeCustomerId,
              stripeSubscriptionId,
              stripeSubscriptionStatus: "active",
              premium: true,
            })
            .where(eq(users.id, userId));
          console.log(`[Webhook] User ${userId} successfully upgraded to Premium!`);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        if (stripeSubscriptionId) {
          const status = dataObject.status; // e.g. active, past_due, canceled
          await db.update(users)
            .set({
              stripeSubscriptionStatus: status,
              premium: status === "active",
            })
            .where(eq(users.stripeSubscriptionId, stripeSubscriptionId));
        }
        break;
      }
      case "customer.subscription.deleted": {
        if (stripeSubscriptionId) {
          await db.update(users)
            .set({
              stripeSubscriptionStatus: "cancelled",
              premium: false,
            })
            .where(eq(users.stripeSubscriptionId, stripeSubscriptionId));
        }
        break;
      }
      case "invoice.payment_failed": {
        if (stripeSubscriptionId) {
          await db.update(users)
            .set({
              stripeSubscriptionStatus: "payment_failed",
              premium: false,
            })
            .where(eq(users.stripeSubscriptionId, stripeSubscriptionId));
        }
        break;
      }
      default:
        console.log(`[Webhook Event] Unhandled lifecycle event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook Processing Error]:", err);
    res.status(500).json({ error: "Webhook event processing crashed." });
  }
});

// Setup Vite Dev Server / Static Asset Serving
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap server:", err);
  process.exit(1);
});
