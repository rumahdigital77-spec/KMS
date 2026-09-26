'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase-browser';
import DatabaseBackupRestore from '../../components/DatabaseBackupRestore';

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
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [access, setAccess] = useState<PropertyAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');

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
      setError(e instanceof Error ? e.message : 'Gagal membaca akses account.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccount();
    const { data: listener } = supabase.auth.onAuthStateChange(() => loadAccount());
    return () => listener.subscription.unsubscribe();
  }, []);


  const createDatabase = async (e: FormEvent) => {
    e.preventDefault();
    if (createBusy || account) return;
    setCreateMsg('');
    const email = createEmail.trim().toLowerCase();
    const name = propertyName.trim();
    if (!email || createPassword.length < 6 || !name) {
      setCreateMsg('Email, password minimal 6 karakter, dan nama property wajib diisi.');
      return;
    }
    setCreateBusy(true);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (user?.email?.toLowerCase() !== email) { await supabase.auth.signOut(); user = null; }
      if (!user) {
        const sign = await supabase.auth.signUp({
          email, password: createPassword,
          options: { data: { full_name: ownerName || email, property_name: name, address, phone } }
        });
        if (sign.error) {
          if (/already registered|already exists/i.test(sign.error.message || '')) {
            const login = await supabase.auth.signInWithPassword({ email, password: createPassword });
            if (login.error) throw new Error('Email sudah terdaftar tetapi password tidak cocok. Gunakan Database Login.');
            user = login.data.user;
          } else throw sign.error;
        } else {
          user = sign.data.user;
          if (!sign.data.session) throw new Error('EMAIL_NOT_CONFIRMED');
        }
      }
      if (!user) throw new Error('AUTH_USER_MISSING');
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('AUTH_SESSION_MISSING');
      const { data: membership, error: membershipError } = await supabase.from('account_properties')
        .select('property_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (membershipError) throw new Error('ACCOUNT_ACCESS_CHECK_FAILED: ' + membershipError.message);
      if (!membership?.property_id) throw new Error('DATABASE_PROVISIONING_FAILED: account property belum terbentuk. Coba LOGIN DATABASE sekali lalu ulangi.');
      setCreateMsg('✓ Database + account owner + property + akses berhasil dibuat.');
      setCreatePassword('');
      await loadAccount();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setCreateMsg(detail === 'EMAIL_NOT_CONFIRMED' ? 'Email belum terkonfirmasi. Pastikan Confirm email OFF pada project Supabase KMS.' :
        detail === 'AUTH_SESSION_MISSING' ? 'Session login belum tersedia. Silakan LOGIN DATABASE lalu ulangi CREATE DATABASE.' : detail || 'Pembuatan database gagal.');
    } finally { setCreateBusy(false); }
  };

  const loginDatabase = async (e: FormEvent) => {
    e.preventDefault();
    setLoginMsg('');
    setLoginBusy(true);
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(), password: loginPassword
      });
      if (loginError) throw loginError;
      setLoginPassword('');
      setLoginMsg('✓ Login database berhasil.');
      await loadAccount();
    } catch (err) {
      setLoginMsg(err instanceof Error ? err.message : 'Login database gagal.');
    } finally { setLoginBusy(false); }
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
          <div className="title">User & Akses</div>
          <div className="sub">Informasi account, status login, role, dan property yang dapat diakses.</div>
        </div>
      </div>

      {loading ? (
        <div className="card">Memeriksa sesi login...</div>
      ) : !account ? (
        <>
          <div className="card">
            <div className="section-title">🗄️ CREATE DATABASE</div>
            <div className="sub" style={{ marginBottom: 14 }}>Buat account owner dan database/property pertama.</div>
            <form onSubmit={createDatabase}>
              <div className="form">
                <div className="field"><label>Email Account</label><input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} placeholder="owner@email.com" autoComplete="email" /></div>
                <div className="field"><label>Password Login</label><input type="password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} placeholder="Minimal 6 karakter" autoComplete="new-password" /></div>
                <div className="field"><label>Nama Property</label><input value={propertyName} onChange={e => setPropertyName(e.target.value)} placeholder="Nama kost / hotel" /></div>
                <div className="field"><label>Nama Pemilik</label><input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Nama lengkap pemilik" /></div>
                <div className="field"><label>Nomor Telepon</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Nomor telepon" /></div>
                <div className="field full"><label>Alamat Property</label><textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} /></div>
              </div>
              <div className="actions" style={{ marginTop: 14 }}><button className="btn" type="submit" disabled={createBusy}>{createBusy ? 'Membuat...' : 'CREATE DATABASE'}</button></div>
            </form>
            {createMsg && <div className="sub" style={{ marginTop: 12, color: createMsg.startsWith('✓') ? '#047857' : '#b45309', fontWeight: 700 }}>{createMsg}</div>}
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <div className="section-title">🔐 LOGIN DATABASE</div>
            <div className="sub" style={{ marginBottom: 14 }}>Masuk menggunakan email dan password account database yang sudah dibuat.</div>
            <form onSubmit={loginDatabase}>
              <div className="form">
                <div className="field"><label>Email</label><input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="owner@email.com" autoComplete="email" /></div>
                <div className="field"><label>Password</label><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" autoComplete="current-password" /></div>
              </div>
              <div className="actions" style={{ marginTop: 14 }}><button className="btn" type="submit" disabled={loginBusy}>{loginBusy ? 'Masuk...' : 'LOGIN DATABASE'}</button></div>
            </form>
            {loginMsg && <div className="sub" style={{ marginTop: 12, color: '#b45309', fontWeight: 700 }}>{loginMsg}</div>}
          </div>
        </>
      ) : (
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

          <DatabaseBackupRestore />

          <div className="card" style={{ marginTop: 18 }}>
            <div className="section-title">🗄️ Akses Property</div>
            <div className="sub" style={{ marginBottom: 14 }}>
              Account ini hanya menampilkan property yang terhubung ke user melalui policy database.
            </div>
            {access.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {access.map(item => (
                  <div key={item.property_id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                    <b>{item.property?.name || 'Property'}</b>
                    <div className="sub">{item.property?.address || 'Alamat belum diisi'}</div>
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>Role: {item.role}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#047857', fontWeight: 700 }}>✓ Akses aktif</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sub">Belum ada property yang terhubung ke account ini.</div>
            )}
          </div>
        </>
      )}

      {message && <div className="sub" style={{ marginTop: 12, color: '#047857', fontWeight: 700 }}>{message}</div>}
      {error && <div className="sub" style={{ marginTop: 12, color: '#b45309', fontWeight: 700 }}>{error}</div>}
    </>
  );}
