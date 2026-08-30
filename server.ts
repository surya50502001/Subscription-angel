import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Helper to handle AI Generation with automatic model fallback & exponential backoff retry for high demand (503/429)
async function generateContentWithFallback(config: {
  contents: string;
  systemInstruction?: string;
  responseSchema?: any;
  responseMimeType?: string;
}) {
  if (!ai) throw new Error("Google Gen AI client is not initialized.");

  // Priority list of stable flash models.
  const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let retries = 2; // 2 retries per model
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

        // Check for 503 Service Unavailable, 429 Rate Limit, or similar transient high-demand messages
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
          break; // Try next model in list
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with fallback models.");
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint 1: Parse a text bank statement/ledger or bills
app.post("/api/subguardian/parse-statement", async (req, res) => {
  try {
    const { statementText } = req.body;
    if (!statementText || typeof statementText !== "string" || statementText.trim().length === 0) {
      return res.status(400).json({ error: "Statement text is required for analysis." });
    }

    if (!ai) {
      // Fallback response for offline or unconfigured API Key
      console.log("No GEMINI_API_KEY. Using smart simulator analysis...");
      return res.json({
        subscriptions: [
          {
            id: "parsed-1",
            name: "Hulu Subscription Fee",
            category: "entertainment",
            price: 18.99,
            frequency: "monthly",
            lastUsed: "Over 45 days ago",
            potentialSavings: 18.99,
            status: "flagged",
            logoUrl: "H"
          },
          {
            id: "parsed-2",
            name: "Microsoft Office 365 Personal",
            category: "productivity",
            price: 6.99,
            frequency: "monthly",
            lastUsed: "Yesterday",
            potentialSavings: 0.00,
            status: "active",
            logoUrl: "M"
          },
          {
            id: "parsed-3",
            name: "Equinox Luxury Club",
            category: "fitness",
            price: 250.00,
            frequency: "monthly",
            lastUsed: "90+ days ago",
            potentialSavings: 250.00,
            status: "flagged",
            logoUrl: "E"
          }
        ]
      });
    }

    const prompt = `Analyze the following bank statement excerpt, credit card ledger, or text receipt. 
Extract all potential recurring digital subscriptions, utility bills, or memberships. 
For each subscription, classify it, estimate its price, calculate potential savings (if unused/underutilized), and determine if it should be flagged as an active leak.

Statement Content:
"${statementText}"

Ensure the response contains a clean array of subscriptions with categories: 'entertainment', 'utility', 'fitness', 'productivity', or 'other'.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: "You are an expert financial ledger and invoice scanner. Your goal is to scan bank statements and precisely extract billing names, recurring prices, frequency, last usage indications, and flag digital leaks.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["subscriptions"],
        properties: {
          subscriptions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["name", "category", "price", "frequency", "lastUsed", "potentialSavings", "status", "logoUrl"],
              properties: {
                name: { type: Type.STRING },
                category: { 
                  type: Type.STRING, 
                  enum: ["entertainment", "utility", "fitness", "productivity", "other"] 
                },
                price: { type: Type.NUMBER, description: "Monthly or annual cost in USD numeric decimal" },
                frequency: { type: Type.STRING, enum: ["monthly", "annually"] },
                lastUsed: { type: Type.STRING, description: "Description or estimate of last usage, e.g. '30 days ago' or 'Yesterday'" },
                potentialSavings: { type: Type.NUMBER, description: "Wasted money that can be saved" },
                status: { type: Type.STRING, enum: ["active", "flagged"] },
                logoUrl: { type: Type.STRING, description: "A single letter representation for the logo" }
              }
            }
          }
        }
      }
    });

    const text = response.text || "{\"subscriptions\": []}";
    const data = JSON.parse(text);

    // Map each item to include a unique ID
    const subscriptionsWithId = (data.subscriptions || []).map((sub: any, index: number) => ({
      ...sub,
      id: `parsed-${Date.now()}-${index}`
    }));

    res.json({ subscriptions: subscriptionsWithId });
  } catch (error: any) {
    console.error("Failed to parse statement:", error);
    res.status(500).json({ error: error.message || "An error occurred while parsing the statements." });
  }
});

// Endpoint 2: Generate custom trial refund or subscription cancellation letter
app.post("/api/subguardian/generate-cancellation", async (req, res) => {
  try {
    const { name, price, frequency, reason, userName, userEmail } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Subscription name is required." });
    }

    const defaultUserName = userName || "Alexander Wright";
    const defaultUserEmail = userEmail || "alex.wright@example.com";
    const subPrice = price || 19.99;
    const subFreq = frequency || "monthly";
    const customReason = reason || "I forgot to cancel during the trial period and haven't used the account.";

    if (!ai) {
      // Fallback
      return res.json({
        title: `Cancellation and Refund Request for ${name}`,
        text: `Subject: Formal Account Cancellation & Refund Request - ${name}

To the Billing Support Department at ${name},

I am writing to formally request the immediate cancellation of my ${name} subscription account and a full refund of the recent charge of $${subPrice} billed on a ${subFreq} basis.

Reason for request:
"${customReason}"

Since this is an unintended automatic renewal and I have not used or benefited from the premium services since this last billing cycle, I request immediate processing of my cancellation and reimbursement of the fees to my original payment method.

Account Credentials:
- Registered Name: ${defaultUserName}
- Registered Email: ${defaultUserEmail}

Please confirm via email when the refund has been initiated and my account is closed.

Sincerely,
${defaultUserName}`
      });
    }

    const prompt = `Write a highly firm, professional, and consumer-law-aligned subscription cancellation and full refund request letter to the billing support team of ${name}. 
The plan price is $${subPrice} billed ${subFreq}.
User details: Name is ${defaultUserName}, Email is ${defaultUserEmail}.
The reason for cancellation is: "${customReason}".
Reference consumer protection guidelines regarding auto-renewals. Keep it extremely precise, neat, and highly effective.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: "You are a consumer rights specialist who drafts firm, legally grounded, and highly persuasive cancellation letters to tech monopolies."
    });

    res.json({
      title: `Cancellation & Refund Letter for ${name}`,
      text: response.text || ""
    });
  } catch (error: any) {
    console.error("Failed to generate cancellation letter:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating cancellation letter." });
  }
});

