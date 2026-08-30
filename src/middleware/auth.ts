// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
  };
  dbUser?: {
    id: number;
    uid: string;
    email: string;
    name?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeSubscriptionStatus?: string | null;
    premium: boolean;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email || '';
    const name = decodedToken.name || '';
    
    req.user = {
      uid: decodedToken.uid,
      email: email,
      name: name,
    };

    // Upsert user into Cloud SQL database securely to handle concurrent insertions
    try {
      const result = await db.insert(users)
        .values({
          uid: decodedToken.uid,
          email: email,
          name: name || null,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email: email,
            name: name || null,
          },
        })
        .returning();

      req.dbUser = result[0];
    } catch (dbError) {
      console.error("Database user registration failed, falling back to read:", dbError);
      const existing = await db.select().from(users).where(eq(users.uid, decodedToken.uid));
      if (existing.length > 0) {
        req.dbUser = existing[0];
      } else {
        throw new Error("Unable to create or retrieve database user representation.");
      }
    }

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
