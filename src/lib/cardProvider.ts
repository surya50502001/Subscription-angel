import { db } from "../db/index.ts";
import { virtualCards, cardTransactions } from "../db/schema.ts";
import { eq, and } from "drizzle-orm";

export interface CardDetails {
  id?: number;
  userId: number;
  providerId: string;
  externalCardId: string;
  status: "pending" | "active" | "frozen" | "terminated" | "failed";
  last4: string;
  brand: string;
  currency: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVirtualCardProvider {
  createCard(userId: number, params: { brand?: string; currency?: string }): Promise<CardDetails>;
  freezeCard(userId: number, externalCardId: string): Promise<CardDetails>;
  unfreezeCard(userId: number, externalCardId: string): Promise<CardDetails>;
  terminateCard(userId: number, externalCardId: string): Promise<CardDetails>;
  getCard(userId: number, externalCardId: string): Promise<CardDetails | null>;
}

export class SubGuardianSandboxCardProvider implements IVirtualCardProvider {
  private generateMockLast4(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private generateMockExternalId(): string {
    return `vcard_sb_${Math.random().toString(36).substring(2, 11)}`;
  }

  async createCard(userId: number, params: { brand?: string; currency?: string }): Promise<CardDetails> {
    const externalCardId = this.generateMockExternalId();
    const last4 = this.generateMockLast4();
    const brand = params.brand || "Visa";
    const currency = params.currency || "USD";

    const [newCard] = await db.insert(virtualCards)
      .values({
        userId,
        providerId: "subguardian_sandbox",
        externalCardId,
        status: "active",
        last4,
        brand,
        currency,
      })
      .returning();

    return {
      id: newCard.id,
      userId: newCard.userId,
      providerId: newCard.providerId,
      externalCardId: newCard.externalCardId,
      status: newCard.status as any,
      last4: newCard.last4,
      brand: newCard.brand,
      currency: newCard.currency,
      createdAt: newCard.createdAt || undefined,
      updatedAt: newCard.updatedAt || undefined,
    };
  }

  async freezeCard(userId: number, externalCardId: string): Promise<CardDetails> {
    const [updated] = await db.update(virtualCards)
      .set({ status: "frozen", updatedAt: new Date() })
      .where(and(eq(virtualCards.externalCardId, externalCardId), eq(virtualCards.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error(`Sandbox Card not found with ID ${externalCardId}`);
    }

    return {
      id: updated.id,
      userId: updated.userId,
      providerId: updated.providerId,
      externalCardId: updated.externalCardId,
      status: "frozen",
      last4: updated.last4,
      brand: updated.brand,
      currency: updated.currency,
      createdAt: updated.createdAt || undefined,
      updatedAt: updated.updatedAt || undefined,
    };
  }

  async unfreezeCard(userId: number, externalCardId: string): Promise<CardDetails> {
    const [updated] = await db.update(virtualCards)
      .set({ status: "active", updatedAt: new Date() })
      .where(and(eq(virtualCards.externalCardId, externalCardId), eq(virtualCards.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error(`Sandbox Card not found with ID ${externalCardId}`);
    }

    return {
      id: updated.id,
      userId: updated.userId,
      providerId: updated.providerId,
      externalCardId: updated.externalCardId,
      status: "active",
      last4: updated.last4,
      brand: updated.brand,
      currency: updated.currency,
      createdAt: updated.createdAt || undefined,
      updatedAt: updated.updatedAt || undefined,
    };
  }

  async terminateCard(userId: number, externalCardId: string): Promise<CardDetails> {
    const [updated] = await db.update(virtualCards)
      .set({ status: "terminated", updatedAt: new Date() })
      .where(and(eq(virtualCards.externalCardId, externalCardId), eq(virtualCards.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error(`Sandbox Card not found with ID ${externalCardId}`);
    }

    return {
      id: updated.id,
      userId: updated.userId,
      providerId: updated.providerId,
      externalCardId: updated.externalCardId,
      status: "terminated",
      last4: updated.last4,
      brand: updated.brand,
      currency: updated.currency,
      createdAt: updated.createdAt || undefined,
      updatedAt: updated.updatedAt || undefined,
    };
  }

  async getCard(userId: number, externalCardId: string): Promise<CardDetails | null> {
    const [card] = await db.select()
      .from(virtualCards)
      .where(and(eq(virtualCards.externalCardId, externalCardId), eq(virtualCards.userId, userId)));

    if (!card) return null;

    return {
      id: card.id,
      userId: card.userId,
      providerId: card.providerId,
      externalCardId: card.externalCardId,
      status: card.status as any,
      last4: card.last4,
      brand: card.brand,
      currency: card.currency,
      createdAt: card.createdAt || undefined,
      updatedAt: card.updatedAt || undefined,
    };
  }
}

// Global registry mapping for Virtual Card Issuing Providers
export const CARD_PROVIDERS: Record<string, IVirtualCardProvider> = {
  subguardian_sandbox: new SubGuardianSandboxCardProvider(),
};

export function getCardProvider(): IVirtualCardProvider {
  const configuredProvider = process.env.CARD_PROVIDER;
  if (configuredProvider && CARD_PROVIDERS[configuredProvider]) {
    return CARD_PROVIDERS[configuredProvider];
  }
  // Default fallback is sandbox
  return CARD_PROVIDERS.subguardian_sandbox;
}

export function isRealCardProviderConfigured(): boolean {
  const provider = process.env.CARD_PROVIDER;
  const key = process.env.CARD_PROVIDER_API_KEY;
  return !!(provider && provider !== "subguardian_sandbox" && key);
}

import crypto from "crypto";
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expected = hmac.digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
