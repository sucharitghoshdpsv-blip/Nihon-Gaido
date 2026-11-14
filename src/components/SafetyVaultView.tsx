import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import QRCode from 'qrcode';
import {
  Bell,
  BellRing,
  KeyRound,
  Lock,
  MessageCircle,
  PhoneCall,
  Plus,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react';
import {
  CITY_GUIDES,
  EMERGENCY_CONTACTS,
  type CommunityBoardPost,
  type TravelReminderItem,
} from '../data/japanData';
import {
  buildTotpUri,
  decryptVaultPayload,
  encryptVaultPayload,
  generateBase32Secret,
  generateTotpCode,
  verifyTotpCode,
  type EncryptedEnvelope,
} from '../utils/cryptoVault';

export interface StoredVaultRecord {
  id: string;
  label: string;
  docType: 'passport' | 'jrpass' | 'hotel' | 'insurance' | 'visa' | 'other';
  envelope: EncryptedEnvelope;
  createdAtLabel: string;
}

interface DecryptedVaultContent {
  docNumber: string;
  notes: string;
}

interface SafetyVaultViewProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  firestoreStatus: 'online' | 'offline';
  reminders: TravelReminderItem[];
  onAddReminder: (item: Omit<TravelReminderItem, 'id'>) => void;
  onDeleteReminder: (id: string) => void;
  communityPosts: CommunityBoardPost[];
  onAddCommunityPost: (post: Omit<CommunityBoardPost, 'id' | 'authorUid' | 'authorName' | 'createdAtLabel'>) => void;
  vaultItems: StoredVaultRecord[];
  onSaveVaultItem: (record: Omit<StoredVaultRecord, 'id' | 'createdAtLabel'>) => Promise<void>;
  onDeleteVaultItem: (id: string) => Promise<void>;
  totpSecret: string;
  totpVerified: boolean;
  onUpdateTotpState: (secret: string, verified: boolean) => void;
}

