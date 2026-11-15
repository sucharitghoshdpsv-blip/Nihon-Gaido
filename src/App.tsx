import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { Menu, Moon, Sun, X } from 'lucide-react';
import {
  auth,
  clearWorkspaceAccessToken,
  db,
  googleSignInWithWorkspace,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from './firebase';
import {
  CITY_GUIDES,
  JAPANESE_THEMES,
  SEED_COMMUNITY_POSTS,
  SEED_EXPENSES,
  SEED_ITINERARY,
  SEED_REMINDERS,
  type CityGuide,
  type CommunityBoardPost,
  type ItineraryPlan,
  type JapaneseThemeId,
  type TravelReminderItem,
} from './data/japanData';
import {
  DEFAULT_FALLBACK_RATES,
  detectLocaleCurrency,
  fetchLiveJpyRates,
  isRateSnapshotFresh,
  type ExchangeRateSnapshot,
} from './utils/currency';
import { type ExpenseEntry } from './utils/budget';
import { recordMasteredItem, type LearningProgressState } from './utils/learning';
import { generateBase32Secret } from './utils/cryptoVault';
import { ExploreTranslatorView } from './components/ExploreTranslatorView';
import { LearningStudioView } from './components/LearningStudioView';
import { ItineraryMapsView } from './components/ItineraryMapsView';
import { BudgetConverterView } from './components/BudgetConverterView';
import {
  SafetyVaultView,
  type StoredVaultRecord,
} from './components/SafetyVaultView';
import { CustomerCareView } from './components/CustomerCareView';
import {
  buildSupportTicketRef,
  type SupportTicketItem,
  type SupportTicketStatus,
} from './utils/support';
import { EtiquetteOverlay } from './components/EtiquetteOverlay';

type AppSection = 'explore' | 'learn' | 'itinerary' | 'budget' | 'safety' | 'support';

const STORAGE_KEYS = {
  theme: 'tabiguide_theme',
  dark: 'tabiguide_dark',
  currency: 'tabiguide_currency',
  rates: 'tabiguide_fx_cache',
  expenses: 'tabiguide_expenses',
  dailyBudget: 'tabiguide_daily_budget',
  tripDays: 'tabiguide_trip_days',
  learning: 'tabiguide_learning',
  itinerary: 'tabiguide_itinerary',
  offlineCities: 'tabiguide_offline_regions',
  reminders: 'tabiguide_reminders',
  community: 'tabiguide_community',
  vault: 'tabiguide_vault_local',
  totpSecret: 'tabiguide_totp_secret',
  supportTickets: 'tabiguide_support_tickets',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('explore');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme & Dark mode (default dark gold high contrast)
  const [themeId, setThemeId] = useState<JapaneseThemeId>(() =>
    readStorage<JapaneseThemeId>(STORAGE_KEYS.theme, 'kinpaku')
  );
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
    readStorage<boolean>(STORAGE_KEYS.dark, true)
  );

  // City context & Etiquette Overlay (shown when switching cities)
  const [selectedCity, setSelectedCity] = useState<CityGuide>(CITY_GUIDES[0]);
  const [etiquetteVisible, setEtiquetteVisible] = useState(false);

  // Firebase Auth & Firestore connection state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<'online' | 'offline'>('online');
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  // FX & Currency state
  const [homeCurrency, setHomeCurrency] = useState<string>(() =>
    readStorage<string>(STORAGE_KEYS.currency, detectLocaleCurrency())
  );
  const [rateSnapshot, setRateSnapshot] = useState<ExchangeRateSnapshot>(() =>
    readStorage<ExchangeRateSnapshot>(STORAGE_KEYS.rates, {
      base: 'JPY',
      rates: DEFAULT_FALLBACK_RATES,
      fetchedAt: Date.now(),
      provider: 'cached-fallback',
    })
  );
  const [refreshingRates, setRefreshingRates] = useState(false);

  // Domain State
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() =>
    readStorage<ExpenseEntry[]>(STORAGE_KEYS.expenses, SEED_EXPENSES)
  );
  const [dailyBudgetJpy, setDailyBudgetJpy] = useState<number>(() =>
    readStorage<number>(STORAGE_KEYS.dailyBudget, 18000)
  );
  const [tripDays, setTripDays] = useState<number>(() =>
    readStorage<number>(STORAGE_KEYS.tripDays, 7)
  );
  const [learningProgress, setLearningProgress] = useState<LearningProgressState>(() =>
    readStorage<LearningProgressState>(STORAGE_KEYS.learning, {
      masteredIds: ['hira-a'],
      xp: 25,
      streakDays: 3,
      completedLessons: 0,
    })
  );
  const [itinerary, setItinerary] = useState<ItineraryPlan>(() =>
    readStorage<ItineraryPlan>(STORAGE_KEYS.itinerary, SEED_ITINERARY)
  );
  const [offlineCityIds, setOfflineCityIds] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.offlineCities, ['Tokyo'])
  );
  const [reminders, setReminders] = useState<TravelReminderItem[]>(() =>
    readStorage<TravelReminderItem[]>(STORAGE_KEYS.reminders, SEED_REMINDERS)
  );
  const [communityPosts, setCommunityPosts] = useState<CommunityBoardPost[]>(() =>
    readStorage<CommunityBoardPost[]>(STORAGE_KEYS.community, SEED_COMMUNITY_POSTS)
  );
  const [vaultItems, setVaultItems] = useState<StoredVaultRecord[]>(() =>
    readStorage<StoredVaultRecord[]>(STORAGE_KEYS.vault, [])
  );
  const [totpSecret, setTotpSecret] = useState<string>(() => {
    const existing = localStorage.getItem(STORAGE_KEYS.totpSecret);
    if (existing && existing.length >= 16) return existing;
    const generated = generateBase32Secret();
    localStorage.setItem(STORAGE_KEYS.totpSecret, generated);
    return generated;
  });
  const [totpVerified, setTotpVerified] = useState(false);
  const [supportTickets, setSupportTickets] = useState<SupportTicketItem[]>(() =>
    readStorage<SupportTicketItem[]>(STORAGE_KEYS.supportTickets, [])
  );

  // Sync theme & dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeId);
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(themeId));
    localStorage.setItem(STORAGE_KEYS.dark, JSON.stringify(isDarkMode));
  }, [themeId, isDarkMode]);

  // Persist local state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.currency, JSON.stringify(homeCurrency));
  }, [homeCurrency]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.dailyBudget, JSON.stringify(dailyBudgetJpy));
  }, [dailyBudgetJpy]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tripDays, JSON.stringify(tripDays));
  }, [tripDays]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.learning, JSON.stringify(learningProgress));
  }, [learningProgress]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.itinerary, JSON.stringify(itinerary));
  }, [itinerary]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.offlineCities, JSON.stringify(offlineCityIds));
  }, [offlineCityIds]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminders));
  }, [reminders]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.community, JSON.stringify(communityPosts));
  }, [communityPosts]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.vault, JSON.stringify(vaultItems));
  }, [vaultItems]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.totpSecret, totpSecret);
  }, [totpSecret]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.supportTickets, JSON.stringify(supportTickets));
  }, [supportTickets]);

  // Live FX rates bootstrap & refresh
  const handleRefreshRates = async () => {
    setRefreshingRates(true);
    try {
      const snap = await fetchLiveJpyRates();
      setRateSnapshot(snap);
      localStorage.setItem(STORAGE_KEYS.rates, JSON.stringify(snap));
    } finally {
      setRefreshingRates(false);
    }
  };

  useEffect(() => {
    if (!isRateSnapshotFresh(rateSnapshot) || rateSnapshot.provider === 'cached-fallback') {
      handleRefreshRates();
    }
  }, []);

  // Firebase connection test + Auth listener
  useEffect(() => {
    testFirestoreConnection().then(setFirestoreStatus);
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        clearWorkspaceAccessToken();
        setWorkspaceToken(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Google Maps Case A Demo Key quota warning listener at top-level App context
  useEffect(() => {
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Firestore real-time listeners when authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    const safeBudget = Math.min(10000000, Math.max(1000, Math.round(Number(dailyBudgetJpy) || 18000)));
    const safeCurrency = /^[A-Z]{3}$/.test(homeCurrency) ? homeCurrency : 'USD';
    const safeDisplayName = (user.displayName || 'Traveler').trim().slice(0, 80) || 'Traveler';

    const profileRef = doc(db, 'users', user.uid);
    setDoc(
      profileRef,
      {
        uid: user.uid,
        displayName: safeDisplayName,
        homeCurrency: safeCurrency,
        totpEnabled: totpVerified,
        dailyBudgetJpy: safeBudget,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((err) => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));

    const expensesPath = `users/${user.uid}/expenses`;
    const unsubExpenses = onSnapshot(
      query(collection(db, expensesPath), where('ownerUid', '==', user.uid)),
      (snap) => {
        if (!snap.empty) {
          const loaded = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title || ''),
              amountJpy: Number(data.amountJpy || 0),
              category: data.category,
              city: String(data.city || 'Tokyo'),
              date: String(data.date || '2026-11-14'),
              createdAt: Date.now(),
            } as ExpenseEntry;
          });
          setExpenses(loaded);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, expensesPath)
    );

    const vaultPath = `users/${user.uid}/vaultItems`;
    const unsubVault = onSnapshot(
      query(collection(db, vaultPath), where('ownerUid', '==', user.uid)),
      (snap) => {
        const loaded = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            label: String(data.label || ''),
            docType: data.docType || 'other',
            envelope: {
              cipherTextB64: String(data.cipherTextB64 || ''),
              ivB64: String(data.ivB64 || ''),
              saltB64: String(data.saltB64 || ''),
              alg: 'AES-GCM-256',
            },
            createdAtLabel: 'Synced',
          } as StoredVaultRecord;
        });
        if (loaded.length > 0) setVaultItems(loaded);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, vaultPath)
    );

    const remindersPath = `users/${user.uid}/reminders`;
    const unsubReminders = onSnapshot(
      query(collection(db, remindersPath), where('ownerUid', '==', user.uid)),
      (snap) => {
        if (!snap.empty) {
          const loaded = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              kind: data.kind || 'shinkansen',
              code: String(data.code || ''),
              route: String(data.route || ''),
              departureIso: String(data.departureIso || ''),
              platformOrGate: String(data.platformOrGate || ''),
            } as TravelReminderItem;
          });
          setReminders(loaded);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, remindersPath)
    );

    const postsPath = 'communityPosts';
    const unsubPosts = onSnapshot(
      query(collection(db, postsPath), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        if (!snap.empty) {
          const loaded = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              authorUid: String(data.authorUid || ''),
              authorName: String(data.authorName || 'Traveler'),
              city: data.city || 'Tokyo',
              category: data.category || 'tip',
              message: String(data.message || ''),
              createdAtLabel: 'Live',
            } as CommunityBoardPost;
          });
          setCommunityPosts(loaded);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, postsPath)
    );

    const ticketsPath = `users/${user.uid}/supportTickets`;
    const unsubTickets = onSnapshot(
      query(collection(db, ticketsPath), where('ownerUid', '==', user.uid)),
      (snap) => {
        if (!snap.empty) {
          const loaded = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ticketRef: String(data.ticketRef || buildSupportTicketRef(d.id)),
              category: data.category || 'other',
              severity: data.severity || 'medium',
              area: data.area || 'explore',
              subject: String(data.subject || ''),
              description: String(data.description || ''),
              contactEmail: String(data.contactEmail || ''),
              cityContext: String(data.cityContext || 'Tokyo'),
              diagnostics: String(data.diagnostics || ''),
              status: data.status || 'open',
              resolutionNote: String(data.resolutionNote || ''),
              createdAtLabel: 'Synced',
            } as SupportTicketItem;
          });
          setSupportTickets(loaded);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, ticketsPath)
    );

    return () => {
      unsubExpenses();
      unsubVault();
      unsubReminders();
      unsubPosts();
      unsubTickets();
    };
  }, [authReady, user]);

  // Handlers
  const handleSelectCity = (city: CityGuide) => {
    const changed = city.id !== selectedCity.id;
    setSelectedCity(city);
    if (changed) {
      setEtiquetteVisible(true);
    }
  };

  useEffect(() => {
    if (!etiquetteVisible) return;
    const timer = window.setTimeout(() => setEtiquetteVisible(false), 10000);
    return () => window.clearTimeout(timer);
  }, [etiquetteVisible, selectedCity.id]);

  const handleNavigate = (section: AppSection) => {
    setActiveSection(section);
    setEtiquetteVisible(false);
  };

  const handleSignIn = async () => {
    setAuthNotice(null);
    try {
      const res = await googleSignInWithWorkspace();
      setWorkspaceToken(res.accessToken);
    } catch (err: unknown) {
      setAuthNotice(err instanceof Error ? err.message : 'Google sign-in cancelled.');
    }
  };

  const handleSignOut = async () => {
    clearWorkspaceAccessToken();
    setWorkspaceToken(null);
    await signOut(auth);
  };

  const handleAddExpense = async (entry: Omit<ExpenseEntry, 'id' | 'createdAt'>) => {
    const id = `exp-${Date.now()}`;
    const nextItem: ExpenseEntry = { ...entry, id, createdAt: Date.now() };
    setExpenses((prev) => [nextItem, ...prev]);

    if (user) {
      const path = `users/${user.uid}/expenses`;
      try {
        await setDoc(doc(db, path, id), {
          ownerUid: user.uid,
          title: entry.title.slice(0, 100),
          amountJpy: entry.amountJpy,
          category: entry.category,
          city: entry.city.slice(0, 40),
          date: entry.date.slice(0, 10),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${path}/${id}`);
      }
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (user) {
      const path = `users/${user.uid}/expenses/${id}`;
      try {
        await deleteDoc(doc(db, `users/${user.uid}/expenses`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  };

  const handleMasterLearningItem = async (itemId: string, xpGain = 25) => {
    const nextState = recordMasteredItem(learningProgress, itemId, xpGain);
    setLearningProgress(nextState);
    if (user) {
      const path = `users/${user.uid}/learning/main`;
      try {
        await setDoc(doc(db, `users/${user.uid}/learning`, 'main'), {
          ownerUid: user.uid,
          masteredIds: nextState.masteredIds.slice(0, 500),
          xp: nextState.xp,
          streakDays: nextState.streakDays,
          completedLessons: nextState.completedLessons,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const handleUpdateItinerary = async (plan: ItineraryPlan) => {
    setItinerary(plan);
    if (user) {
      const id = `trip-${Date.now()}`;
      const path = `users/${user.uid}/itineraries/${id}`;
      try {
        await setDoc(doc(db, `users/${user.uid}/itineraries`, id), {
          ownerUid: user.uid,
          title: plan.tripTitle.slice(0, 100),
          daysCount: plan.days.length,
          regions: plan.days.map((d) => d.region).slice(0, 12),
          planJson: JSON.stringify(plan).slice(0, 50000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const handleToggleOfflineCity = (city: CityGuide) => {
    setOfflineCityIds((prev) => {
      if (prev.includes(city.id)) {
        return prev.filter((id) => id !== city.id);
      }
      localStorage.setItem(`tabiguide_offline_pack_${city.id}`, JSON.stringify(city));
      return [...prev, city.id];
    });
  };

  const handleAddReminder = async (item: Omit<TravelReminderItem, 'id'>) => {
    const id = `rem-${Date.now()}`;
    setReminders((prev) => [{ ...item, id }, ...prev]);
    if (user) {
      const path = `users/${user.uid}/reminders/${id}`;
      try {
        await setDoc(doc(db, `users/${user.uid}/reminders`, id), {
          ownerUid: user.uid,
          kind: item.kind,
          code: item.code.slice(0, 40),
          route: item.route.slice(0, 100),
          departureIso: item.departureIso.slice(0, 40),
          platformOrGate: item.platformOrGate.slice(0, 40),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const handleDeleteReminder = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    if (user) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/reminders`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/reminders/${id}`);
      }
    }
  };

  const handleAddCommunityPost = async (
    post: Omit<CommunityBoardPost, 'id' | 'authorUid' | 'authorName' | 'createdAtLabel'>
  ) => {
    const id = `post-${Date.now()}`;
    const authorName = user?.displayName?.split(' ')[0] || 'Traveler';
    const nextPost: CommunityBoardPost = {
      id,
      authorUid: user?.uid || 'local-traveler',
      authorName,
      city: post.city,
      category: post.category,
      message: post.message,
      createdAtLabel: 'Just now',
    };
    setCommunityPosts((prev) => [nextPost, ...prev]);

    if (user) {
      try {
        await setDoc(doc(db, 'communityPosts', id), {
          authorUid: user.uid,
          authorName: authorName.slice(0, 50),
          city: post.city,
          category: post.category,
          message: post.message.slice(0, 400),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `communityPosts/${id}`);
      }
    }
  };

  const handleSaveVaultItem = async (
    record: Omit<StoredVaultRecord, 'id' | 'createdAtLabel'>
  ) => {
    const id = `vault-${Date.now()}`;
    const newRec: StoredVaultRecord = {
      ...record,
      id,
      createdAtLabel: user ? 'Synced' : 'Local AES-GCM',
    };
    setVaultItems((prev) => [newRec, ...prev]);

    if (user) {
      const path = `users/${user.uid}/vaultItems/${id}`;
      try {
        await setDoc(doc(db, `users/${user.uid}/vaultItems`, id), {
          ownerUid: user.uid,
          label: record.label.slice(0, 80),
          docType: record.docType,
          cipherTextB64: record.envelope.cipherTextB64,
          ivB64: record.envelope.ivB64,
          saltB64: record.envelope.saltB64,
          alg: 'AES-GCM-256',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const handleDeleteVaultItem = async (id: string) => {
    setVaultItems((prev) => prev.filter((v) => v.id !== id));
    if (user) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/vaultItems`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/vaultItems/${id}`);
      }
    }
  };

  const handleSubmitSupportTicket = async (
    ticket: Omit<SupportTicketItem, 'id' | 'ticketRef' | 'status' | 'resolutionNote' | 'createdAtLabel'>
  ): Promise<SupportTicketItem> => {
    const id = `sup-${Date.now()}`;
    const ticketRef = buildSupportTicketRef(id);
    const created: SupportTicketItem = {
      ...ticket,
      id,
      ticketRef,
      status: 'open',
      resolutionNote: '',
      createdAtLabel: user ? 'Synced' : 'Just now',
    };
    setSupportTickets((prev) => [created, ...prev]);

    if (user) {
      const path = `users/${user.uid}/supportTickets/${id}`;
      try {
        await setDoc(doc(db, `users/${user.uid}/supportTickets`, id), {
          ownerUid: user.uid,
          ticketRef,
          category: ticket.category,
          severity: ticket.severity,
          area: ticket.area,
          subject: ticket.subject.slice(0, 100),
          description: ticket.description.slice(0, 1000),
          contactEmail: ticket.contactEmail.slice(0, 160),
          cityContext: ticket.cityContext.slice(0, 40),
          diagnostics: ticket.diagnostics.slice(0, 400),
          status: 'open',
          resolutionNote: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
    return created;
  };

  const handleUpdateSupportTicketStatus = async (
    id: string,
    status: SupportTicketStatus,
    resolutionNote = ''
  ) => {
    setSupportTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, resolutionNote } : t))
    );
    if (user) {
      const path = `users/${user.uid}/supportTickets/${id}`;
      try {
        await setDoc(
          doc(db, `users/${user.uid}/supportTickets`, id),
          {
            status,
            resolutionNote: resolutionNote.slice(0, 500),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  };

  const handleDeleteSupportTicket = async (id: string) => {
    setSupportTickets((prev) => prev.filter((t) => t.id !== id));
    if (user) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/supportTickets`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/supportTickets/${id}`);
      }
    }
  };

  const navItems: Array<{ id: AppSection; label: string }> = [
    { id: 'explore', label: 'Explore' },
    { id: 'learn', label: 'Learn' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'budget', label: 'Budget' },
    { id: 'safety', label: 'Safety & Vault' },
    { id: 'support', label: 'Support' },
  ];

  return (
    <div className="min-h-screen flex flex-col relative isolate">
      <div className="tabi-live-bg" aria-hidden="true">
        <div className="tabi-live-orb tabi-live-orb-1" />
        <div className="tabi-live-orb tabi-live-orb-2" />
        <div className="tabi-live-orb tabi-live-orb-3" />
      </div>
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 liquid-glass border-b border-black/10 dark:border-amber-200/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('explore');
            }}
            className="font-display text-xl font-bold tracking-tight text-primary-token whitespace-nowrap shrink-0"
          >
            TabiGuide
          </a>

          {/* Zone 2: Concise single-line nav links */}
          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                    active
                      ? 'text-accent-token border-[var(--accent)]'
                      : 'text-secondary-token border-transparent hover:text-primary-token'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden sm:inline-flex px-4 py-2 rounded-xl text-xs font-semibold liquid-glass text-primary-token hover:border-accent-token whitespace-nowrap shrink-0"
              >
                {user.displayName?.split(' ')[0] || 'Account'} · Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="hidden sm:inline-flex px-4 py-2 rounded-xl text-xs font-semibold bg-accent-token whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-xl liquid-glass text-primary-token"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-black/10 dark:border-amber-200/15 px-4 py-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    handleNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left ${
                    activeSection === item.id
                      ? 'bg-accent-token'
                      : 'liquid-glass text-primary-token'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) handleSignOut();
                else handleSignIn();
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-accent-token"
            >
              {user ? `Sign Out (${user.displayName || 'User'})` : 'Sign In with Google'}
            </button>
          </div>
        )}
      </header>

      {/* Workspace Context Bar (Themes, Light/Dark Toggle, City Context, FX Rate) */}
      <div className="border-b border-black/5 dark:border-amber-200/10 bg-black/[0.02] dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="ctx-city-select" className="text-muted-token">
              City:
            </label>
            <select
              id="ctx-city-select"
              value={selectedCity.id}
              onChange={(e) => {
                const found = CITY_GUIDES.find((c) => c.id === e.target.value);
                if (found) handleSelectCity(found);
              }}
              className="rounded-lg px-2.5 py-1 text-xs font-medium liquid-glass text-primary-token"
            >
              {CITY_GUIDES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} ({c.district})
                </option>
              ))}
            </select>

            <span className="hidden sm:inline text-muted-token font-mono">
              ¥1,000 ≈ {(1000 * (rateSnapshot.rates[homeCurrency] ?? 0.0065)).toFixed(2)} {homeCurrency}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-muted-token hidden sm:inline">Theme:</span>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Japanese Themes">
              {JAPANESE_THEMES.map((t) => {
                const active = themeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeId(t.id)}
                    aria-pressed={active}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-accent-token'
                        : 'liquid-glass text-secondary-token hover:text-primary-token'
                    }`}
                  >
                    {t.japaneseName} · {t.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsDarkMode((d) => !d)}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark gold mode'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium liquid-glass text-accent-token whitespace-nowrap shrink-0"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDarkMode ? 'Light' : 'Dark Gold'}</span>
            </button>
          </div>
        </div>
      </div>

      {authNotice && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-3">
          <div className="liquid-glass rounded-xl px-4 py-2.5 text-xs text-secondary-token flex items-center justify-between">
            <span>{authNotice}</span>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              className="text-accent-token font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeSection === 'explore' && (
              <ExploreTranslatorView
                selectedCity={selectedCity}
                onSelectCity={handleSelectCity}
              />
            )}
            {activeSection === 'learn' && (
              <LearningStudioView
                progress={learningProgress}
                onMasterItem={handleMasterLearningItem}
              />
            )}
            {activeSection === 'itinerary' && (
              <ItineraryMapsView
                itinerary={itinerary}
                onUpdateItinerary={handleUpdateItinerary}
                offlineCityIds={offlineCityIds}
                onToggleOfflineCity={handleToggleOfflineCity}
                selectedCity={selectedCity}
                onSelectCity={handleSelectCity}
                homeCurrency={homeCurrency}
                rates={rateSnapshot.rates}
                workspaceToken={workspaceToken}
                onConnectGoogleWorkspace={handleSignIn}
                onWorkspaceTokenExpired={() => {
                  clearWorkspaceAccessToken();
                  setWorkspaceToken(null);
                }}
              />
            )}
            {activeSection === 'budget' && (
              <BudgetConverterView
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                dailyBudgetJpy={dailyBudgetJpy}
                onChangeDailyBudget={setDailyBudgetJpy}
                tripDays={tripDays}
                onChangeTripDays={setTripDays}
                homeCurrency={homeCurrency}
                onChangeHomeCurrency={setHomeCurrency}
                rateSnapshot={rateSnapshot}
                refreshingRates={refreshingRates}
                onRefreshRates={handleRefreshRates}
              />
            )}
            {activeSection === 'safety' && (
              <SafetyVaultView
                user={user}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                firestoreStatus={firestoreStatus}
                reminders={reminders}
                onAddReminder={handleAddReminder}
                onDeleteReminder={handleDeleteReminder}
                communityPosts={communityPosts}
                onAddCommunityPost={handleAddCommunityPost}
                vaultItems={vaultItems}
                onSaveVaultItem={handleSaveVaultItem}
                onDeleteVaultItem={handleDeleteVaultItem}
                totpSecret={totpSecret}
                totpVerified={totpVerified}
                onUpdateTotpState={(sec, ver) => {
                  setTotpSecret(sec);
                  setTotpVerified(ver);
                }}
              />
            )}
            {activeSection === 'support' && (
              <CustomerCareView
                user={user}
                selectedCity={selectedCity}
                themeId={themeId}
                isDarkMode={isDarkMode}
                tickets={supportTickets}
                onSubmitTicket={handleSubmitSupportTicket}
                onUpdateTicketStatus={handleUpdateSupportTicketStatus}
                onDeleteTicket={handleDeleteSupportTicket}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Location-Based Etiquette Tip Overlay */}
      <EtiquetteOverlay
        city={selectedCity}
        visible={etiquetteVisible}
        onDismiss={() => setEtiquetteVisible(false)}
      />

      <footer className="border-t border-black/10 dark:border-amber-200/15 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-token">
          <span>TabiGuide · Japan Cultural Companion & Encrypted Trip Studio</span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                handleNavigate('support');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-accent-token hover:underline font-medium"
            >
              Customer Care · Report an Issue
            </button>
            <span>Offline Firestore Cache Active · Web Crypto AES-256-GCM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
