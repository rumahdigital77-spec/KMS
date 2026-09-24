'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError('');
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: username.trim().toLowerCase() + '@kms.local',
      password,
    });

    if (authError || !data.user) {
      setError('Username atau password salah.');
      setLoading(false);
      return;
    }

    const { data: mapping, error: mappingError } = await supabase
      .from('property_users')
      .select('property_id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (mappingError || !mapping?.property_id) {
      await supabase.auth.signOut();
      setError('Akun belum terhubung ke properti.');
      setLoading(false);
      return;
    }

    localStorage.setItem('kostpro_active_property_id', mapping.property_id);
    router.push(new URLSearchParams(window.location.search).get('next') || '/');
  };

  return (
    <main style={{ maxWidth: 460, margin: '8vh auto', padding: 20 }}>
      <div className="card">
        <div className="title">Login Pengelola</div>
        <div className="sub" style={{ marginBottom: 20 }}>
          Masuk menggunakan akun properti masing-masing.
        </div>
        <div className="form">
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" onKeyDown={e => { if (e.key === 'Enter') login(); }} />
          </div>
        </div>
        {error && <div style={{ color: '#b91c1c', marginTop: 12, fontWeight: 700 }}>{error}</div>}
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="btn" onClick={login} disabled={loading}>{loading ? 'Memproses...' : 'Login'}</button>
          <a className="btn" href="/daftar">Daftar Properti</a>
        </div>
      </div>
    </main>
  );
}
