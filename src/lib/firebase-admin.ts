// src/lib/firebase-admin.ts
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

if (!getApps().length) {
  adminApp = initializeApp({
    projectId: "hopeful-amplifier-xf6jr",
  });
} else {
  adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);
