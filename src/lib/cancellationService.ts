import { db } from "../db/index.ts";
import { subscriptions, cancellationRequests, savingsEvents } from "../db/schema.ts";
import { eq, and } from "drizzle-orm";
import { getProvider, ProviderConfig } from "./providers.ts";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API client safely for cancellation message drafts
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// Helper to handle AI Generation with automatic model fallback
async function generateCancellationDraft(providerName: string, subName: string, amount: number, currency: string, frequency: string, userEmail: string, userName: string, reason: string): Promise<string> {
  const customReason = reason || "Unused account underutilization audit.";
  const prompt = `Draft a highly professional cancellation/refund request message to the customer support team of ${providerName}.
Details:
- Subscription: ${subName}
- Pricing Rate: ${currency} ${amount} (${frequency})
- User profile: Name is ${userName || "Customer"}, Email is ${userEmail}
- Reason for request: "${customReason}"

Generate a clear request, highlighting consumer concerns regarding unintended auto-renewals. Ensure you do not declare or guarantee that any refund is legally guaranteed. Keep it completely precise and polite.`;

  if (!ai) {
    return `Dear Customer Support Team,

Please accept this formal notification that I am requesting the cancellation of my subscription for ${subName} (${currency} ${amount}/${frequency}) effective immediately. 

Account associated email: ${userEmail}
Member name: ${userName || "Valued Customer"}
Reason for cancellation: ${customReason}

Kindly confirm when my account has been successfully closed and confirm that no further recurring billing attempts will be made.

Thank you,
${userName || "Valued Customer"}`;
  }

  const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash"];
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: "You are a professional assistant who drafts clean, clear, and highly professional cancellation and refund letters."
        }
      });
      if (response.text) return response.text;
    } catch (err) {
      console.error(`[Cancellation Service AI Fallback] Error with model ${model}:`, err);
    }
  }

  // Final hardcoded fallback if all AI attempts fail
  return `Dear Customer Support Team,

Please cancel my subscription for ${subName} (${currency} ${amount}/${frequency}) effective immediately.

Account email: ${userEmail}
Account owner: ${userName || "Valued Customer"}
Reason: ${customReason}

Thank you,
${userName || "Valued Customer"}`;
}

// Phase 3: Adapter Architecture
export interface ICancellationAdapter {
  executeCancellation(subscriptionId: number, userId: number): Promise<{
    success: boolean;
    status: "cancelled" | "cancellation_requested" | "awaiting_confirmation" | "failed";
    message: string;
    details?: any;
  }>;
}

export class NetflixCancellationProvider implements ICancellationAdapter {
  async executeCancellation(subscriptionId: number, userId: number) {
    const config = getProvider("netflix");
    return {
      success: false,
      status: "cancellation_requested" as const,
      message: "Netflix does not support automatic cancellation. Guided cancellation is required.",
      details: {
        cancellationUrl: config.cancellationUrl,
        instructions: config.instructions
      }
    };
  }
}

export class SpotifyCancellationProvider implements ICancellationAdapter {
  async executeCancellation(subscriptionId: number, userId: number) {
    const config = getProvider("spotify");
    return {
      success: false,
      status: "cancellation_requested" as const,
      message: "Spotify does not support automatic cancellation. Guided cancellation is required.",
      details: {
        cancellationUrl: config.cancellationUrl,
        instructions: config.instructions
      }
    };
  }
}

export class SubGuardianSandboxCancellationProvider implements ICancellationAdapter {
  async executeCancellation(subscriptionId: number, userId: number) {
    // Legitimate integration sandbox mock that simulates positive backend completion instantly
    return {
      success: true,
      status: "cancelled" as const,
      message: "Successfully executed automated cancellation via SubGuardian Sandbox API integration. The merchant's ledger has been safely updated.",
      details: {
        api_response: "HTTP 200 OK - Subscription cancelled successfully",
        partner_ref: `sg-sandbox-${Date.now()}`
      }
    };
  }
}

