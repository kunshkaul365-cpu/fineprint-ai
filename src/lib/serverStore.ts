import fs from "fs";
import path from "path";
import {
  ContractAuditResult,
  ContractComparisonResult,
  UserProfileSignup,
} from "@/types/fineprint";
import { isSupabaseConfigured, supabase } from "./supabase";

interface PersistentDatabaseSchema {
  audits: ContractAuditResult[];
  comparisons: ContractComparisonResult[];
  users: UserProfileSignup[];
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "fineprint_db.json");

function readLocalDiskDb(): PersistentDatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        audits: Array.isArray(parsed.audits) ? parsed.audits : [],
        comparisons: Array.isArray(parsed.comparisons) ? parsed.comparisons : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
      };
    }
  } catch {}
  return { audits: [], comparisons: [], users: [] };
}

function writeLocalDiskDb(db: PersistentDatabaseSchema): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch {}
}

export async function getStoredAudits(): Promise<ContractAuditResult[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("contract_audits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          documentTitle: row.document_title,
          category: row.category,
          rawExcerpt: row.raw_excerpt,
          riskScore: row.risk_score,
          riskVerdict: row.risk_verdict,
          executiveSummary: row.executive_summary,
          hinglishSummary: row.hinglish_summary,
          estimatedFinancialExposure: row.estimated_financial_exposure,
          keyMetrics: row.key_metrics,
          clauses: row.clauses,
          missingProtections: row.missing_protections,
          negotiationScripts: row.negotiation_scripts,
          userEmail: row.user_email,
          userName: row.user_name,
          createdAt: row.created_at,
        }));
      }

      const { data: docRows, error: docErr } = await supabase
        .from("Document")
        .select("*")
        .eq("originalFilename", "fineprint_audit")
        .order("createdAt", { ascending: false })
        .limit(50);

      if (!docErr && docRows) {
        return docRows
          .map((r) => {
            try {
              return JSON.parse(r.errorMessage) as ContractAuditResult;
            } catch {
              return null;
            }
          })
          .filter((item): item is ContractAuditResult => item !== null);
      }
    } catch {}
  }

  return readLocalDiskDb().audits;
}

export async function saveAuditToDatabase(
  audit: ContractAuditResult
): Promise<ContractAuditResult> {
  const db = readLocalDiskDb();
  db.audits = [audit, ...db.audits.filter((a) => a.id !== audit.id)];
  writeLocalDiskDb(db);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("contract_audits")
        .insert({
          document_title: audit.documentTitle,
          category: audit.category,
          raw_excerpt: audit.rawExcerpt,
          risk_score: audit.riskScore,
          risk_verdict: audit.riskVerdict,
          executive_summary: audit.executiveSummary,
          hinglish_summary: audit.hinglishSummary,
          estimated_financial_exposure: audit.estimatedFinancialExposure,
          clauses: audit.clauses,
          missing_protections: audit.missingProtections,
          negotiation_scripts: audit.negotiationScripts,
          key_metrics: audit.keyMetrics,
          user_email: audit.userEmail || null,
          user_name: audit.userName || null,
          is_public: true,
        })
        .select("*")
        .single();

      if (!error && data) {
        return { ...audit, id: data.id, createdAt: data.created_at };
      }

      const nowIso = new Date().toISOString();
      await supabase.from("Document").insert({
        id: audit.id,
        title: audit.documentTitle,
        originalFilename: "fineprint_audit",
        storagePath: `/audits/${audit.id}.json`,
        status: "READY",
        pageCount: audit.riskScore,
        errorMessage: JSON.stringify(audit),
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    } catch {}
  }

  return audit;
}

export async function getStoredUsers(): Promise<UserProfileSignup[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          persona: row.persona,
          organization: row.organization || "",
          feedbackNote: row.feedback_note || undefined,
          scansCompleted: row.scans_completed || 1,
          trapsDetected: row.traps_detected || 0,
          estimatedSavingsInr: row.estimated_savings_inr || 0,
          createdAt: row.created_at,
        }));
      }

      const { data: docRows, error: docErr } = await supabase
        .from("Document")
        .select("*")
        .eq("originalFilename", "fineprint_user")
        .order("createdAt", { ascending: false })
        .limit(100);

      if (!docErr && docRows) {
        return docRows
          .map((r) => {
            try {
              return JSON.parse(r.errorMessage) as UserProfileSignup;
            } catch {
              return null;
            }
          })
          .filter((item): item is UserProfileSignup => item !== null);
      }
    } catch {}
  }

  return readLocalDiskDb().users;
}

