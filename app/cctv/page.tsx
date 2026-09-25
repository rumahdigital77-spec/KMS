'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, ExternalLink, KeyRound, Pencil, Plus, Radio, Trash2, X } from 'lucide-react';

type CameraItem = {
  id: string;
  name: string;
  location: string;
  type: 'Web / Cloud' | 'NVR / DVR' | 'IP Camera';
  url: string;
  showOnDashboard: boolean;
  loginRequired: boolean;
  loginUrl: string;
  username: string;
};

const STORAGE_KEY = 'kostpro_cctv';

const emptyForm = {
  name: '',
  location: '',
  type: 'Web / Cloud' as CameraItem['type'],
  url: '',
  showOnDashboard: false,
  loginRequired: false,
  loginUrl: '',
  username: '',
};

function loadCameras(): CameraItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    return data.map((camera: any) => ({ ...camera, loginRequired: Boolean(camera.loginRequired), loginUrl: typeof camera.loginUrl === 'string' ? camera.loginUrl : '', username: typeof camera.username === 'string' ? camera.username : '' }));
  } catch {
    return [];
  }
}

export default function CCTVPage() {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    setCameras(loadCameras());
  }, []);

  const onlineCount = cameras.length;
  const previewCamera = useMemo(
    () => cameras.find(camera => camera.id === previewId) || null,
    [cameras, previewId]
  );

  function persist(next: CameraItem[]) {
    setCameras(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setNotice('');
    setShowForm(true);
  }

  function openEdit(camera: CameraItem) {
    setEditingId(camera.id);
    setForm({
      name: camera.name,
      location: camera.location,
      type: camera.type,
      url: camera.url,
      showOnDashboard: camera.showOnDashboard,
      loginRequired: Boolean(camera.loginRequired),
      loginUrl: camera.loginUrl || '',
      username: camera.username || '',
    });
    setNotice('');
    setShowForm(true);
  }

  function saveCamera() {
    const name = form.name.trim();
    const location = form.location.trim();
    const url = form.url.trim();
    const loginUrl = form.loginUrl.trim();
    if (form.loginRequired && loginUrl && !/^https?:\/\//i.test(loginUrl)) {
      setNotice('Link Login CCTV harus menggunakan http:// atau https://.');
      return;
    }

    if (!name || !url) {
      setNotice('Nama kamera dan Link Akses CCTV wajib diisi.');
      return;
    }

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setNotice('Link CCTV harus menggunakan http:// atau https://.');
        return;
      }
    } catch {
      setNotice('Link CCTV belum valid. Contoh: https://kamera-anda.example');
      return;
    }

    const item: CameraItem = {
      id: editingId || crypto.randomUUID(),
      name,
      location: location || 'Lokasi belum diisi',
      type: form.type,
      url,
      showOnDashboard: form.showOnDashboard,
      loginRequired: form.loginRequired,
      loginUrl: loginUrl || url,
      username: form.username.trim(),
    };

    const next = editingId
      ? cameras.map(camera => camera.id === editingId ? item : camera)
      : [item, ...cameras];

    persist(next);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setNotice('');
  }

  function removeCamera(id: string) {
    if (!window.confirm('Hapus kamera ini dari KMS?')) return;
    if (previewId === id) setPreviewId(null);
    persist(cameras.filter(camera => camera.id !== id));
  }

  function openLogin(camera: CameraItem) {
    window.open(camera.loginUrl || camera.url, '_blank', 'noopener,noreferrer');
  }

  function openCamera(camera: CameraItem) {
    window.open(camera.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="top">
        <div>
          <div className="title">CCTV</div>
          <div className="sub">Akses kamera kost dari satu tempat tanpa konfigurasi jaringan yang rumit.</div>
        </div>
        <button className="btn" type="button" onClick={openAdd}>
          <Plus size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Tambah CCTV
        </button>
      </div>

      <div className="cctv-summary">
        <div>
          <div className="cctv-summary-label"><Radio size={16} /> CCTV Terdaftar</div>
          <div className="cctv-summary-number">{onlineCount}</div>
          <div className="sub" style={{ color: '#dbeafe' }}>Koneksi dikelola langsung oleh kamera/NVR Anda.</div>
        </div>
        <div className="cctv-summary-icon"><Camera size={42} /></div>
      </div>

      {!cameras.length ? (
        <div className="card cctv-empty">
          <div className="cctv-empty-icon"><Camera size={30} /></div>
          <h3>Belum ada CCTV</h3>
          <p>Tambahkan link akses kamera atau NVR. KMS menyimpan konfigurasi ini di perangkat Anda. Jika CCTV membutuhkan login, KMS membuka halaman login resminya tanpa menyimpan password.</p>
          <button className="btn" type="button" onClick={openAdd}><Plus size={16} /> Tambah CCTV</button>
        </div>
      ) : (
        <div className="cctv-grid">
          {cameras.map(camera => (
            <div className="card cctv-card" key={camera.id}>
              <div className="cctv-card-head">
                <div>
                  <div className="cctv-name"><span className="cctv-dot" />{camera.name}</div>
                  <div className="sub">{camera.location} · {camera.type}</div>
                  {camera.loginRequired && <span className="cctv-login-badge"><KeyRound size={12} /> Login</span>}
                </div>
                <button className="icon-btn" type="button" aria-label={'Edit ' + camera.name} onClick={() => openEdit(camera)}><Pencil size={16} /></button>
              </div>

              {previewId === camera.id ? (
                <div className="cctv-preview">
                  <iframe
                    src={camera.url}
                    title={camera.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    allow="autoplay; fullscreen; picture-in-picture"
                  />
                  <div className="cctv-preview-note">
                    <span>Jika viewer meminta login, gunakan tombol Login CCTV.</span>
                    <button type="button" onClick={() => openCamera(camera)}><ExternalLink size={14} /> Buka Viewer</button>
                  </div>
                </div>
              ) : (
                <div className="cctv-placeholder">
                  <Camera size={34} />
                  <span>Viewer siap dibuka</span>
                  <small>KMS tidak menyimpan atau memproses video.</small>
                </div>
              )}

              <div className="cctv-actions">
                <button className="btn secondary" type="button" onClick={() => setPreviewId(previewId === camera.id ? null : camera.id)}>
                  <Camera size={15} /> {previewId === camera.id ? 'Tutup Viewer' : 'Lihat CCTV'}
                </button>
                {camera.loginRequired && <button className="btn secondary" type="button" onClick={() => openLogin(camera)}><KeyRound size={15} /> Login CCTV</button>}
                <button className="btn secondary" type="button" onClick={() => openCamera(camera)}>
                  <ExternalLink size={15} /> Buka
                </button>
                <button className="icon-btn danger" type="button" aria-label={'Hapus ' + camera.name} onClick={() => removeCamera(camera.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="cctv-form-title">
            <div className="modal-head">
              <div>
                <h3 id="cctv-form-title">{editingId ? 'Edit CCTV' : 'Tambah CCTV'}</h3>
                <div className="sub">Cukup masukkan link viewer CCTV yang sudah diberikan perangkat/NVR.</div>
              </div>
              <button className="icon-btn" type="button" aria-label="Tutup" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            {notice && <div className="notice error">{notice}</div>}

            <div className="form">
              <div className="field">
                <label>Nama Kamera *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Gerbang Depan" />
              </div>
              <div className="field">
                <label>Lokasi</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Contoh: Area Parkir" />
              </div>
              <div className="field">
                <label>Jenis</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as CameraItem['type'] })}>
                  <option>Web / Cloud</option>
                  <option>NVR / DVR</option>
                  <option>IP Camera</option>
                </select>
              </div>
              <div className="field">
                <label>Link Akses CCTV *</label>
                <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="field full"><label className="cctv-check"><input type="checkbox" checked={form.loginRequired} onChange={e => setForm({ ...form, loginRequired: e.target.checked })} /> CCTV membutuhkan login</label></div>
              {form.loginRequired && <>
                <div className="field"><label>Link Login CCTV</label><input type="url" value={form.loginUrl} onChange={e => setForm({ ...form, loginUrl: e.target.value })} placeholder="Kosongkan jika sama dengan link akses" /></div>
                <div className="field"><label>Username (opsional)</label><input autoComplete="username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Username CCTV" /></div>
                <div className="field full"><div className="cctv-password-note"><KeyRound size={15} /> Password diisi langsung di halaman login CCTV. KMS tidak menyimpan password.</div></div>
              </>}
              <div className="field full">
                <label className="cctv-check"><input type="checkbox" checked={form.showOnDashboard} onChange={e => setForm({ ...form, showOnDashboard: e.target.checked })} /> Tampilkan sebagai shortcut di Dashboard</label>
              </div>
            </div>

            <div className="cctv-help">
              <b>Tips koneksi pertama</b>
              <span>Gunakan link viewer resmi dari kamera/NVR. KMS tidak meminta IP, port, password kamera, atau konfigurasi router.</span>
            </div>

            <div className="actions">
              <button className="btn secondary" type="button" onClick={() => setShowForm(false)}>Batal</button>
              <button className="btn" type="button" onClick={saveCamera}>{editingId ? 'Simpan Perubahan' : 'Simpan CCTV'}</button>
            </div>
          </div>
        </div>
      )}

      {previewCamera && (
        <div className="cctv-security-note">
          <span><b>Catatan:</b> KMS hanya menyimpan link CCTV di penyimpanan lokal perangkat ini. Password kamera tidak disimpan oleh KMS.</span>
        </div>
      )}
    </div>
  );
}
