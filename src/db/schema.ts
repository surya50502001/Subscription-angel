import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, doublePrecision, boolean } from 'drizzle-orm/pg-core';

// Users table (using uid as Firebase user identification)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripeSubscriptionStatus: text('stripe_subscription_status'),
  premium: boolean('premium').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  provider: text('provider').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  amount: doublePrecision('amount').notNull(),
  currency: text('currency').notNull().default('USD'), // 'USD' or 'INR'
  frequency: text('frequency').notNull().default('monthly'), // 'monthly', 'annual', etc.
  lastTransactionDate: text('last_transaction_date'),
  // Status: active, flagged, cancellation_requested, awaiting_confirmation, cancelled, verified_cancelled
  status: text('status').notNull().default('active'),
  nextRenewalDate: timestamp('next_renewal_date'),
  renewalAmount: doublePrecision('renewal_amount'),
  renewalReminderEnabled: boolean('renewal_reminder_enabled').default(true),
  lastReminderSentAt: timestamp('last_reminder_sent_at'),
  potentialSavings: doublePrecision('potential_savings').notNull().default(0),
  confirmedSavings: doublePrecision('confirmed_savings').notNull().default(0),
  virtualCardId: integer('virtual_card_id')
    .references(() => virtualCards.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Virtual Cards table
export const virtualCards = pgTable('virtual_cards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  providerId: text('provider_id').notNull(), // 'subguardian_sandbox' etc.
  externalCardId: text('external_card_id').notNull(),
  status: text('status').notNull().default('active'), // 'pending', 'active', 'frozen', 'terminated', 'failed'
  last4: text('last_4').notNull(),
  brand: text('brand').notNull().default('Visa'),
  currency: text('currency').notNull().default('USD'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Card Transactions table
export const cardTransactions = pgTable('card_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  virtualCardId: integer('virtual_card_id')
    .references(() => virtualCards.id)
    .notNull(),
  externalTransactionId: text('external_transaction_id').notNull().unique(),
  amount: doublePrecision('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull(), // 'approved', 'declined'
  merchant: text('merchant').notNull(),
  declineReason: text('decline_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Transactions table
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  merchant: text('merchant').notNull(),
  amount: doublePrecision('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  transactionDate: text('transaction_date').notNull(),
  description: text('description'),
  recurring: boolean('recurring').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Cancellation Requests table
export const cancellationRequests = pgTable('cancellation_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  subscriptionId: integer('subscription_id')
    .references(() => subscriptions.id)
    .notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'sent', 'failed'
  provider: text('provider').notNull(),
  requestedAt: timestamp('requested_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  cancellationUrl: text('cancellation_url'),
  generatedMessage: text('generated_message'),
});

// Savings Events table
export const savingsEvents = pgTable('savings_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  subscriptionId: integer('subscription_id')
    .references(() => subscriptions.id)
    .notNull(),
  amount: doublePrecision('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  type: text('type').notNull(), // 'cancellation', 'negotiation'
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Renewal Reminders table to prevent duplicate notifications
export const renewalReminders = pgTable('renewal_reminders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id).notNull(),
  renewalDate: timestamp('renewal_date').notNull(),
  daysThreshold: integer('days_threshold').notNull(),
  sentAt: timestamp('sent_at').defaultNow(),
});

// Defining relations for type-safe queries and joins
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  transactions: many(transactions),
  cancellationRequests: many(cancellationRequests),
  savingsEvents: many(savingsEvents),
  renewalReminders: many(renewalReminders),
  virtualCards: many(virtualCards),
  cardTransactions: many(cardTransactions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  virtualCard: one(virtualCards, {
    fields: [subscriptions.virtualCardId],
    references: [virtualCards.id],
  }),
  cancellationRequests: many(cancellationRequests),
  savingsEvents: many(savingsEvents),
  renewalReminders: many(renewalReminders),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const cancellationRequestsRelations = relations(cancellationRequests, ({ one }) => ({
  user: one(users, {
    fields: [cancellationRequests.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [cancellationRequests.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const savingsEventsRelations = relations(savingsEvents, ({ one }) => ({
  user: one(users, {
    fields: [savingsEvents.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [savingsEvents.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const virtualCardsRelations = relations(virtualCards, ({ one, many }) => ({
  user: one(users, {
    fields: [virtualCards.userId],
    references: [users.id],
  }),
  subscriptions: many(subscriptions),
  cardTransactions: many(cardTransactions),
}));

export const cardTransactionsRelations = relations(cardTransactions, ({ one }) => ({
  user: one(users, {
    fields: [cardTransactions.userId],
    references: [users.id],
  }),
  virtualCard: one(virtualCards, {
    fields: [cardTransactions.virtualCardId],
    references: [virtualCards.id],
  }),
}));
