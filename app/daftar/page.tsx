'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DaftarPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', propertyName: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const submit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Pendaftaran gagal.');
        return;
      }

      router.push('/login?registered=1');
    } catch {
      setError('Tidak dapat menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 560, margin: '6vh auto', padding: 20 }}>
      <div className="card">
        <div className="title">Daftar Properti</div>
        <div className="sub" style={{ marginBottom: 20 }}>
          Setiap akun akan memiliki properti sendiri.
        </div>
        <div className="form">
          <div className="field">
            <label>Nama Pengelola</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="field">
            <label>Nama Properti / Kost</label>
            <input value={form.propertyName} onChange={e => set('propertyName', e.target.value)} />
          </div>
          <div className="field">
            <label>Username</label>
            <input value={form.username} onChange={e => set('username', e.target.value.toLowerCase())} autoComplete="username" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        {error && <div style={{ color: '#b91c1c', marginTop: 12, fontWeight: 700 }}>{error}</div>}
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="btn" onClick={submit} disabled={loading}>{loading ? 'Mendaftarkan...' : 'Buat Akun Properti'}</button>
          <button className="btn" onClick={() => router.push('/login')}>Kembali Login</button>
        </div>
      </div>
    </main>
  );
}
