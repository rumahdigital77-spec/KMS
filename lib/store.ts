
import { createClient as createSupabaseClient } from '@/lib/supabase-browser';

let cloudSyncQueue: Promise<void> = Promise.resolve();

const CLOUD_KEYS = new Set([
  'settings','rooms','tenants','payments','transactions','tenantHistory','paymentHistory','bookings','cctv'
]);

async function syncLocalStateToCloud(name: string, value: unknown) {
  if (!CLOUD_KEYS.has(name) || typeof window === 'undefined') return;
  cloudSyncQueue = cloudSyncQueue.then(async () => {
  try {
    const supabase = createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: account } = await supabase
      .from('user_accounts')
      .select('property_id')
      .eq('user_id', user.id)
      .maybeSingle();
    const propertyId = account?.property_id;
    if (!propertyId) return;

    const { data: row } = await supabase
      .from('property_app_state')
      .select('state')
      .eq('property_id', propertyId)
      .maybeSingle();

    const state = row?.state && typeof row.state === 'object'
      ? { ...(row.state as Record<string, unknown>) }
      : {};
    state['kostpro_' + name] = value;

    await supabase.from('property_app_state').upsert({
      property_id: propertyId,
      state,
      updated_at: new Date().toISOString(),
    });
    } catch {
      // Local cache remains usable if the network is temporarily unavailable.
    }
  });
  await cloudSyncQueue;
}

export type RoomStatus='occupied'|'available'|'maintenance';export type Room={id:string;tenant:string;price:number;status:RoomStatus};export type Payment={receiptNo?:string;id:string;tenant:string;room:string;month:string;amount:number;status:'paid'|'unpaid';paidAt?:string;method?:string};export type Tenant={id:string;name:string;room:string;phone:string;startDate:string;rent:number;endDate?:string;status?:'active'|'history';checkoutReason?:'checkout'|'expired'|'transferred'};export type Transaction={id:string;date:string;description:string;category:string;amount:number;type:'income'|'expense';referenceId?:string};
export const defaultRooms:Room[]=[];
export const defaultTenants:Tenant[]=[];
export const defaultPayments:Payment[]=[];
export const defaultTransactions:Transaction[]=[];
const isActiveDataScope = () => typeof window !== 'undefined' && Boolean(sessionStorage.getItem('kostpro-active-user'));
const emptyForUnauthenticated = <T,>(name:string,fallback:T):T => {
  if (name === 'settings') return {} as T;
  if (Array.isArray(fallback)) return [] as T;
  return fallback;
};
export function loadData<T>(name:string,fallback:T):T{
  if(typeof window==='undefined') return fallback;
  try{
    const v=localStorage.getItem('kostpro_'+name);
    if(v) return JSON.parse(v);
    return isActiveDataScope() ? fallback : emptyForUnauthenticated(name,fallback);
  }catch{return emptyForUnauthenticated(name,fallback)}
}
export function saveData<T>(name:string,v:T){
  if(typeof window!=='undefined' && isActiveDataScope()){
    localStorage.setItem('kostpro_'+name,JSON.stringify(v));
    void syncLocalStateToCloud(name,v);
  }
}export const money=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
