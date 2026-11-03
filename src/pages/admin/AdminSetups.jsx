import React, { useState, useEffect } from 'react';
import {
  subscribeToSetups,
  addSetup,
  updateSetup,
  deleteSetup,
} from '../../firebase/firestore';
import { uploadSetupImage } from '../../firebase/storage';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, X, Gamepad2, Sparkles, Filter, UploadCloud, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { processAndCompressImage, MAX_IMAGE_SIZE_KB } from '../../utils/imageCompressor';

const TYPES = ['PS5', 'PS4', 'PS3', 'PS2', 'PC', 'Racing'];
const STATUSES = ['available', 'occupied', 'maintenance'];

const DEFAULT_FORM = {
  name: '',
  type: 'PS5',
  setupNumber: 1,
  pricePerHour: 100,
  pricePer30Min: 60,
  capacity: 1,
  status: 'available',
  specs: '2x DualSense Wireless Controllers\n4K HDR Gaming TV\nUltra High-Speed SSD',
  games: 'EA Sports FC 24 / FIFA 24\nGTA V\nWWE 2K24\nGod of War Ragnarök\nSpider-Man 2\nTekken 8\nMortal Kombat 1',
  image: '',
};

const DEFAULT_PS_SEED = [
  {
    name: 'PlayStation 5 — Station #01',
    type: 'PS5',
    setupNumber: 1,
    pricePerHour: 100,
    pricePer30Min: 60,
    status: 'available',
    specs: ['2x DualSense Controllers', '55-inch 4K 120Hz TV', 'High-Speed SSD'],
    games: ['EA FC 24', 'GTA V', 'WWE 2K24', 'God of War Ragnarök', 'Spider-Man 2', 'Tekken 8', 'Mortal Kombat 1'],
    image: '',
  },
  {
    name: 'PlayStation 5 — Station #02',
    type: 'PS5',
    setupNumber: 2,
    pricePerHour: 100,
    pricePer30Min: 60,
    status: 'available',
    specs: ['2x DualSense Controllers', '55-inch 4K 120Hz TV', 'High-Speed SSD'],
    games: ['EA FC 24', 'GTA V', 'WWE 2K24', 'God of War Ragnarök', 'Spider-Man 2', 'Cricket 24'],
    image: '',
  },
  {
    name: 'PlayStation 4 Pro — Station #03',
    type: 'PS4',
    setupNumber: 3,
    pricePerHour: 60,
    pricePer30Min: 40,
    status: 'available',
    specs: ['2x DualShock 4 Controllers', '43-inch 4K HDR TV', '1TB Storage'],
    games: ['FIFA 23', 'GTA V', 'WWE 2K22', 'God of War', 'Spider-Man', 'Uncharted 4'],
    image: '',
  },
  {
    name: 'PlayStation 4 — Station #04',
    type: 'PS4',
    setupNumber: 4,
    pricePerHour: 60,
    pricePer30Min: 40,
    status: 'available',
    specs: ['2x DualShock 4 Controllers', '43-inch Full HD TV'],
    games: ['FIFA 22', 'GTA V', 'WWE 2K20', 'Mortal Kombat 11', 'Need for Speed Heat'],
    image: '',
  },
  {
    name: 'PlayStation 3 — Station #05',
    type: 'PS3',
    setupNumber: 5,
    pricePerHour: 40,
    pricePer30Min: 25,
    status: 'available',
    specs: ['2x DualShock 3 Wireless Controllers', '32-inch HD TV'],
    games: ['GTA IV', 'FIFA 18', 'WWE 2K14', 'God of War III', 'Tekken 6', 'Blur Racing'],
    image: '',
  },
  {
    name: 'PlayStation 2 Classic — Station #06',
    type: 'PS2',
    setupNumber: 6,
    pricePerHour: 30,
    pricePer30Min: 20,
    capacity: 6,
    status: 'available',
    specs: ['6-Player Multi-Seat Setup (6 Seats Capacity)', 'DualShock 2 Controllers', 'Memory Card 64MB', 'CRT / Gaming Display'],
    games: ['GTA San Andreas', 'GTA Vice City', 'WWE SmackDown Here Comes The Pain', 'God of War II', 'Tekken 5', 'Need for Speed Most Wanted'],
    image: '',
  },
  
  {
    name: 'Pro Gaming PC — Station #07',
    type: 'PC',
    setupNumber: 7,
    pricePerHour: 70,
    pricePer30Min: 45,
    status: 'available',
    specs: ['RTX 4060 GPU / Intel i7 13th Gen', '240Hz Gaming Monitor', 'Mechanical RGB Keyboard & Mouse'],
    games: ['Valorant', 'CS:GO 2', 'GTA V', 'Call of Duty Warzone', 'Fortnite', 'Apex Legends'],
    image: '/images/gallery/gaming-pc.jpg',
  },
  {
    name: 'Racing Simulator Cockpit — Station #08',
    type: 'Racing',
    setupNumber: 8,
    pricePerHour: 150,
    pricePer30Min: 90,
    status: 'available',
    specs: ['Logitech G29 Force Feedback Wheel', 'Metal Pedals & 6-Speed Shifter', 'Racing Bucket Seat'],
    games: ['Forza Horizon 5', 'F1 23', 'Assetto Corsa', 'Need for Speed Heat', 'Dirt Rally 2.0'],
    image: '/images/sim-racing.jpg',
  },
];

