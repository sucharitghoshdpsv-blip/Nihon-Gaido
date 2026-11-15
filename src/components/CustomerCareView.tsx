import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Headphones,
  HelpCircle,
  LifeBuoy,
  Mail,
  PhoneCall,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import type { CityGuide, JapaneseThemeId } from '../data/japanData';
import {
  estimateSupportResponseSla,
  filterSupportTickets,
  SUPPORT_FAQS,
  validateSupportTicket,
  type SupportAffectedArea,
  type SupportTicketCategory,
  type SupportTicketItem,
  type SupportTicketSeverity,
  type SupportTicketStatus,
} from '../utils/support';

interface CustomerCareViewProps {
  user: User | null;
  selectedCity: CityGuide;
  themeId: JapaneseThemeId;
  isDarkMode: boolean;
  tickets: SupportTicketItem[];
  onSubmitTicket: (
    ticket: Omit<SupportTicketItem, 'id' | 'ticketRef' | 'status' | 'resolutionNote' | 'createdAtLabel'>
  ) => Promise<SupportTicketItem>;
  onUpdateTicketStatus: (id: string, status: SupportTicketStatus, resolutionNote?: string) => Promise<void>;
  onDeleteTicket: (id: string) => Promise<void>;
}

const CATEGORY_OPTIONS: Array<{ value: SupportTicketCategory; label: string }> = [
  { value: 'bug', label: 'Bug / Visual Display Issue' },
  { value: 'translation', label: 'Translation or AI Accuracy' },
  { value: 'maps', label: 'Maps, Places & Google Tasks' },
  { value: 'budget', label: 'Budget & Currency Converter' },
  { value: 'account', label: 'Account, Sync & 2FA Vault' },
  { value: 'content', label: 'Cultural Tip / Etiquette Feedback' },
  { value: 'other', label: 'General Question / Other' },
];

const AREA_OPTIONS: Array<{ value: SupportAffectedArea; label: string }> = [
  { value: 'explore', label: 'Explore & Translator' },
  { value: 'learn', label: 'Learn Studio' },
  { value: 'itinerary', label: 'Itinerary & Maps' },
  { value: 'budget', label: 'Budget & JPY Converter' },
  { value: 'safety', label: 'Safety, Community & Vault' },
  { value: 'published', label: 'Published Site / Media' },
];

const SEVERITY_OPTIONS: Array<{ value: SupportTicketSeverity; label: string }> = [
  { value: 'low', label: 'Low · Suggestion' },
  { value: 'medium', label: 'Medium · Standard' },
  { value: 'high', label: 'High · Feature Broken' },
  { value: 'urgent', label: 'Urgent · Active Trip Blocker' },
];

