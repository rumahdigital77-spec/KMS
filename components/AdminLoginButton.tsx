'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function AdminLoginButton() {
  const supabase = createClient();
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setLoggedIn(Boolean(data.session?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setLoggedIn(Boolean(session?.user));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      setPassword('');
      setOpen(false);
      setMessage('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Login database gagal.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setLoggedIn(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Logout gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="admin-login-control">
        <button
          type="button"
          className="admin-login-trigger"
          aria-label={loggedIn ? 'Logout admin' : 'Login admin'}
          onClick={() => {
            if (loggedIn) void logout();
            else { setMessage(''); setOpen(true); }
          }}
          disabled={busy}
        >
          <img src="/admin-login-power.jpg" alt="" className="admin-login-icon" />
          <span>{loggedIn ? 'LOGOUT' : 'LOGIN'}</span>
        </button>
      </div>

      {open && !loggedIn && (
        <div className="admin-login-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="admin-login-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="admin-login-close" aria-label="Tutup" onClick={() => setOpen(false)}>×</button>
            <div className="admin-login-modal-icon">
              <img src="/admin-login-power.jpg" alt="Login Admin" />
            </div>
            <h3>LOGIN ADMIN</h3>
            <p>Masuk untuk mengakses database property yang terhubung ke account Anda.</p>
            <form onSubmit={submit}>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="owner@email.com" />
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required placeholder="Password" />
              {message && <div className="admin-login-error">{message}</div>}
              <button type="submit" className="btn admin-login-submit" disabled={busy}>
                {busy ? 'MEMPROSES...' : 'LOGIN DATABASE'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
