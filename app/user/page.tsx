'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase-browser';

type UserAccount = {
  user_id: string;
  email: string;
  full_name: string | null;
  property_id: string | null;
  role: string;
  status: string;
};

type PropertyAccess = {
  property_id: string;
  role: string;
  property: { id: string; name: string; address: string | null; phone: string | null } | null;
};

export default function UserPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [access, setAccess] = useState<PropertyAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAccount = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccount(null);
        setAccess([]);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_accounts')
        .select('user_id,email,full_name,property_id,role,status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data: memberships, error: membershipError } = await supabase
        .from('account_properties')
        .select('property_id,role,properties(id,name,address,phone)')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      setAccount(profile || {
        user_id: user.id,
        email: user.email || '',
        full_name: (user.user_metadata?.full_name as string) || null,
        property_id: null,
        role: 'owner',
        status: 'active',
      });

      setAccess((memberships || []).map((row: any) => ({
        property_id: row.property_id,
        role: row.role,
        property: Array.isArray(row.properties) ? row.properties[0] || null : row.properties || null,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membaca akses database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccount();
    const { data: listener } = supabase.auth.onAuthStateChange(() => loadAccount());
    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (loginError) throw loginError;
      setPassword('');
      setMessage('✓ Login berhasil. Akses database sudah aktif.');
      await loadAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login gagal.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;
      setAccount(null);
      setAccess([]);
      setMessage('✓ Anda sudah logout.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logout gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="top">
        <div>
          <div className="title">User & Akses Database</div>
          <div className="sub">Login account, status akses, role, dan property yang dapat diakses.</div>
        </div>
      </div>

      {loading ? (
        <div className="card">Memeriksa sesi login...</div>
      ) : account ? (
        <>
          <div className="card">
            <div className="section-title">👤 Account Aktif</div>
            <div className="form">
              <div className="field"><label>Nama</label><input value={account.full_name || '-'} readOnly /></div>
              <div className="field"><label>Email Login</label><input value={account.email} readOnly /></div>
              <div className="field"><label>Role</label><input value={account.role} readOnly /></div>
              <div className="field"><label>Status</label><input value={account.status} readOnly /></div>
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              <button className="btn" type="button" onClick={logout} disabled={busy}>{busy ? 'Memproses...' : 'LOGOUT'}</button>
            </div>
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <div className="section-title">🗄️ Akses Database / Property</div>
            <div className="sub" style={{ marginBottom: 14 }}>
              Account ini hanya membaca property yang terhubung ke user melalui policy database.
            </div>
            {access.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {access.map(item => (
                  <div key={item.property_id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                    <b>{item.property?.name || 'Property'}</b>
                    <div className="sub">{item.property?.address || 'Alamat belum diisi'}</div>
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>Role: {item.role}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#047857', fontWeight: 700 }}>✓ Database access aktif</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sub">Belum ada property yang terhubung ke account ini.</div>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <div className="section-title">🔐 Login Database</div>
          <div className="sub" style={{ marginBottom: 14 }}>
            Masukkan email dan password account yang sudah dibuat melalui menu Pengaturan.
          </div>
          <form onSubmit={login}>
            <div className="form">
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@email.com" autoComplete="email" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required />
              </div>
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              <button className="btn" type="submit" disabled={busy}>{busy ? 'MASUK...' : 'LOGIN & AKSES DATABASE'}</button>
            </div>
          </form>
        </div>
      )}

      {message && <div className="sub" style={{ marginTop: 12, color: '#047857', fontWeight: 700 }}>{message}</div>}
      {error && <div className="sub" style={{ marginTop: 12, color: '#b45309', fontWeight: 700 }}>{error}</div>}
    </>
  );
}
