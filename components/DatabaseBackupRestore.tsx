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

export default function DatabaseBackupRestore() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [propertyId, setPropertyId] = useState('');

  const supabase = createClient();

  useEffect(() => {
    let active = true;
    supabase
      .from('account_properties')
      .select('property_id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: { property_id: string } | null }) => {
        if (active) setPropertyId(data?.property_id || '');
      });
    return () => { active = false; };
  }, []);

  const backup = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.rpc('export_property_database_backup');
      if (error) throw error;
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

    if (!propertyId) {
      setMessage('Property aktif belum ditemukan. Login database terlebih dahulu.');
      return;
    }

    if (!confirm('Restore akan mengganti data property saat ini dengan isi backup. Pastikan backup benar. Lanjutkan?')) return;

    setBusy(true);
    setMessage('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupFile;

      if (parsed?.format !== 'KMS_DATABASE_BACKUP' || parsed?.version !== 1) {
        throw new Error('Format backup tidak dikenali atau versinya tidak didukung.');
      }
      if (parsed.property_id !== propertyId) {
        throw new Error('Backup ini berasal dari property/database berbeda. Restore dibatalkan untuk mencegah salah timpa data.');
      }
      if (!parsed.tables || typeof parsed.tables !== 'object') {
        throw new Error('Backup tidak memiliki data tabel yang valid.');
      }

      const { error } = await supabase.rpc('restore_property_database_backup', {
        p_backup: parsed,
        p_target_property_id: propertyId,
      });
      if (error) throw error;

      if (parsed.app_settings && typeof parsed.app_settings === 'object') {
        localStorage.setItem('kostpro_settings', JSON.stringify(parsed.app_settings));
      }

      setMessage('✓ Restore berhasil. Memuat ulang aplikasi...');
      setTimeout(() => window.location.reload(), 800);
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
        <button type="button" className="btn" onClick={backup} disabled={busy}>
          <Download size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
          {busy ? 'Memproses...' : 'BACKUP DATABASE'}
        </button>
        <label className="btn" style={{ cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .6 : 1 }}>
          <Upload size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
          RESTORE DATABASE
          <input type="file" accept=".json,application/json" onChange={restore} disabled={busy} style={{ display: 'none' }} />
        </label>
      </div>
      <div className="sub" style={{ marginTop: 12 }}>
        <DatabaseBackup size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Yang dicadangkan: property, kamar, penghuni, tagihan/invoice, pembayaran, dan pengeluaran.
      </div>
      {message && (
        <div className="sub" style={{ marginTop: 12, color: message.startsWith('✓') ? '#047857' : '#b45309', fontWeight: 700 }}>
          {message}
        </div>
      )}
    </div>
  );
}
