
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

      const { error } = await supabase.rpc('save_property_app_state', {
        p_key: 'kostpro_' + name,
        p_value: value,
      });

      if (error) {
        window.dispatchEvent(new CustomEvent('kostpro:data-save-error',{
          detail:{name,message:error.message || 'Gagal menyimpan data ke database.'}
        }));
        throw new Error(error.message || 'Gagal menyimpan data ke database.');
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('kostpro:data-save-error',{
        detail:{name,message:error instanceof Error ? error.message : 'Gagal menyimpan data ke database.'}
      }));
      throw error instanceof Error ? error : new Error('Gagal menyimpan data ke database.');
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
export async function saveData<T>(name:string,v:T): Promise<void>{
  if(typeof window==='undefined') return;
  // Persist immediately in the browser so every form has an immediate save path.
  // Cloud sync is separately authorized by the current Supabase session/property.
  try {
    localStorage.setItem('kostpro_'+name,JSON.stringify(v));
  } catch {
    window.dispatchEvent(new CustomEvent('kostpro:data-save-error',{detail:{name,message:'Penyimpanan lokal penuh atau data terlalu besar.'}}));
    return;
  }
  if (CLOUD_KEYS.has(name)) await syncLocalStateToCloud(name,v);
  window.dispatchEvent(new CustomEvent('kostpro:data-saved',{detail:{name}}));
}export const money=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
