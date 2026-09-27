import { createClient as createSupabaseClient } from '@/lib/supabase-browser';

let cloudSyncQueue: Promise<void> = Promise.resolve();

const CLOUD_KEYS = new Set([
  'settings','rooms','tenants','payments','transactions','tenantHistory','paymentHistory','bookings','cctv'
]);

const PENDING_DRAFT_KEY = 'kostpro-pending-draft'; // scoped draft marker; never reused across authenticated properties

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

  try {
    localStorage.setItem('kostpro_' + name, JSON.stringify(v));
  } catch {
    window.dispatchEvent(new CustomEvent('kostpro:data-save-error', {
      detail: { name, message: 'Penyimpanan lokal penuh atau data terlalu besar.' }
    }));
    throw new Error('Penyimpanan lokal penuh atau data terlalu besar.');
  }

  if (CLOUD_KEYS.has(name)) await syncLocalStateToCloud(name,v);

  window.dispatchEvent(new CustomEvent('kostpro:data-saved', { detail: { name } }));
}

export const money = (n:number) =>
  new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