export default function AdminSetups() {
  const [setups, setSetups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [compressingImage, setCompressingImage] = useState(false);
  const [imageSizeInfo, setImageSizeInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState('All');
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();

  useEffect(() => subscribeToSetups(setSetups), []);

  const openAdd = () => {
    const nextNum = setups.length > 0 ? Math.max(...setups.map(s => Number(s.setupNumber) || 0)) + 1 : 1;
    setForm({
      ...DEFAULT_FORM,
      name: `PlayStation 5 — Station #${String(nextNum).padStart(2, '0')}`,
      setupNumber: nextNum,
      pricePerHour: 100,
      pricePer30Min: 60,
      capacity: 1,
    });
    setEditingId(null);
    setImageFile(null);
    setImageSizeInfo(null);
    setShowModal(true);
  };

  const openEdit = (setup) => {
    const hr = setup.pricePerHour || 100;
    setForm({
      name: setup.name,
      type: setup.type || 'PS5',
      setupNumber: setup.setupNumber || 1,
      pricePerHour: hr,
      pricePer30Min: setup.pricePer30Min || Math.round(hr * 0.6),
      capacity: setup.capacity || (setup.type === 'PS2' ? 6 : 1),
      status: setup.status || 'available',
      specs: Array.isArray(setup.specs) ? setup.specs.join('\n') : (setup.specs || ''),
      games: Array.isArray(setup.games) ? setup.games.join('\n') : (setup.games || ''),
      image: setup.image || '',
    });
    setEditingId(setup.id);
    setImageFile(null);
    setImageSizeInfo(null);
    setShowModal(true);
  };

  const handleSetupImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingImage(true);
    try {
      const res = await processAndCompressImage(file, MAX_IMAGE_SIZE_KB, 1200);
      setForm((prev) => ({ ...prev, image: res.dataUrl }));
      setImageSizeInfo({
        name: res.fileName,
        sizeKB: res.sizeKB,
        originalKB: res.originalKB,
      });

      try {
        const blob = await (await fetch(res.dataUrl)).blob();
        const compressedFile = new File([blob], res.fileName, { type: 'image/jpeg' });
        setImageFile(compressedFile);
      } catch (blobErr) {
        setImageFile(file);
      }

      toast.success(
        'Image Uploaded! 📷',
        `${res.fileName} optimized to ${res.sizeKB}KB (strictly <= 500KB limit).`
      );
    } catch (err) {
      console.warn('Setup image compression error:', err);
      toast.error('Image Error', err.message || 'Please select an image under 500KB.');
    } finally {
      setCompressingImage(false);
      e.target.value = '';
    }
  };

  const handleTypeSelectInForm = (type) => {
    let rate = 100;
    let rate30 = 60;
    let cap = 1;
    let specs = '';
    let games = '';

    if (type === 'PS5') {
      rate = 100;
      rate30 = 60;
      cap = 1;
      specs = '2x DualSense Wireless Controllers\n55-inch 4K 120Hz TV\nUltra High-Speed SSD';
      games = 'EA Sports FC 24\nGTA V\nWWE 2K24\nGod of War Ragnarök\nSpider-Man 2\nTekken 8';
    } else if (type === 'PS4') {
      rate = 60;
      rate30 = 40;
      cap = 1;
      specs = '2x DualShock 4 Wireless Controllers\n43-inch 4K HDR TV';
      games = 'FIFA 23\nGTA V\nWWE 2K22\nGod of War\nSpider-Man\nMortal Kombat 11';
    } else if (type === 'PS3') {
      rate = 40;
      rate30 = 25;
      cap = 1;
      specs = '2x DualShock 3 Wireless Controllers\n32-inch HD TV';
      games = 'GTA IV\nFIFA 18\nWWE 2K14\nGod of War III\nTekken 6\nBlur Racing';
    } else if (type === 'PS2') {
      rate = 30;
      rate30 = 20;
      cap = 6;
      specs = '6-Player Multi-Seat Setup (6 Seats Capacity)\nDualShock 2 Controllers\nMemory Card 64MB';
      games = 'GTA San Andreas\nGTA Vice City\nWWE SmackDown Here Comes The Pain\nGod of War II\nTekken 5';
    } else if (type === 'PC') {
      rate = 70;
      rate30 = 45;
      cap = 1;
      specs = 'RTX 4060 GPU / Intel i7 13th Gen\n240Hz High Refresh Monitor\nMechanical RGB Keyboard & Gaming Mouse';
      games = 'Valorant\nCS:GO 2\nGTA V\nCall of Duty Warzone\nFortnite\nApex Legends';
    } else if (type === 'Racing') {
      rate = 150;
      rate30 = 90;
      cap = 1;
      specs = 'Logitech G29 Force Feedback Wheel\nMetal Pedals & 6-Speed Shifter\nRacing Cockpit Bucket Seat';
      games = 'Forza Horizon 5\nF1 23\nAssetto Corsa\nNeed for Speed Heat\nDirt Rally 2.0';
    }

    setForm(prev => ({
      ...prev,
      type,
      pricePerHour: rate,
      pricePer30Min: rate30,
      capacity: cap,
      specs,
      games,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Validation', 'Console setup name is required.');
      return;
    }
    setSaving(true);
    try {
      const hrRate = Number(form.pricePerHour) || 100;
      const data = {
        name: form.name.trim(),
        type: form.type,
        setupNumber: Number(form.setupNumber),
        pricePerHour: hrRate,
        pricePer30Min: Number(form.pricePer30Min) || Math.round(hrRate * 0.6),
        capacity: Number(form.capacity) || (form.type === 'PS2' ? 6 : 1),
        status: form.status,
        specs: form.specs.split('\n').map(s => s.trim()).filter(Boolean),
        games: form.games.split('\n').map(g => g.trim()).filter(Boolean),
        image: form.image,
      };

      if (editingId) {
        if (imageFile) {
          try {
            data.image = await uploadSetupImage(imageFile, editingId);
          } catch (storageErr) {
            console.warn('Storage upload fallback to compressed image:', storageErr);
          }
        }
        await updateSetup(editingId, data);
        toast.success('Updated', `${data.name} updated.`);
      } else {
        const ref = await addSetup(data);
        if (imageFile) {
          try {
            const imgUrl = await uploadSetupImage(imageFile, ref.id);
            await updateSetup(ref.id, { image: imgUrl });
          } catch (storageErr) {
            console.warn('Storage upload fallback to compressed image:', storageErr);
          }
        }
        toast.success('Added', `${data.name} added.`);
      }
      setShowModal(false);
    } catch (err) {
      toast.error('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteSetup(id);
      toast.success('Deleted', `${name} removed.`);
    } catch (err) {
      toast.error('Error', err.message);
    }
  };

  const handleStatusToggle = async (setup) => {
    const nextStatus = setup.status === 'available' ? 'maintenance' : 'available';
    await updateSetup(setup.id, { status: nextStatus });
    toast.info('Status Updated', `${setup.name} → ${nextStatus}`);
  };

  // One-click seed default PlayStations (PS2, PS3, PS4, PS5)
  const handleSeedPlayStations = async () => {
    if (!confirm('Add default PlayStation consoles (PS2, PS3, PS4, PS5) to your cafe?')) return;
    setSeeding(true);
    try {
      for (const ps of DEFAULT_PS_SEED) {
        await addSetup(ps);
      }
      toast.success('PlayStation Consoles Added!', '6 PlayStation stations (PS2 to PS5) created.');
    } catch (err) {
      toast.error('Failed to add consoles', err.message);
    } finally {
      setSeeding(false);
    }
  };

  const filteredSetups = typeFilter === 'All'
    ? setups
    : setups.filter(s => s.type === typeFilter);

  return (
    <div>
      <div className="admin-section-header">
        <div>
          <h2 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gamepad2 size={24} style={{ color: 'var(--color-primary)' }} />
            PlayStation Consoles ({setups.length})
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Manage PlayStation 2, 3, 4, 5 consoles, hourly rates, and live availability
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {setups.length === 0 && (
            <button
              className="btn btn-secondary"
              onClick={handleSeedPlayStations}
              disabled={seeding}
              title="Add PS2, PS3, PS4, PS5 consoles"
            >
              <Sparkles size={16} /> {seeding ? 'Adding...' : '⚡ Quick Add PS2, PS3, PS4, PS5'}
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd} id="admin-add-setup-btn">
            <Plus size={16} /> + Add Console
          </button>
        </div>
      </div>

      {/* Type filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)' }}>
        {['All', 'PS5', 'PS4', 'PS3', 'PS2'].map(t => {
          const count = t === 'All' ? setups.length : setups.filter(s => s.type === t).length;
          const isActive = typeFilter === t;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                background: isActive ? 'var(--color-primary-dim)' : 'var(--color-surface)',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {t === 'All' ? '🎮 All Consoles' : `🎮 ${t}`}
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Setup cards */}
      <div className="admin-setups-manage-grid">
        {filteredSetups.map(setup => (
          <div key={setup.id} className="glass admin-setup-manage-card" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            <div className="admin-setup-manage-card__image" style={{
              position: 'relative',
              height: '160px',
              width: '100%',
              background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.18) 0%, #0a0b10 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {setup.image ? (
                <img
                  src={setup.image}
                  alt={setup.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <Gamepad2 size={44} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {setup.type || 'PS'}
                  </span>
                </div>
              )}
              <span
                className={`badge badge-${setup.status}`}
                style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.65rem' }}
              >
                {setup.status?.toUpperCase()}
              </span>
            </div>

            <div className="admin-setup-manage-card__body">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--color-accent)', letterSpacing: '0.2em' }}>
                STATION #{String(setup.setupNumber || 1).padStart(2, '0')} · {setup.type || 'PLAYSTATION'}
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', marginTop: 2 }}>
                {setup.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--color-primary-light)', fontWeight: 800, fontSize: '1.05rem' }}>
                  ₹{setup.pricePerHour}<span style={{ fontSize: '0.75rem', fontWeight: 600 }}>/hr</span>
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}>
                  ⏱️ 30m: ₹{setup.pricePer30Min || Math.round((setup.pricePerHour || 100) * 0.6)}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#00ff66',
                  background: 'rgba(0, 255, 102, 0.12)',
                  border: '1px solid rgba(0, 255, 102, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}>
                  👥 {setup.capacity || (setup.type === 'PS2' ? 6 : 1)} Seats Capacity
                </span>
              </div>

              {/* Specs & Games snippet */}
              {setup.games && setup.games.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🎮 {Array.isArray(setup.games) ? setup.games.slice(0, 3).join(', ') : setup.games}
                </div>
              )}

              <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => openEdit(setup)}
                  id={`edit-setup-${setup.id}`}
                  style={{ flex: 1 }}
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleStatusToggle(setup)}
                  title="Toggle available / maintenance"
                >
                  Toggle
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(setup.id, setup.name)}
                  id={`delete-setup-${setup.id}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredSetups.length === 0 && (
          <div className="glass" style={{ gridColumn: '1 / -1', padding: 'var(--space-3xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Gamepad2 size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--color-text-dim)' }} />
            <h3>No {typeFilter === 'All' ? 'PlayStation Consoles' : typeFilter} Added</h3>
            <p style={{ margin: 'var(--space-sm) 0 var(--space-lg)' }}>
              Add individual PlayStation setups or seed default consoles.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleSeedPlayStations} disabled={seeding}>
                <Sparkles size={14} /> Quick Add PS2, PS3, PS4, PS5
              </button>
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <Plus size={14} /> + Add Console
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card glass-strong admin-modal-card" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                  {editingId ? 'Edit PlayStation Setup' : '➕ Add PlayStation Setup'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Configure PlayStation station number, console version & pricing
                </span>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
              {/* Console Type Selection */}
              <div className="form-group">
                <label className="form-label">PlayStation Model / Console Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {TYPES.map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => handleTypeSelectInForm(t)}
                      style={{
                        padding: '10px 0',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: form.type === t ? 'var(--color-primary)' : 'var(--color-border)',
                        background: form.type === t ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: form.type === t ? '#fff' : 'var(--color-text)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Station Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder={`PlayStation ${form.type} #01`}
                    id="setup-name-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Station Number</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.setupNumber}
                    min={1}
                    onChange={e => setForm(p => ({ ...p, setupNumber: e.target.value }))}
                    id="setup-number-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Price / Hour (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.pricePerHour}
                    min={1}
                    onChange={e => {
                      const hr = Number(e.target.value) || 0;
                      setForm(p => ({
                        ...p,
                        pricePerHour: e.target.value,
                        pricePer30Min: p.pricePer30Min ? p.pricePer30Min : Math.round(hr * 0.6),
                      }));
                    }}
                    id="setup-price-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--color-accent)' }}>
                    ⏱️ Price for 30 Min (₹)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.pricePer30Min}
                    min={1}
                    onChange={e => setForm(p => ({ ...p, pricePer30Min: e.target.value }))}
                    id="setup-price-30m-input"
                    placeholder="e.g. 60"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#00ff66' }}>
                    👥 Seat Capacity (Seats / Players)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.capacity}
                    min={1}
                    max={12}
                    onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) || 1 }))}
                    id="setup-capacity-input"
                    placeholder="e.g. 6 for PS2"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Availability Status</label>
                  <select
                    className="form-input"
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="available">🟢 Available (Ready to Book)</option>
                    <option value="occupied">🔴 Occupied (In Session)</option>
                    <option value="maintenance">⚪ Maintenance / Repair</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Controllers & Screen Specs (one per line)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.specs}
                  onChange={e => setForm(p => ({ ...p, specs: e.target.value }))}
                  placeholder="2x DualSense Wireless Controllers&#10;55-inch 4K HDR TV"
                  id="setup-specs-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Installed Games (one per line)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.games}
                  onChange={e => setForm(p => ({ ...p, games: e.target.value }))}
                  placeholder="EA FC 24&#10;GTA V&#10;WWE 2K24&#10;God of War"
                  id="setup-games-input"
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={15} color="#9333ea" />
                    <span>Console Image (Optional)</span>
                  </label>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    Max 500 KB Limit
                  </span>
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleSetupImageUpload}
                  disabled={compressingImage}
                  id="setup-image-input"
                  style={{ display: 'none' }}
                />

                {form.image ? (
                  <div style={{
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '2px solid rgba(168, 85, 247, 0.5)',
                    background: '#070a13',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    position: 'relative',
                  }}>
                    {/* Large HD Preview Canvas */}
                    <div style={{
                      position: 'relative',
                      height: '200px',
                      width: '100%',
                      background: 'radial-gradient(circle at center, #261642 0%, #080a11 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      <img
                        src={form.image}
                        alt="Console preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />

                      {/* Top Overlay Badge & Action Buttons */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        right: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pointerEvents: 'none',
                      }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#34d399',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                          {imageSizeInfo ? `${imageSizeInfo.name} (${imageSizeInfo.sizeKB} KB)` : 'High Clarity (HD)'}
                        </span>

                        <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => document.getElementById('setup-image-input')?.click()}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '8px',
                              background: 'rgba(147, 51, 234, 0.95)',
                              border: 'none',
                              color: '#fff',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                            }}
                          >
                            Change Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setForm(p => ({ ...p, image: '' }));
                              setImageFile(null);
                              setImageSizeInfo(null);
                            }}
                            style={{
                              padding: '5px 9px',
                              borderRadius: '8px',
                              background: 'rgba(239, 68, 68, 0.95)',
                              border: 'none',
                              color: '#fff',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                            }}
                            title="Remove photo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Full View Info */}
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        fontSize: '0.72rem',
                        color: '#e2e8f0',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                        padding: '12px 6px 6px',
                        fontWeight: 600,
                      }}>
                        Full Console Photo · Crisp Resolution strictly under 500 KB
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !compressingImage && document.getElementById('setup-image-input')?.click()}
                    style={{
                      border: '2px dashed rgba(147, 51, 234, 0.45)',
                      borderRadius: '14px',
                      padding: '24px 16px',
                      background: 'rgba(147, 51, 234, 0.03)',
                      cursor: compressingImage ? 'wait' : 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#a855f7'; e.currentTarget.style.background = 'rgba(147, 51, 234, 0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.45)'; e.currentTarget.style.background = 'rgba(147, 51, 234, 0.03)'; }}
                  >
                    {compressingImage ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={28} color="#a855f7" className="animate-spin" />
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>Optimizing Photo for HD Clarity...</div>
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Checking 500 KB limit & preserving full sharpness</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '12px',
                          background: 'rgba(147, 51, 234, 0.12)',
                          border: '1.5px solid rgba(147, 51, 234, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <UploadCloud size={28} color="#a855f7" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                            Upload Console Photo from Device (Phone / PC)
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
                            Click or tap here to choose image · JPG, PNG, WEBP · Max 500 KB
                          </div>
                        </div>
                        <span style={{
                          marginTop: '4px',
                          display: 'inline-block',
                          padding: '6px 16px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          boxShadow: '0 4px 12px rgba(147, 51, 234, 0.35)',
                        }}>
                          Browse Photo
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Optional direct URL fallback */}
                <input
                  type="text"
                  placeholder="Or enter image URL e.g. /images/gallery/setup1.jpg"
                  value={form.image && !form.image.startsWith('data:') ? form.image : ''}
                  onChange={(e) => {
                    setForm(p => ({ ...p, image: e.target.value }));
                    setImageFile(null);
                    setImageSizeInfo(null);
                  }}
                  className="form-input"
                  style={{ marginTop: '8px', fontSize: '0.8rem', padding: '8px 12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary full-width"
                onClick={handleSave}
                disabled={saving}
                id="setup-save-btn"
              >
                {saving ? 'Saving...' : editingId ? 'Update Console' : 'Add Console Station'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
