import { createClient as createSupabaseClient } from '@/lib/supabase-browser';

let cloudSyncQueue: Promise<void> = Promise.resolve();

const CLOUD_KEYS = new Set([
  'settings','rooms','tenants','payments','transactions','tenantHistory','paymentHistory','bookings','cctv'
]);

const ACTIVE_USER_KEY = 'kostpro-active-user';
const PENDING_DRAFT_KEY = 'kostpro-pending-draft'; // scoped draft marker; never reused across authenticated properties
const HYDRATION_READY_KEY = 'kostpro-hydration-ready';
const HYDRATION_WAIT_MS = 15000;

async function waitForCloudHydration() {
  if (typeof window === 'undefined') return;
  if (sessionStorage.getItem(HYDRATION_READY_KEY) === '1') return;

  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('kostpro:data-scope-changed', check);
      window.clearTimeout(timer);
      resolve();
    };
    const check = () => {
      if (sessionStorage.getItem(HYDRATION_READY_KEY) === '1') finish();
    };
    const timer = window.setTimeout(finish, HYDRATION_WAIT_MS);
    window.addEventListener('kostpro:data-scope-changed', check);
    check();
  });

  if (sessionStorage.getItem(HYDRATION_READY_KEY) !== '1') {
    throw new Error('Data property belum selesai dimuat. Silakan tunggu sampai sinkronisasi selesai.');
  }
}

async function syncLocalStateToCloud(name: string, value: unknown) {
  if (!CLOUD_KEYS.has(name) || typeof window === 'undefined') return;

  cloudSyncQueue = cloudSyncQueue.catch(() => undefined).then(async () => {
    const supabase = createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Data entered before login is explicitly marked as a temporary draft.
      // It is migrated only after a successful authenticated property lookup.
      sessionStorage.setItem(PENDING_DRAFT_KEY, '1');
      return;
    }

    // Do not allow a page that mounted before authenticated cloud hydration
    // to overwrite the property's canonical database state with its empty/default
    // React state. AccountDataSync marks this ready only after the scoped cloud
    // state has been loaded (or an explicit draft has been migrated).
    if (sessionStorage.getItem(HYDRATION_READY_KEY) !== '1') {
      return;
    }

    const { error } = await supabase.rpc('save_property_app_state', {
      p_key: 'kostpro_' + name,
      p_value: value,
    });

    if (error) {
      window.dispatchEvent(new CustomEvent('kostpro:data-save-error', {
        detail: { name, message: error.message || 'Gagal menyimpan data ke database.' }
      }));
      throw new Error(/PROPERTY_NOT_FOUND/i.test(error.message || '') ? 'Account ini belum memiliki property/database aktif. Buka User & Akses → CREATE DATABASE untuk membuat property, atau LOGIN DATABASE dengan account pemilik property.' : /PROPERTY_ACCESS_DENIED/i.test(error.message || '') ? 'Account tidak memiliki akses ke property ini.' : (error.message || 'Gagal menyimpan data ke database.'));
    }

    sessionStorage.removeItem(PENDING_DRAFT_KEY);
  });

  await cloudSyncQueue;
}

export type RoomStatus = 'occupied'|'available'|'maintenance';
export type Room = { id:string; tenant:string; price:number; status:RoomStatus };
export type Payment = { receiptNo?:string; id:string; tenant:string; room:string; month:string; amount:number; status:'paid'|'unpaid'; paidAt?:string; method?:string };
export type Tenant = { id:string; name:string; room:string; phone:string; startDate:string; rent:number; endDate?:string; status?:'active'|'history'; checkoutReason?:'checkout'|'expired'|'transferred' };
export type Transaction = { id:string; date:string; description:string; category:string; amount:number; type:'income'|'expense'; referenceId?:string };

export const defaultRooms:Room[] = [];
export const defaultTenants:Tenant[] = [];
export const defaultPayments:Payment[] = [];
export const defaultTransactions:Transaction[] = [];

const isActiveDataScope = () =>
  typeof window !== 'undefined' && Boolean(sessionStorage.getItem('kostpro-active-user'));

const emptyForUnauthenticated = <T,>(name:string,fallback:T):T => {
  if (name === 'settings') return {} as T;
  if (Array.isArray(fallback)) return [] as T;
  return fallback;
};

export function loadData<T>(name:string,fallback:T):T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem('kostpro_' + name);
    if (v) return JSON.parse(v);
    return isActiveDataScope() ? fallback : emptyForUnauthenticated(name,fallback);
  } catch {
    return emptyForUnauthenticated(name,fallback);
  }
}

export async function saveData<T>(name:string,v:T): Promise<void> {
  if (typeof window === 'undefined') return;

  // Auth/hydration errors stay separate from localStorage failures.
  // This also keeps the real Supabase error visible to the caller.
  // Auth/hydration errors are deliberately kept outside the localStorage
  // try/catch so they cannot be misreported as "storage full".
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Do not block user input behind the hydration event. If a page was already
  // open when login completed, bootstrap the canonical property state here
  // before writing. This makes the first post-login save reliable even when
  // React mounted before AccountDataSync finished.
  let valueToSave: T = v;
  if (user && CLOUD_KEYS.has(name) && sessionStorage.getItem(HYDRATION_READY_KEY) !== '1') {
    const { data: cloudState, error: cloudError } = await supabase.rpc('get_property_app_state');
    if (cloudError) {
      throw new Error(cloudError.message || 'Gagal memuat data property sebelum menyimpan.');
    }

    const state = cloudState && typeof cloudState === 'object'
      ? cloudState as Record<string, unknown>
      : {};
    const cloudValue = state['kostpro_' + name];

    // For the common first-login/add-data race, merge array records by id so
    // existing cloud records cannot be overwritten by an empty/stale page state.
    // For object settings, merge keys. Once hydrated, the caller's value is
    // authoritative (including intentional deletes/edits).
    if (Array.isArray(v) && Array.isArray(cloudValue)) {
      const incoming = v as Array<{ id?: unknown }>;
      const existing = cloudValue as Array<{ id?: unknown }>;
      const incomingIds = new Set(incoming.map(item => item?.id).filter(Boolean));
      valueToSave = [
        ...existing.filter(item => !incomingIds.has(item?.id)),
        ...incoming,
      ] as T;
    } else if (
      v && typeof v === 'object' && !Array.isArray(v) &&
      cloudValue && typeof cloudValue === 'object' && !Array.isArray(cloudValue)
    ) {
      valueToSave = { ...(cloudValue as object), ...(v as object) } as T;
    }

    // Establish the same scoped state locally so subsequent page actions work
    // immediately without waiting for a reload.
    try {
      localStorage.setItem('kostpro_' + name, JSON.stringify(valueToSave));
    } catch {
      throw new Error('Penyimpanan lokal penuh atau data terlalu besar.');
    }
    sessionStorage.setItem(ACTIVE_USER_KEY, user.id);
    sessionStorage.setItem(HYDRATION_READY_KEY, '1');
  }

  try {
    localStorage.setItem('kostpro_' + name, JSON.stringify(valueToSave));
  } catch {
    window.dispatchEvent(new CustomEvent('kostpro:data-save-error', {
      detail: { name, message: 'Penyimpanan lokal penuh atau data terlalu besar.' }
    }));
    throw new Error('Penyimpanan lokal penuh atau data terlalu besar.');
  }

  if (CLOUD_KEYS.has(name)) await syncLocalStateToCloud(name,valueToSave);

  window.dispatchEvent(new CustomEvent('kostpro:data-saved', { detail: { name } }));
}

export const money = (n:number) =>
  new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
