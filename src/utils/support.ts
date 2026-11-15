export type SupportTicketCategory =
  | 'bug'
  | 'translation'
  | 'maps'
  | 'budget'
  | 'account'
  | 'content'
  | 'other';

export type SupportTicketSeverity = 'low' | 'medium' | 'high' | 'urgent';

export type SupportTicketStatus = 'open' | 'in_review' | 'resolved';

export type SupportAffectedArea =
  | 'explore'
  | 'learn'
  | 'itinerary'
  | 'budget'
  | 'safety'
  | 'published';

export interface SupportTicketItem {
  id: string;
  ticketRef: string;
  category: SupportTicketCategory;
  severity: SupportTicketSeverity;
  area: SupportAffectedArea;
  subject: string;
  description: string;
  contactEmail: string;
  cityContext: string;
  diagnostics: string;
  status: SupportTicketStatus;
  resolutionNote: string;
  createdAtLabel: string;
}

export interface SupportTicketInput {
  subject: string;
  description: string;
  contactEmail?: string;
}

export interface SupportValidationResult {
  valid: boolean;
  errors: Partial<Record<'subject' | 'description' | 'contactEmail', string>>;
}

export function validateSupportTicket(input: SupportTicketInput): SupportValidationResult {
  const errors: SupportValidationResult['errors'] = {};
  const subject = input.subject.trim();
  const description = input.description.trim();
  const email = (input.contactEmail ?? '').trim();

  if (subject.length < 3) {
    errors.subject = 'Please enter a short summary (at least 3 characters).';
  } else if (subject.length > 100) {
    errors.subject = 'Summary must be 100 characters or fewer.';
  }

  if (description.length < 10) {
    errors.description = 'Describe what happened in at least 10 characters.';
  } else if (description.length > 1000) {
    errors.description = 'Description must be 1000 characters or fewer.';
  }

  if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.contactEmail = 'Please enter a valid contact email address or leave blank.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function buildSupportTicketRef(id: string): string {
  const digits = id.replace(/\D/g, '');
  const suffix = digits.slice(-6).padStart(6, '0');
  return `TG-${suffix}`;
}

export function estimateSupportResponseSla(severity: SupportTicketSeverity): string {
  switch (severity) {
    case 'urgent':
      return 'Target response: under 2 hours';
    case 'high':
      return 'Target response: under 6 hours';
    case 'medium':
      return 'Target response: within 24 hours';
    case 'low':
    default:
      return 'Target response: 1–2 business days';
  }
}

export function filterSupportTickets(
  tickets: SupportTicketItem[],
  statusFilter: 'all' | SupportTicketStatus,
  searchQuery: string
): SupportTicketItem[] {
  const q = searchQuery.trim().toLowerCase();
  return tickets.filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) {
      return false;
    }
    if (!q) return true;
    return (
      ticket.subject.toLowerCase().includes(q) ||
      ticket.description.toLowerCase().includes(q) ||
      ticket.ticketRef.toLowerCase().includes(q) ||
      ticket.category.toLowerCase().includes(q)
    );
  });
}

export interface SupportFaqEntry {
  id: string;
  topic: string;
  question: string;
  answer: string;
}

export const SUPPORT_FAQS: SupportFaqEntry[] = [
  {
    id: 'faq-offline',
    topic: 'Offline & Sync',
    question: 'Do saved cities, expenses, and vault notes work on the Shinkansen or offline?',
    answer:
      'Yes. TabiGuide caches offline city packs locally and enables Cloud Firestore persistent multi-tab caching, so your logged JPY expenses, saved districts, and AES-GCM encrypted documents stay accessible inside tunnels and low-signal areas.',
  },
  {
    id: 'faq-totp',
    topic: 'Vault & 2FA',
    question: 'What if I lose my 2FA authenticator or forget my Vault passphrase?',
    answer:
      'Your Vault documents are encrypted client-side with AES-256-GCM using PBKDF2-derived keys—TabiGuide never transmits or stores your passphrase. You can generate a fresh TOTP authenticator secret in Safety & Vault, while existing encrypted entries always require the passphrase used when sealing them.',
  },
  {
    id: 'faq-fx',
    topic: 'Currency & Budget',
    question: 'How often are JPY to Home Currency exchange rates updated?',
    answer:
      'Rates refresh automatically from open.er-api.com (with automatic fallback to frankfurter.app) when stale, and are cached locally so your totals remain accurate offline. You can force a live rate pull anytime in the Budget tab.',
  },
  {
    id: 'faq-tasks',
    topic: 'Google Maps & Tasks',
    question: 'Why did Google Tasks ask me to sign in again after reloading the page?',
    answer:
      'For your security, Google Workspace OAuth access tokens are kept strictly in browser memory and never written to localStorage. After a full page refresh, click "Sign in with Google" on the Itinerary page to re-authorize your current tab session.',
  },
  {
    id: 'faq-speech',
    topic: 'Translator & Mic',
    question: 'Voice input is disabled or blocked in my browser—how can I practice pronunciation?',
    answer:
      'Browser Web Speech recognition requires HTTPS microphone permission and is unsupported in some browsers (such as Firefox). You can always type Romaji or Kana into the Pronunciation Feedback Lab and click "Score Text" for instant matching and AI phonetics coaching.',
  },
];
