import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSupportTicketRef,
  estimateSupportResponseSla,
  filterSupportTickets,
  validateSupportTicket,
  type SupportTicketItem,
} from './support';

test('validateSupportTicket rejects short subject/description and invalid email', () => {
  const res = validateSupportTicket({
    subject: 'Hi',
    description: 'Too short',
    contactEmail: 'not-an-email',
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.subject);
  assert.ok(res.errors.description);
  assert.ok(res.errors.contactEmail);
});

test('validateSupportTicket accepts valid ticket payload with optional blank email', () => {
  const res = validateSupportTicket({
    subject: 'Kyoto photo not loading on Safari',
    description: 'When opening the published link on iOS Safari, Kyoto thumbnail shows fallback.',
    contactEmail: '',
  });
  assert.equal(res.valid, true);
  assert.deepEqual(res.errors, {});
});

test('buildSupportTicketRef produces consistent TG-prefixed reference', () => {
  assert.equal(buildSupportTicketRef('sup-1794762230326'), 'TG-230326');
  assert.equal(buildSupportTicketRef('sup-42'), 'TG-000042');
});

test('estimateSupportResponseSla maps urgency levels accurately', () => {
  assert.match(estimateSupportResponseSla('urgent'), /under 2 hours/);
  assert.match(estimateSupportResponseSla('high'), /under 6 hours/);
  assert.match(estimateSupportResponseSla('medium'), /24 hours/);
});

test('filterSupportTickets filters by status and search text', () => {
  const sample: SupportTicketItem[] = [
    {
      id: 'sup-100001',
      ticketRef: 'TG-100001',
      category: 'bug',
      severity: 'high',
      area: 'published',
      subject: 'City card images broken on production URL',
      description: 'Destination photos failed to load after deployment.',
      contactEmail: 'traveler@example.com',
      cityContext: 'Tokyo',
      diagnostics: 'Desktop',
      status: 'open',
      resolutionNote: '',
      createdAtLabel: 'Just now',
    },
    {
      id: 'sup-100002',
      ticketRef: 'TG-100002',
      category: 'translation',
      severity: 'low',
      area: 'explore',
      subject: 'Keigo wording feedback for Kansai',
      description: 'Would love Osaka dialect examples in dining mode.',
      contactEmail: '',
      cityContext: 'Osaka',
      diagnostics: 'Mobile',
      status: 'resolved',
      resolutionNote: 'Added to guide.',
      createdAtLabel: '1d ago',
    },
  ];

  assert.equal(filterSupportTickets(sample, 'open', '').length, 1);
  assert.equal(filterSupportTickets(sample, 'all', 'Kansai')[0].ticketRef, 'TG-100002');
  assert.equal(filterSupportTickets(sample, 'resolved', 'production').length, 0);
});