export const SafetyVaultView: React.FC<SafetyVaultViewProps> = ({
  user,
  onSignIn,
  onSignOut,
  firestoreStatus,
  reminders,
  onAddReminder,
  onDeleteReminder,
  communityPosts,
  onAddCommunityPost,
  vaultItems,
  onSaveVaultItem,
  onDeleteVaultItem,
  totpSecret,
  totpVerified,
  onUpdateTotpState,
}) => {
  // Reminder form state
  const [remKind, setRemKind] = useState<'shinkansen' | 'flight' | 'ferry' | 'hotel'>('shinkansen');
  const [remCode, setRemCode] = useState('');
  const [remRoute, setRemRoute] = useState('');
  const [remTime, setRemTime] = useState('2026-11-16T09:15');
  const [remGate, setRemGate] = useState('');
  const [notifMessage, setNotifMessage] = useState<string | null>(null);
  const [remError, setRemError] = useState<string | null>(null);

  // Emergency Japanese card toggle
  const [showMedicalCard, setShowMedicalCard] = useState(false);

  // Community board state
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [postCity, setPostCity] = useState<CommunityBoardPost['city']>('Tokyo');
  const [postCategory, setPostCategory] = useState<CommunityBoardPost['category']>('tip');
  const [postMessage, setPostMessage] = useState('');
  const [postError, setPostError] = useState<string | null>(null);

  // TOTP 2FA & Vault Encryption state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [totpCodeInput, setTotpCodeInput] = useState('');
  const [totpError, setTotpError] = useState<string | null>(null);
  const [previewTotpCode, setPreviewTotpCode] = useState<string | null>(null);

  const [vaultPassphrase, setVaultPassphrase] = useState('');
  const [docLabel, setDocLabel] = useState('');
  const [docType, setDocType] = useState<StoredVaultRecord['docType']>('passport');
  const [docNumber, setDocNumber] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [decryptedMap, setDecryptedMap] = useState<Record<string, DecryptedVaultContent>>({});

  useEffect(() => {
    const label = user?.email || 'traveler@tabiguide.app';
    const uri = buildTotpUri(totpSecret, label);
    QRCode.toDataURL(uri, { width: 148, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [totpSecret, user?.email]);

  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifMessage('Browser notifications are unavailable; in-app reminder banner active.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification('TabiGuide Travel Alert Active', {
        body: reminders[0]
          ? `Next departure: ${reminders[0].code} (${reminders[0].route})`
          : 'Shinkansen & flight alerts enabled.',
      });
      setNotifMessage('Browser notification sent & permissions granted.');
    } else {
      setNotifMessage(`Notification permission: ${perm}. In-app alerts remain active.`);
    }
  };

  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remCode.trim() || !remRoute.trim() || !remGate.trim()) {
      setRemError('Please enter train/flight code, route, and platform or gate.');
      return;
    }
    setRemError(null);
    onAddReminder({
      kind: remKind,
      code: remCode.trim(),
      route: remRoute.trim(),
      departureIso: remTime,
      platformOrGate: remGate.trim(),
    });
    setRemCode('');
    setRemRoute('');
    setRemGate('');
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (postMessage.trim().length < 3) {
      setPostError('Write at least 3 characters for your traveler note.');
      return;
    }
    setPostError(null);
    onAddCommunityPost({
      city: postCity,
      category: postCategory,
      message: postMessage.trim(),
    });
    setPostMessage('');
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError(null);
    const ok = await verifyTotpCode(totpSecret, totpCodeInput);
    if (!ok) {
      setTotpError('Invalid 6-digit code. Check your authenticator app or preview the current code.');
      return;
    }
    onUpdateTotpState(totpSecret, true);
    setTotpCodeInput('');
  };

  const handleAddEncryptedDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError(null);
    if (!totpVerified) {
      setVaultError('Verify TOTP 2FA before encrypting documents.');
      return;
    }
    if (vaultPassphrase.length < 4) {
      setVaultError('Enter a vault passphrase (at least 4 characters).');
      return;
    }
    if (!docLabel.trim() || !docNumber.trim()) {
      setVaultError('Document label and number are required.');
      return;
    }

    try {
      const payload = JSON.stringify({
        docNumber: docNumber.trim(),
        notes: docNotes.trim(),
      });
      const envelope = await encryptVaultPayload(payload, vaultPassphrase);
      await onSaveVaultItem({
        label: docLabel.trim(),
        docType,
        envelope,
      });
      setDocLabel('');
      setDocNumber('');
      setDocNotes('');
    } catch (err: unknown) {
      setVaultError(err instanceof Error ? err.message : 'Encryption failed.');
    }
  };

  const handleDecryptItem = async (item: StoredVaultRecord) => {
    setVaultError(null);
    if (!vaultPassphrase) {
      setVaultError('Enter your vault passphrase first to decrypt.');
      return;
    }
    try {
      const plain = await decryptVaultPayload(item.envelope, vaultPassphrase);
      const parsed = JSON.parse(plain) as DecryptedVaultContent;
      setDecryptedMap((prev) => ({ ...prev, [item.id]: parsed }));
    } catch {
      setVaultError('Passphrase did not match this encrypted document.');
    }
  };

  const visiblePosts =
    cityFilter === 'All'
      ? communityPosts
      : communityPosts.filter((p) => p.city === cityFilter);

  return (
    <div className="space-y-8">
      {/* Row 1: Flight/Shinkansen Alerts + Emergency Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Flight / Shinkansen Reminder Scheduler */}
        <section className="lg:col-span-6 liquid-glass rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-5 h-5 text-accent-token" />
              <div>
                <h2 className="font-display text-xl font-semibold text-primary-token">
                  Flight & Shinkansen Alerts
                </h2>
                <p className="text-xs text-muted-token">
                  Departure schedule with browser notifications
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestNotifications}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium liquid-glass text-accent-token hover:border-accent-token whitespace-nowrap shrink-0"
            >
              <Bell className="w-3.5 h-3.5" />
              Test Notification
            </button>
          </div>

          {notifMessage && (
            <p className="text-xs text-secondary-token bg-black/5 dark:bg-black/30 rounded-lg px-3 py-2">
              {notifMessage}
            </p>
          )}

          <div className="space-y-2.5">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="rounded-xl p-3.5 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-mono text-accent-token uppercase">
                    {rem.kind} · {rem.code}
                  </p>
                  <p className="text-sm font-semibold text-primary-token">{rem.route}</p>
                  <p className="text-xs text-muted-token font-mono">
                    {rem.departureIso.replace('T', ' ')} · {rem.platformOrGate}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove alert ${rem.code}`}
                  onClick={() => onDeleteReminder(rem.id)}
                  className="p-2 text-muted-token hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleReminderSubmit} className="space-y-3 pt-3 border-t border-black/10 dark:border-amber-200/15">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="rem-kind" className="block text-xs text-muted-token mb-1">
                  Type
                </label>
                <select
                  id="rem-kind"
                  value={remKind}
                  onChange={(e) => setRemKind(e.target.value as TravelReminderItem['kind'])}
                  className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                >
                  <option value="shinkansen">Shinkansen</option>
                  <option value="flight">Flight</option>
                  <option value="ferry">Ferry</option>
                  <option value="hotel">Check-In</option>
                </select>
              </div>
              <div>
                <label htmlFor="rem-code" className="block text-xs text-muted-token mb-1">
                  Train / Flight Code
                </label>
                <input
                  id="rem-code"
                  type="text"
                  value={remCode}
                  onChange={(e) => setRemCode(e.target.value)}
                  placeholder="Hikari #508"
                  className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="rem-route" className="block text-xs text-muted-token mb-1">
                  Route
                </label>
                <input
                  id="rem-route"
                  type="text"
                  value={remRoute}
                  onChange={(e) => setRemRoute(e.target.value)}
                  placeholder="Kyoto → Osaka"
                  className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
              </div>
              <div>
                <label htmlFor="rem-gate" className="block text-xs text-muted-token mb-1">
                  Track / Gate
                </label>
                <input
                  id="rem-gate"
                  type="text"
                  value={remGate}
                  onChange={(e) => setRemGate(e.target.value)}
                  placeholder="Track 12 · Car 5"
                  className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
              </div>
            </div>

            <div>
              <label htmlFor="rem-time" className="block text-xs text-muted-token mb-1">
                Departure Time
              </label>
              <input
                id="rem-time"
                type="datetime-local"
                value={remTime}
                onChange={(e) => setRemTime(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs font-mono bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>

            {remError && <p className="text-xs text-rose-400">{remError}</p>}

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-accent-token"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Departure Alert
            </button>
          </form>
        </section>

        {/* Japan Emergency & Medical Contacts */}
        <section className="lg:col-span-6 liquid-glass rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <PhoneCall className="w-5 h-5 text-accent-token" />
              <div>
                <h2 className="font-display text-xl font-semibold text-primary-token">
                  Emergency & Medical Contacts
                </h2>
                <p className="text-xs text-muted-token">
                  Available offline across Japan
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMedicalCard((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium liquid-glass text-accent-token whitespace-nowrap shrink-0"
            >
              {showMedicalCard ? 'Hide Driver Card' : 'Japanese Medical Card'}
            </button>
          </div>

          {showMedicalCard && (
            <div className="rounded-xl p-4 bg-rose-500/10 border border-rose-400/30 space-y-1.5">
              <p className="text-xs font-semibold text-rose-300">Show to Taxi Driver or Clinic Staff</p>
              <p className="font-display text-lg font-bold text-primary-token">
                英語が話せる病院へ連れて行ってください。
              </p>
              <p className="text-xs text-secondary-token">
                Please take me to a hospital with English-speaking staff. (Eigo ga hanaseru byouin e tsurete itte kudasai.)
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EMERGENCY_CONTACTS.map((c) => (
              <div
                key={c.number}
                className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-1.5"
              >
                <div className="space-y-0.5">
                  <span className="font-mono text-xl font-bold text-accent-token whitespace-nowrap block">
                    {c.number}
                  </span>
                  <span className="text-xs text-muted-token block">{c.japanese}</span>
                </div>
                <p className="text-sm font-semibold text-primary-token">{c.title}</p>
                <p className="text-xs text-secondary-token leading-relaxed">{c.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Row 2: Encrypted Travel Document Vault (AES-GCM + TOTP 2FA + Firebase) + Nearby Community Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Encrypted Travel Vault */}
        <section className="lg:col-span-7 liquid-glass-elevated rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/10 dark:border-amber-200/15">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-accent-token" />
              <div>
                <h2 className="font-display text-xl font-semibold text-primary-token">
                  Encrypted Document Vault & TOTP 2FA
                </h2>
                <p className="text-xs text-muted-token">
                  AES-256-GCM client-side encryption · Firestore Offline Persistence: {firestoreStatus}
                </p>
              </div>
            </div>
            {user ? (
              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-lg text-xs font-medium liquid-glass text-secondary-token hover:text-primary-token whitespace-nowrap shrink-0"
              >
                Sign Out ({user.displayName?.split(' ')[0] || 'Synced'})
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent-token whitespace-nowrap shrink-0"
              >
                Sign In with Google to Sync
              </button>
            )}
          </div>

          {/* TOTP 2FA Gate */}
          <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-accent-token" />
                <span className="text-sm font-semibold text-primary-token">
                  Two-Factor Authenticator (TOTP)
                </span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  totpVerified ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {totpVerified ? '2FA Verified' : 'Verification Required'}
              </span>
            </div>

            {!totpVerified ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-4 flex flex-col items-center gap-2">
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="TOTP 2FA QR Code"
                      className="w-32 h-32 rounded-xl bg-white p-1.5"
                    />
                  )}
                  <p className="text-[11px] font-mono text-muted-token break-all text-center">
                    {totpSecret}
                  </p>
                </div>

                <form onSubmit={handleVerifyTotp} className="sm:col-span-8 space-y-3">
                  <p className="text-xs text-secondary-token leading-relaxed">
                    Scan this QR code with Google Authenticator or Authy, then enter the 6-digit code to unlock your encrypted passport & JR Pass vault.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <label htmlFor="totp-code-input" className="sr-only">
                      6-digit TOTP code
                    </label>
                    <input
                      id="totp-code-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={totpCodeInput}
                      onChange={(e) => setTotpCodeInput(e.target.value)}
                      placeholder="6-digit code"
                      className="w-36 rounded-xl px-3 py-2 text-sm font-mono tracking-widest bg-white/70 dark:bg-black/45 border border-black/10 dark:border-amber-200/20 text-primary-token"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent-token whitespace-nowrap shrink-0"
                    >
                      Verify 2FA
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const code = await generateTotpCode(totpSecret);
                        setPreviewTotpCode(code);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-medium liquid-glass text-secondary-token whitespace-nowrap shrink-0"
                    >
                      Preview Code
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateTotpState(generateBase32Secret(), false)}
                      className="px-3 py-2 rounded-xl text-xs font-medium liquid-glass text-secondary-token whitespace-nowrap shrink-0"
                    >
                      Rotate Secret
                    </button>
                  </div>
                  {previewTotpCode && (
                    <p className="text-xs font-mono text-accent-token">
                      Current 30s TOTP Code: <strong>{previewTotpCode}</strong>
                    </p>
                  )}
                  {totpError && <p className="text-xs text-rose-400">{totpError}</p>}
                </form>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-secondary-token">
                <span>Session unlocked via RFC 6238 TOTP.</span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateTotpState(totpSecret, false);
                    setDecryptedMap({});
                  }}
                  className="text-accent-token font-medium hover:underline"
                >
                  Lock Vault
                </button>
              </div>
            )}
          </div>

          {/* Vault Passphrase & Add Document */}
          <form onSubmit={handleAddEncryptedDoc} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="vault-pass" className="block text-xs text-muted-token mb-1">
                  AES-GCM Encryption Passphrase
                </label>
                <input
                  id="vault-pass"
                  type="password"
                  value={vaultPassphrase}
                  onChange={(e) => setVaultPassphrase(e.target.value)}
                  placeholder="Enter passphrase to encrypt/decrypt"
                  className="w-full rounded-xl px-3.5 py-2 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
              </div>
              <div>
                <label htmlFor="vault-type" className="block text-xs text-muted-token mb-1">
                  Document Category
                </label>
                <select
                  id="vault-type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as StoredVaultRecord['docType'])}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                >
                  <option value="passport">Passport</option>
                  <option value="jrpass">JR Rail Pass</option>
                  <option value="hotel">Ryokan / Hotel Booking</option>
                  <option value="insurance">Travel Insurance</option>
                  <option value="visa">Visit Japan Web / Visa</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="vault-label" className="block text-xs text-muted-token mb-1">
                  Document Label
                </label>
                <input
                  id="vault-label"
                  type="text"
                  value={docLabel}
                  onChange={(e) => setDocLabel(e.target.value)}
                  placeholder="e.g., Primary Passport"
                  className="w-full rounded-xl px-3.5 py-2 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
              </div>
              <div>
                <label htmlFor="vault-num" className="block text-xs text-muted-token mb-1">
                  Reference / ID Number
                </label>
                <input
                  id="vault-num"
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="e.g., Z4419820"
                  className="w-full rounded-xl px-3.5 py-2 text-sm font-mono bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
              </div>
            </div>

            <div>
              <label htmlFor="vault-notes" className="block text-xs text-muted-token mb-1">
                Encrypted Notes (Expiry, Embassy Contact, PIN)
              </label>
              <input
                id="vault-notes"
                type="text"
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                placeholder="Expires 2034-05 · Pickup at Tokyo Station"
                className="w-full rounded-xl px-3.5 py-2 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>

            {vaultError && <p className="text-xs text-rose-400">{vaultError}</p>}

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent-token"
            >
              <Lock className="w-3.5 h-3.5" />
              Encrypt & Store Document
            </button>
          </form>

          {/* Stored Vault Items */}
          <div className="space-y-2.5 pt-2 border-t border-black/10 dark:border-amber-200/15">
            <p className="text-xs font-medium text-muted-token">
              Encrypted Records ({vaultItems.length})
            </p>
            {vaultItems.length === 0 ? (
              <p className="text-xs text-secondary-token">
                No encrypted documents stored yet.
              </p>
            ) : (
              vaultItems.map((item) => {
                const decrypted = decryptedMap[item.id];
                return (
                  <div
                    key={item.id}
                    className="rounded-xl p-3.5 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-primary-token">
                        {item.label}{' '}
                        <span className="text-xs font-normal text-muted-token">
                          · {item.docType}
                        </span>
                      </p>
                      {decrypted ? (
                        <div className="text-xs font-mono text-emerald-400 mt-1 space-y-0.5">
                          <p>ID: {decrypted.docNumber}</p>
                          {decrypted.notes && <p className="text-secondary-token">{decrypted.notes}</p>}
                        </div>
                      ) : (
                        <p className="text-[11px] font-mono text-muted-token mt-1 truncate max-w-xs">
                          AES-GCM Cipher: {item.envelope.cipherTextB64.slice(0, 24)}…
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDecryptItem(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium liquid-glass text-accent-token"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        {decrypted ? 'Re-Verify' : 'Decrypt'}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete encrypted document ${item.label}`}
                        onClick={() => onDeleteVaultItem(item.id)}
                        className="p-2 text-muted-token hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Nearby Traveler Social Board */}
        <section className="lg:col-span-5 liquid-glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-accent-token" />
              <div>
                <h2 className="font-display text-xl font-semibold text-primary-token">
                  Traveler Social Board
                </h2>
                <p className="text-xs text-muted-token">
                  Live crowd reports, tips & local meetups
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['All', ...CITY_GUIDES.map((c) => c.id)].map((cityName) => (
              <button
                key={cityName}
                type="button"
                onClick={() => setCityFilter(cityName)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  cityFilter === cityName
                    ? 'bg-accent-token'
                    : 'liquid-glass text-secondary-token'
                }`}
              >
                {cityName}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {visiblePosts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl p-3.5 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs text-muted-token">
                  <span className="font-semibold text-primary-token">
                    {post.authorName} · {post.city}
                  </span>
                  <span className="capitalize">
                    {post.category} · {post.createdAtLabel}
                  </span>
                </div>
                <p className="text-xs text-secondary-token leading-relaxed">{post.message}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handlePostSubmit} className="space-y-2.5 pt-3 border-t border-black/10 dark:border-amber-200/15">
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Post city"
                value={postCity}
                onChange={(e) => setPostCity(e.target.value as CommunityBoardPost['city'])}
                className="rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              >
                {CITY_GUIDES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}
                  </option>
                ))}
              </select>
              <select
                aria-label="Post category"
                value={postCategory}
                onChange={(e) => setPostCategory(e.target.value as CommunityBoardPost['category'])}
                className="rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              >
                <option value="tip">Local Tip</option>
                <option value="crowd">Crowd Report</option>
                <option value="food">Food Find</option>
                <option value="meetup">Meetup</option>
              </select>
            </div>
            <textarea
              rows={2}
              aria-label="Share a local traveler tip"
              value={postMessage}
              onChange={(e) => setPostMessage(e.target.value)}
              placeholder="Share a live crowd update, hidden ramen spot, or rail tip..."
              className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
            />
            {postError && <p className="text-xs text-rose-400">{postError}</p>}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-accent-token"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Post to Board
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
