export type ContractCategory =
  | "Job Offer Letter"
  | "Rent / Lease Agreement"
  | "Freelance / Client Contract"
  | "Loan / Terms of Service";

export type ClauseSeverity = "red" | "yellow" | "green";

export interface AuditedClause {
  id: string;
  title: string;
  severity: ClauseSeverity;
  categoryTag: string;
  originalQuote: string;
  plainEnglish: string;
  hinglishExplanation: string;
  financialOrLegalImpact: string;
  recommendedFix: string;
}

export interface NegotiationScripts {
  whatsappPolite: string;
  whatsappHinglish: string;
  formalEmailSubject: string;
  formalEmailBody: string;
  leveragePoints: string[];
}

export interface ContractKeyMetrics {
  lockInOrBondPeriod: string;
  noticePeriod: string;
  penaltyOrDepositRisk: string;
  terminationFairness: string;
}

export interface ContractAuditResult {
  id: string;
  documentTitle: string;
  category: ContractCategory;
  rawExcerpt: string;
  riskScore: number;
  riskVerdict:
    | "High Risk — Negotiate Before Signing"
    | "Moderate Caution — Review Yellow Flags"
    | "Safe & Balanced Agreement";
  executiveSummary: string;
  hinglishSummary: string;
  estimatedFinancialExposure: string;
  keyMetrics: ContractKeyMetrics;
  clauses: AuditedClause[];
  missingProtections: string[];
  negotiationScripts: NegotiationScripts;
  userEmail?: string;
  userName?: string;
  createdAt: string;
  engineSource?: "gemini-ai" | "heuristic-legal-engine";
}

export interface ComparisonParameterRow {
  parameter: string;
  docAValue: string;
  docBValue: string;
  betterOption: "A" | "B" | "Tie";
  whyItMatters: string;
}

export interface ContractComparisonResult {
  id: string;
  comparisonTitle: string;
  docATitle: string;
  docBTitle: string;
  docARiskScore: number;
  docBRiskScore: number;
  winner: "A" | "B";
  winnerName: string;
  verdictSummary: string;
  hinglishVerdict: string;
  financialDifferenceEstimate: string;
  rows: ComparisonParameterRow[];
  createdAt: string;
}

export interface UserProfileSignup {
  id: string;
  fullName: string;
  email: string;
  persona:
    | "Student / Job Seeker"
    | "Tenant / Renter"
    | "Freelancer / Creator"
    | "Working Professional";
  organization: string;
  feedbackNote?: string;
  scansCompleted: number;
  trapsDetected: number;
  estimatedSavingsInr: number;
  createdAt: string;
}