// Endpoint 3: Generate utility promo negotiation script
app.post("/api/subguardian/generate-negotiation", async (req, res) => {
  try {
    const { provider, currentPrice, competitorPrice, userName } = req.body;
    if (!provider) {
      return res.status(400).json({ error: "Provider/Company name is required." });
    }

    const price = currentPrice || 89.99;
    const compPrice = competitorPrice || 49.99;
    const name = userName || "Alex";

    if (!ai) {
      // Fallback
      return res.json({
        title: `${provider} Retention Negotiation Guide`,
        text: `[RETAIN DEPT. OUTBOUND CALL SCRIPT]

Agent: "Welcome to loyalty services, my name is Marcus. How can I assist you today?"

You (Polite, firm, ready to cancel):
"Hi Marcus. I am calling to cancel my ${provider} subscription. My bill has crept up to $${price} per month, but a competitor in my neighborhood is offering high-speed service for only $${compPrice} per month with locked pricing. I can't justify paying double the rate anymore."

Agent: "I see you've been with us for a while. Let me check if there are any active promotional deals we can hook onto your address..."

You:
"Thank you. I've been a loyal customer and I'd love to stay, but I need my monthly bill brought down closer to that $${compPrice} mark to remain. If we can apply a loyalty discount of $30/mo, we can avoid the cancellation and hardware return."

[TACTICAL NEGOTIATING STRATEGIES]:
1. Mention competitor names specifically.
2. Emphasize loyalty (how long you have been paying on time).
3. Do not accept their first minor offer (like $5 off). Insist on the retention tier.`
      });
    }

    const prompt = `Generate an elite verbal phone script and negotiation email template for ${userName || "a customer"} trying to lower their bill with ${provider}.
Current monthly charge: $${price}.
Local competitor offer: $${compPrice}.
Provide a step-by-step loyalty negotiation dialogue, including responses to standard loyalty representative pushbacks, to maximize the discount rate.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: "You are an elite consumer contract negotiator who writes high-conversion telephonic customer loyalty retention scripts and rate negotiation scripts."
    });

    res.json({
      title: `Loyalty Negotiation Blueprint for ${provider}`,
      text: response.text || ""
    });
  } catch (error: any) {
    console.error("Failed to generate negotiation script:", error);
    res.status(500).json({ error: error.message || "An error occurred." });
  }
});

// Setup Vite Dev Server / Static Asset Serving
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
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