export async function registerUserSignup(params: {
  fullName: string;
  email: string;
  persona: UserProfileSignup["persona"];
  organization: string;
  feedbackNote?: string;
  estimatedSavingsInr?: number;
}): Promise<UserProfileSignup> {
  const newUser: UserProfileSignup = {
    id: crypto.randomUUID(),
    fullName: params.fullName.trim(),
    email: params.email.trim().toLowerCase(),
    persona: params.persona,
    organization: params.organization.trim(),
    feedbackNote: params.feedbackNote?.trim() || undefined,
    scansCompleted: 1,
    trapsDetected: 1,
    estimatedSavingsInr: params.estimatedSavingsInr || 0,
    createdAt: new Date().toISOString(),
  };

  const db = readLocalDiskDb();
  db.users = [newUser, ...db.users.filter((u) => u.email !== newUser.email)];
  writeLocalDiskDb(db);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(
          {
            email: newUser.email,
            full_name: newUser.fullName,
            persona: newUser.persona,
            organization: newUser.organization,
            feedback_note: newUser.feedbackNote || null,
            scans_completed: 1,
            traps_detected: 1,
            estimated_savings_inr: newUser.estimatedSavingsInr,
          },
          { onConflict: "email" }
        )
        .select("*")
        .single();

      if (!error && data) {
        return { ...newUser, id: data.id, createdAt: data.created_at };
      }

      const nowIso = new Date().toISOString();
      await supabase.from("Document").insert({
        id: newUser.id,
        title: newUser.fullName,
        originalFilename: "fineprint_user",
        storagePath: `/users/${newUser.email}`,
        status: "READY",
        pageCount: 1,
        errorMessage: JSON.stringify(newUser),
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    } catch {}
  }

  return newUser;
}

export async function getStoredComparisons(): Promise<
  ContractComparisonResult[]
> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("contract_comparisons")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          comparisonTitle: row.comparison_title,
          docATitle: row.doc_a_title,
          docBTitle: row.doc_b_title,
          docARiskScore: 50,
          docBRiskScore: 50,
          winner: row.winner === row.doc_a_title ? "A" : "B",
          winnerName: row.winner,
          verdictSummary: row.verdict_summary,
          hinglishVerdict: row.hinglish_verdict,
          financialDifferenceEstimate: "",
          rows: row.comparison_rows || [],
          createdAt: row.created_at,
        }));
      }

      const { data: docRows, error: docErr } = await supabase
        .from("Document")
        .select("*")
        .eq("originalFilename", "fineprint_comparison")
        .order("createdAt", { ascending: false })
        .limit(25);

      if (!docErr && docRows) {
        return docRows
          .map((r) => {
            try {
              return JSON.parse(r.errorMessage) as ContractComparisonResult;
            } catch {
              return null;
            }
          })
          .filter((item): item is ContractComparisonResult => item !== null);
      }
    } catch {}
  }

  return readLocalDiskDb().comparisons;
}

export async function saveComparisonToDatabase(
  comp: ContractComparisonResult
): Promise<ContractComparisonResult> {
  const db = readLocalDiskDb();
  db.comparisons = [comp, ...db.comparisons];
  writeLocalDiskDb(db);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("contract_comparisons")
        .insert({
          comparison_title: comp.comparisonTitle,
          doc_a_title: comp.docATitle,
          doc_b_title: comp.docBTitle,
          winner: comp.winnerName,
          verdict_summary: comp.verdictSummary,
          hinglish_verdict: comp.hinglishVerdict,
          comparison_rows: comp.rows,
        })
        .select("*")
        .single();

      if (!error && data) {
        return { ...comp, id: data.id, createdAt: data.created_at };
      }

      const nowIso = new Date().toISOString();
      await supabase.from("Document").insert({
        id: comp.id,
        title: comp.comparisonTitle,
        originalFilename: "fineprint_comparison",
        storagePath: `/comparisons/${comp.id}.json`,
        status: "READY",
        pageCount: 1,
        errorMessage: JSON.stringify(comp),
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    } catch {}
  }

  return comp;
}
