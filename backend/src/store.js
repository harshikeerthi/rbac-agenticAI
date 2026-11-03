import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Canonical seed data to guarantee 100% reproducible resets across test runs
const CANONICAL_AFFILIATES = [
  {
    id: "aff_alice",
    userId: "usr_aff_alice",
    name: "Alice Rivera",
    email: "alice@techreviews.com",
    website: "https://techreviews.com",
    category: "Consumer Electronics & SaaS",
    assignedManagerId: "usr_mgr_sarah",
    status: "active",
    commissionRate: 15.0,
    referralCode: "ALICE-TECH-2026",
    metrics: {
      totalClicks: 14200,
      totalConversions: 850,
      totalEarnings: 12750.00
    },
    internalNotes: "Top tech influencer. High conversion on productivity software reviews."
  },
  {
    id: "aff_bob",
    userId: "usr_aff_bob",
    name: "Bob Chen",
    email: "bob@fitnessgear.io",
    website: "https://fitnessgear.io",
    category: "Health & Fitness",
    assignedManagerId: "usr_mgr_sarah",
    status: "active",
    commissionRate: 12.5,
    referralCode: "BOB-FIT-2026",
    metrics: {
      totalClicks: 9100,
      totalConversions: 420,
      totalEarnings: 5250.00
    },
    internalNotes: "Fitness and nutrition specialist. Currently testing summer pre-workout campaign."
  },
  {
    id: "aff_charlie",
    userId: "usr_aff_charlie",
    name: "Charlie Gomez",
    email: "charlie@lifestylehub.blog",
    website: "https://lifestylehub.blog",
    category: "Home & Lifestyle",
    assignedManagerId: "usr_mgr_david",
    status: "pending_review",
    commissionRate: 10.0,
    referralCode: "CHARLIE-LIFE-2026",
    metrics: {
      totalClicks: 2100,
      totalConversions: 95,
      totalEarnings: 950.00
    },
    internalNotes: "Assigned to David Kim. Awaiting tax compliance form W-8BEN."
  }
];

const CANONICAL_COMMISSIONS = [
  {
    id: "comm_101",
    affiliateId: "aff_alice",
    affiliateName: "Alice Rivera",
    userId: "usr_aff_alice",
    assignedManagerId: "usr_mgr_sarah",
    amount: 2500.00,
    period: "October 2026",
    status: "paid",
    approvedBy: "usr_admin_alex",
    createdAt: "2026-11-01T09:00:00.000Z"
  },
  {
    id: "comm_102",
    affiliateId: "aff_bob",
    affiliateName: "Bob Chen",
    userId: "usr_aff_bob",
    assignedManagerId: "usr_mgr_sarah",
    amount: 1100.00,
    period: "October 2026",
    status: "pending",
    approvedBy: null,
    createdAt: "2026-11-01T09:15:00.000Z"
  },
  {
    id: "comm_103",
    affiliateId: "aff_charlie",
    affiliateName: "Charlie Gomez",
    userId: "usr_aff_charlie",
    assignedManagerId: "usr_mgr_david",
    amount: 350.00,
    period: "October 2026",
    status: "pending",
    approvedBy: null,
    createdAt: "2026-11-01T09:30:00.000Z"
  }
];

const CANONICAL_LOGS = [
  {
    id: "act_seed_001",
    timestamp: "2026-11-03T12:00:00.000Z",
    userId: "system",
    userRole: "system",
    method: "BOOT",
    endpoint: "/system/init",
    requiredPermission: "none",
    outcome: "ALLOWED",
    statusCode: 200,
    details: "Affiliate Access Lab security subsystem initialized."
  }
];

// In-memory working copies for low-latency operations and test isolation
let roles = {};
let users = [];
let affiliates = [];
let commissions = [];
let activityLogs = [];

// Helper to safely read a JSON file
async function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

// Helper to safely write a JSON file
async function writeJson(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Initialize or reload the store from disk
 */
export async function initStore() {
  roles = await readJson('roles.json');
  users = await readJson('users.json');
  try {
    affiliates = await readJson('affiliates.json');
  } catch {
    affiliates = JSON.parse(JSON.stringify(CANONICAL_AFFILIATES));
  }
  try {
    commissions = await readJson('commissions.json');
  } catch {
    commissions = JSON.parse(JSON.stringify(CANONICAL_COMMISSIONS));
  }
  try {
    activityLogs = await readJson('activity_logs.json');
  } catch {
    activityLogs = JSON.parse(JSON.stringify(CANONICAL_LOGS));
  }
}

/**
 * Reset store to canonical seed data
 */
export async function resetStore() {
  affiliates = JSON.parse(JSON.stringify(CANONICAL_AFFILIATES));
  commissions = JSON.parse(JSON.stringify(CANONICAL_COMMISSIONS));
  activityLogs = JSON.parse(JSON.stringify(CANONICAL_LOGS));

  await writeJson('affiliates.json', affiliates);
  await writeJson('commissions.json', commissions);
  await writeJson('activity_logs.json', activityLogs);

  roles = await readJson('roles.json');
  users = await readJson('users.json');
}

/**
 * Getters for store entities
 */
export function getRoles() {
  return roles;
}

export function getUsers() {
  return users;
}

export function getUserById(userId) {
  return users.find(u => u.id === userId);
}

export function getAffiliates() {
  return affiliates;
}

export function getAffiliateById(id) {
  return affiliates.find(a => a.id === id);
}

export function getCommissions() {
  return commissions;
}

export function getCommissionById(id) {
  return commissions.find(c => c.id === id);
}

export function getActivityLogs() {
  return activityLogs;
}

/**
 * Mutators with persistence to JSON files
 */
export async function addAffiliate(newAffiliate) {
  affiliates.push(newAffiliate);
  await writeJson('affiliates.json', affiliates);
  return newAffiliate;
}

export async function updateAffiliate(id, updates) {
  const index = affiliates.findIndex(a => a.id === id);
  if (index === -1) return null;
  affiliates[index] = { ...affiliates[index], ...updates };
  await writeJson('affiliates.json', affiliates);
  return affiliates[index];
}

export async function deleteAffiliate(id) {
  const index = affiliates.findIndex(a => a.id === id);
  if (index === -1) return false;
  affiliates.splice(index, 1);
  await writeJson('affiliates.json', affiliates);
  return true;
}

export async function approveCommission(commissionId, adminId) {
  const index = commissions.findIndex(c => c.id === commissionId);
  if (index === -1) return null;
  commissions[index] = {
    ...commissions[index],
    status: 'paid',
    approvedBy: adminId,
    approvedAt: new Date().toISOString()
  };
  await writeJson('commissions.json', commissions);
  return commissions[index];
}

export async function logActivity(entry) {
  const logItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  activityLogs.unshift(logItem); // Most recent first
  if (activityLogs.length > 150) {
    activityLogs = activityLogs.slice(0, 150);
  }
  await writeJson('activity_logs.json', activityLogs);
  return logItem;
}