export const CustomerCareView: React.FC<CustomerCareViewProps> = ({
  user,
  selectedCity,
  themeId,
  isDarkMode,
  tickets,
  onSubmitTicket,
  onUpdateTicketStatus,
  onDeleteTicket,
}) => {
  // Issue reporting form state
  const [category, setCategory] = useState<SupportTicketCategory>('bug');
  const [severity, setSeverity] = useState<SupportTicketSeverity>('medium');
  const [area, setArea] = useState<SupportAffectedArea>('explore');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [formErrors, setFormErrors] = useState<Partial<Record<'subject' | 'description' | 'contactEmail', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<string | null>(null);

  // Ticket tracking filter state
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicketStatus>('all');
  const [ticketSearch, setTicketSearch] = useState('');
  const [copiedDiag, setCopiedDiag] = useState(false);

  // FAQ state
  const [openFaqId, setOpenFaqId] = useState<string>(SUPPORT_FAQS[0].id);

  const diagnosticSnapshot = useMemo(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'Browser';
    const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
    return `City=${selectedCity.id} | Theme=${themeId}(${isDarkMode ? 'dark' : 'light'}) | Locale=${lang} | Agent=${ua}`;
  }, [selectedCity.id, themeId, isDarkMode]);

  const filteredTickets = useMemo(
    () => filterSupportTickets(tickets, statusFilter, ticketSearch),
    [tickets, statusFilter, ticketSearch]
  );

  const handleCopyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticSnapshot);
      setCopiedDiag(true);
      window.setTimeout(() => setCopiedDiag(false), 2500);
    } catch {
      setCopiedDiag(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitBanner(null);

    const validation = validateSupportTicket({
      subject,
      description,
      contactEmail,
    });
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    try {
      const created = await onSubmitTicket({
        category,
        severity,
        area,
        subject: subject.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        cityContext: selectedCity.id,
        diagnostics: includeDiagnostics ? diagnosticSnapshot.slice(0, 400) : '',
      });
      setSubject('');
      setDescription('');
      setSubmitBanner(
        `Ticket ${created.ticketRef} logged (${estimateSupportResponseSla(created.severity)}). ${
          user ? 'Synced to your encrypted account.' : 'Saved locally in this browser.'
        }`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = tickets.filter((t) => t.status !== 'resolved').length;

  return (
    <div className="space-y-8">
      {/* Top Customer Care Overview Banner */}
      <section className="liquid-glass-elevated rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-accent-token">
            <Headphones className="w-4 h-4" />
            <span>TabiGuide Traveler Customer Care · カスタマーサポート</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-token">
            Report an Issue or Get Live Trip Support
          </h1>
          <p className="text-sm text-secondary-token leading-relaxed">
            Spot a broken visual, inaccurate cultural phrasing, currency mismatch, or sync hiccup? Submit a tracked ticket below or explore instant troubleshooting guides.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
          <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-1">
            <p className="text-xs text-muted-token flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-accent-token" />
              Care Desk Email
            </p>
            <p className="font-mono text-sm font-semibold text-primary-token">care@tabiguide.app</p>
            <p className="text-[11px] text-muted-token">Monitored daily · Bilingual EN/JA</p>
          </div>
          <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-1">
            <p className="text-xs text-muted-token flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-accent-token" />
              24/7 Japan Visitor Hotline
            </p>
            <a
              href="tel:05038162787"
              className="font-mono text-sm font-semibold text-accent-token hover:underline block"
            >
              050-3816-2787
            </a>
            <p className="text-[11px] text-muted-token">JNTO urgent travel &amp; medical help</p>
          </div>
        </div>
      </section>

      {/* Main Grid: Report Issue Form + Ticket Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Report an Issue Form */}
        <section className="lg:col-span-6 liquid-glass rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <LifeBuoy className="w-5 h-5 text-accent-token" />
              <div>
                <h2 className="font-display text-xl font-semibold text-primary-token">
                  Report an Issue
                </h2>
                <p className="text-xs text-muted-token">
                  {estimateSupportResponseSla(severity)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyDiagnostics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium liquid-glass text-secondary-token hover:text-primary-token"
            >
              {copiedDiag ? (
                <>
                  <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-accent-token" />
                  Copy Diagnostics
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="care-category" className="block text-xs font-medium text-secondary-token mb-1">
                  Issue Category
                </label>
                <select
                  id="care-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                  className="w-full rounded-xl px-3 py-2 text-xs sm:text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="care-area" className="block text-xs font-medium text-secondary-token mb-1">
                  Affected Feature
                </label>
                <select
                  id="care-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value as SupportAffectedArea)}
                  className="w-full rounded-xl px-3 py-2 text-xs sm:text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                >
                  {AREA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-secondary-token mb-1.5">
                Priority Level
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    aria-pressed={severity === opt.value}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium text-center transition-colors ${
                      severity === opt.value
                        ? 'bg-accent-token'
                        : 'liquid-glass text-secondary-token hover:text-primary-token'
                    }`}
                  >
                    {opt.label.split(' · ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="care-subject" className="block text-xs font-medium text-secondary-token mb-1">
                Issue Subject *
              </label>
              <input
                id="care-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Kyoto thumbnail missing or Yen rate failed to refresh"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token placeholder:text-muted-token"
              />
              {formErrors.subject && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {formErrors.subject}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="care-description" className="block text-xs font-medium text-secondary-token mb-1">
                What happened &amp; steps to reproduce *
              </label>
              <textarea
                id="care-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what you expected, what you saw instead, and which device or browser you used..."
                className="w-full rounded-xl p-3.5 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token placeholder:text-muted-token"
              />
              {formErrors.description && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {formErrors.description}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="care-email" className="block text-xs font-medium text-secondary-token mb-1">
                Contact Email (Optional for reply updates)
              </label>
              <input
                id="care-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl px-3.5 py-2 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token placeholder:text-muted-token"
              />
              {formErrors.contactEmail && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {formErrors.contactEmail}
                </p>
              )}
            </div>

            <label className="flex items-start gap-2.5 text-xs text-secondary-token cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                Attach safe app context ({selectedCity.id}, {themeId} theme, locale) to speed up troubleshooting.
              </span>
            </label>

            {submitBanner && (
              <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitBanner}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold bg-accent-token disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting Report…' : 'Submit Issue Report'}
            </button>
          </form>
        </section>

        {/* Your Submitted Support Tickets */}
        <section className="lg:col-span-6 liquid-glass rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-primary-token">
                Your Support Tickets
              </h2>
              <p className="text-xs text-muted-token">
                {openCount} active · {tickets.length} total reported
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter tickets by status">
              {(['all', 'open', 'in_review', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                    statusFilter === st
                      ? 'bg-accent-token'
                      : 'liquid-glass text-secondary-token hover:text-primary-token'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-token absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              aria-label="Search support tickets"
              placeholder="Search by ticket reference (TG-...) or keyword..."
              className="w-full rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token placeholder:text-muted-token"
            />
          </div>

          {filteredTickets.length === 0 ? (
            <div className="rounded-xl p-8 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 text-center space-y-1.5">
              <p className="text-sm font-medium text-primary-token">No matching tickets</p>
              <p className="text-xs text-muted-token">
                Submit an issue report on the left or clear your search filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredTickets.map((ticket) => {
                const isResolved = ticket.status === 'resolved';
                return (
                  <article
                    key={ticket.id}
                    className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-token">
                          <span className="text-accent-token font-semibold">{ticket.ticketRef}</span>
                          <span>·</span>
                          <span className="uppercase">{ticket.severity}</span>
                          <span>·</span>
                          <span className="capitalize">{ticket.area}</span>
                          <span>·</span>
                          <span>{ticket.createdAtLabel}</span>
                        </div>
                        <h3 className="font-semibold text-sm text-primary-token break-words">
                          {ticket.subject}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize shrink-0 ${
                          isResolved
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-secondary-token leading-relaxed break-words">
                      {ticket.description}
                    </p>

                    {ticket.resolutionNote && (
                      <p className="text-[11px] text-emerald-400/90 bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
                        Care Note: {ticket.resolutionNote}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-amber-200/10">
                      <span className="text-[11px] text-muted-token">
                        {estimateSupportResponseSla(ticket.severity)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTicketStatus(
                              ticket.id,
                              isResolved ? 'open' : 'resolved',
                              isResolved
                                ? 'Reopened by traveler for follow-up.'
                                : 'Marked resolved by traveler.'
                            )
                          }
                          className="px-2.5 py-1 rounded-lg text-xs font-medium liquid-glass text-accent-token"
                        >
                          {isResolved ? 'Reopen Ticket' : 'Mark Resolved'}
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ticket ${ticket.ticketRef}`}
                          onClick={() => onDeleteTicket(ticket.id)}
                          className="p-1.5 text-muted-token hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Help Center & Common Questions */}
      <section className="liquid-glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-accent-token" />
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-token">
              Quick Help &amp; Troubleshooting Guides
            </h2>
            <p className="text-xs text-muted-token">
              Instant answers for offline access, Google sync, Vault encryption, and speech tools.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {SUPPORT_FAQS.map((faq) => {
            const expanded = openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-xl bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqId(expanded ? '' : faq.id)}
                  aria-expanded={expanded}
                  className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono text-accent-token block">
                      {faq.topic}
                    </span>
                    <span className="text-sm font-semibold text-primary-token">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-accent-token shrink-0 transition-transform ${
                      expanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expanded && (
                  <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-secondary-token leading-relaxed border-t border-black/5 dark:border-amber-200/10">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
