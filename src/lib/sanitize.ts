export const MAX_CONTRACT_CHARS = 15000;
export const MIN_CONTRACT_CHARS = 20;
export const MAX_TITLE_CHARS = 140;
export const MAX_QUESTION_CHARS = 500;

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/gi,
  /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/gi,
  /system\s*prompt\s*:/gi,
  /you\s+are\s+now\s+(?:a|an)\s+/gi,
  /forget\s+everything\s+above/gi,
  /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
];

export function sanitizeContractInput(raw: string): {
  sanitized: string;
  truncated: boolean;
  injectionFlagged: boolean;
} {
  if (!raw || typeof raw !== "string") {
    return { sanitized: "", truncated: false, injectionFlagged: false };
  }

  let cleaned = raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

  let injectionFlagged = false;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      injectionFlagged = true;
      cleaned = cleaned.replace(pattern, "[REDACTED_INSTRUCTION]");
    }
  }

  const truncated = cleaned.length > MAX_CONTRACT_CHARS;
  if (truncated) {
    cleaned = cleaned.slice(0, MAX_CONTRACT_CHARS);
  }

  return {
    sanitized: cleaned,
    truncated,
    injectionFlagged,
  };
}

export function sanitizeShortText(raw: string, maxLen = MAX_TITLE_CHARS): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .trim()
    .slice(0, maxLen);
}