// Registry mapping for automatic adapters
export const CANCELLATION_ADAPTERS: Record<string, ICancellationAdapter> = {
  netflix: new NetflixCancellationProvider(),
  spotify: new SpotifyCancellationProvider(),
  subguardian_sandbox: new SubGuardianSandboxCancellationProvider()
};

export function getCancellationAdapter(providerId: string): ICancellationAdapter | null {
  return CANCELLATION_ADAPTERS[providerId] || null;
}

// Phase 2: Cancellation Engine Service Class
export class CancellationService {
  /**
   * Request cancellation for a given user subscription
   */
  static async requestCancellation(
    dbUser: { id: number; email: string; name?: string | null },
    subId: number,
    reason?: string
  ) {
    // 1. Fetch Subscription
    const subList = await db.select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, subId), eq(subscriptions.userId, dbUser.id)));

    if (subList.length === 0) {
      throw new Error("Subscription record not found.");
    }

    const sub = subList[0];
    const providerConfig = getProvider(sub.provider);

    // Guard: Prevent double-canceling already cancelled plans
    if (sub.status === "verified_cancelled" || sub.status === "cancelled") {
      throw new Error("This subscription is already cancelled.");
    }

    // 2. Process according to provider capability (Phase 2 & 3)
    if (providerConfig.cancellationMode === "automatic") {
      const adapter = getCancellationAdapter(providerConfig.providerId);
      if (adapter) {
        try {
          const result = await adapter.executeCancellation(sub.id, dbUser.id);
          if (result.success) {
            // Update subscription to cancelled
            await db.update(subscriptions)
              .set({
                status: "cancelled", // User confirmation or transition
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, sub.id));

            // Record cancellation request in logs
            await db.insert(cancellationRequests)
              .values({
                userId: dbUser.id,
                subscriptionId: sub.id,
                status: "accepted", // Auto completed
                provider: sub.provider,
                cancellationUrl: providerConfig.cancellationUrl,
                generatedMessage: `AUTO_CANCELLED: ${result.message}`,
              });

            return {
              status: "cancelled",
              provider: sub.provider,
              subscriptionName: sub.name,
              amount: sub.amount,
              currency: sub.currency,
              cancellationUrl: providerConfig.cancellationUrl,
              generatedMessage: `Auto-cancellation successful via API: ${result.message}`,
              instructions: "Your automatic cancellation was executed successfully. Please wait to run statement verification to confirm charges have stopped.",
              cancellationMode: "automatic"
            };
          } else {
            console.warn(`Auto-cancel adapter failed, falling back to guided: ${result.message}`);
          }
        } catch (adapterErr: any) {
          console.error("Auto-cancel adapter execution crashed:", adapterErr);
        }
      }
    }

    // Default Fallback: Guided / Assisted Workflow
    const generatedLetter = await generateCancellationDraft(
      sub.provider,
      sub.name,
      sub.amount,
      sub.currency,
      sub.frequency,
      dbUser.email,
      dbUser.name || "Customer",
      reason || "Unused account underutilization audit."
    );

    // Update state to cancellation_requested
    await db.update(subscriptions)
      .set({
        status: "cancellation_requested",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    // Log cancellation request
    await db.insert(cancellationRequests)
      .values({
        userId: dbUser.id,
        subscriptionId: sub.id,
        status: "sent",
        provider: sub.provider,
        cancellationUrl: providerConfig.cancellationUrl,
        generatedMessage: generatedLetter,
      });

    return {
      status: "cancellation_requested",
      provider: sub.provider,
      subscriptionName: sub.name,
      amount: sub.amount,
      currency: sub.currency,
      cancellationUrl: providerConfig.cancellationUrl,
      generatedMessage: generatedLetter,
      instructions: providerConfig.instructions,
      cancellationMode: providerConfig.cancellationMode
    };
  }
}
