'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { createClient } from '../lib/supabase-browser';
import { Download, Upload, DatabaseBackup } from 'lucide-react';

type BackupFile = {
  format: 'KMS_DATABASE_BACKUP';
  version: 1;
  created_at: string;
  property_id: string;
  tables: Record<string, unknown[]>;
  app_settings?: unknown;
};

function downloadJson(data: BackupFile) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `kms-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DatabaseBackupRestore({ propertyId: propertyIdProp = '' }: { propertyId?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [detectedPropertyId, setDetectedPropertyId] = useState('');
  const propertyId = propertyIdProp || detectedPropertyId;
  const ready = Boolean(propertyId);

  const supabase = createClient();

  useEffect(() => {
    let active = true;

    const loadPropertyId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (active) setDetectedPropertyId('');
          return;
        }

        const { data, error } = await supabase
          .from('account_properties')
          .select('property_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (active) setDetectedPropertyId(data?.property_id || '');
      } catch (err) {
        if (active) {
          setDetectedPropertyId('');
          setMessage(err instanceof Error ? `Gagal membaca property database: ${err.message}` : 'Gagal membaca property database.');
        }
      }
    };

    void loadPropertyId();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void loadPropertyId();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const backup = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.rpc('export_property_database_backup');
      if (error) throw error;
      if (!data || typeof data !== 'object') throw new Error('Data backup kosong atau tidak valid.');

      const rawSettings = localStorage.getItem('kostpro_settings');
      let appSettings: unknown = undefined;
      if (rawSettings) {
        try { appSettings = JSON.parse(rawSettings); } catch { appSettings = undefined; }
      }

      const payload = {
        ...(data as Omit<BackupFile, 'format' | 'created_at' | 'app_settings'>),
        format: 'KMS_DATABASE_BACKUP' as const,
        version: 1 as const,
        created_at: new Date().toISOString(),
        app_settings: appSettings,
      };

      if (!payload.property_id || !payload.tables) {
        throw new Error('Server mengembalikan backup yang tidak lengkap.');
      }

      downloadJson(payload);
      setMessage('✓ Backup berhasil dibuat dan diunduh.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Backup gagal.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ready || busy) {
      setMessage('Login database diperlukan untuk Restore.');
      return;
    }

    if (!confirm('Restore akan mengganti data property saat ini dengan isi backup. Pastikan backup benar. Lanjutkan?')) return;

    setBusy(true);
    setMessage('');
    try {
      const fileText = await file.text();
      const parsed = JSON.parse(fileText) as BackupFile;

      if (parsed?.format !== 'KMS_DATABASE_BACKUP' || parsed?.version !== 1) {
        throw new Error('Format backup tidak dikenali atau versinya tidak didukung.');
      }
      if (!parsed.property_id || parsed.property_id !== propertyId) {
        throw new Error('Backup ini berasal dari property/database berbeda. Restore dibatalkan untuk mencegah salah timpa data.');
      }
      if (!parsed.tables || typeof parsed.tables !== 'object') {
        throw new Error('Backup tidak memiliki data tabel yang valid.');
      }

      const { data, error } = await supabase.rpc('restore_property_database_backup', {
        p_backup: parsed,
        p_target_property_id: propertyId,
      });
      if (error) throw error;
      if (!data || typeof data !== 'object') throw new Error('Server tidak mengonfirmasi restore.');

      if (parsed.app_settings && typeof parsed.app_settings === 'object') {
        localStorage.setItem('kostpro_settings', JSON.stringify(parsed.app_settings));
      }

      setMessage('✓ Restore berhasil. Memuat ulang aplikasi...');
      window.setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Restore gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="section-title">Backup & Restore Database</div>
      <div className="sub" style={{ marginBottom: 14 }}>
        Simpan snapshot data property ke file JSON dan pulihkan kembali kapan saja. Backup tidak menyimpan password atau data auth.users.
      </div>
      <div className="actions" style={{ gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={backup} disabled={busy || !ready} title={!ready ? 'Login database diperlukan' : undefined}>
          <Download size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
          {busy ? 'Memproses...' : 'BACKUP DATABASE'}
        </button>
        <label className="btn" style={{ cursor: busy || !ready ? 'not-allowed' : 'pointer', opacity: busy || !ready ? .6 : 1 }} title={!ready ? 'Login database diperlukan' : undefined}>
          <Upload size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
          RESTORE DATABASE
          <input type="file" accept=".json,application/json" onChange={restore} disabled={busy || !ready} style={{ display: 'none' }} />
        </label>
      </div>
      <div className="sub" style={{ marginTop: 12 }}>
        <DatabaseBackup size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        {ready ? 'Yang dicadangkan: property, kamar, penghuni, tagihan/invoice, pembayaran, dan pengeluaran.' : '🔒 Login database diperlukan untuk mengaktifkan Backup & Restore.'}
      </div>
      {message && (
        <div className="sub" style={{ marginTop: 12, color: message.startsWith('✓') ? '#047857' : '#b45309', fontWeight: 700 }}>
          {message}
        </div>
      )}
    </div>
  );
}
