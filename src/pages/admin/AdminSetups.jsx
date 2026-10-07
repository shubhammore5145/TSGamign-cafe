import React, { useState, useEffect } from 'react';
import {
  subscribeToSetups,
  addSetup,
  updateSetup,
  deleteSetup,
} from '../../firebase/firestore';
import { uploadSetupImage } from '../../firebase/storage';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, X, Gamepad2, Sparkles, Filter } from 'lucide-react';

const TYPES = ['PS5', 'PS4', 'PS3', 'PS2'];
const STATUSES = ['available', 'occupied', 'maintenance'];

const DEFAULT_FORM = {
  name: '',
  type: 'PS5',
  setupNumber: 1,
  pricePerHour: 100,
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
    status: 'available',
    specs: ['2x DualShock 2 Wired Controllers', 'Memory Card 64MB', 'CRT / Gaming Display'],
    games: ['GTA San Andreas', 'GTA Vice City', 'WWE SmackDown Here Comes The Pain', 'God of War II', 'Tekken 5', 'Need for Speed Most Wanted'],
    image: '',
  },
];

export default function AdminSetups() {
  const [setups, setSetups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [imageFile, setImageFile] = useState(null);
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
    });
    setEditingId(null);
    setImageFile(null);
    setShowModal(true);
  };

  const openEdit = (setup) => {
    setForm({
      name: setup.name,
      type: setup.type || 'PS5',
      setupNumber: setup.setupNumber || 1,
      pricePerHour: setup.pricePerHour || 100,
      status: setup.status || 'available',
      specs: Array.isArray(setup.specs) ? setup.specs.join('\n') : (setup.specs || ''),
      games: Array.isArray(setup.games) ? setup.games.join('\n') : (setup.games || ''),
      image: setup.image || '',
    });
    setEditingId(setup.id);
    setImageFile(null);
    setShowModal(true);
  };

  const handleTypeSelectInForm = (type) => {
    let rate = 100;
    let specs = '';
    let games = '';

    if (type === 'PS5') {
      rate = 100;
      specs = '2x DualSense Wireless Controllers\n55-inch 4K 120Hz TV\nUltra High-Speed SSD';
      games = 'EA Sports FC 24\nGTA V\nWWE 2K24\nGod of War Ragnarök\nSpider-Man 2\nTekken 8';
    } else if (type === 'PS4') {
      rate = 60;
      specs = '2x DualShock 4 Wireless Controllers\n43-inch 4K HDR TV';
      games = 'FIFA 23\nGTA V\nWWE 2K22\nGod of War\nSpider-Man\nMortal Kombat 11';
    } else if (type === 'PS3') {
      rate = 40;
      specs = '2x DualShock 3 Wireless Controllers\n32-inch HD TV';
      games = 'GTA IV\nFIFA 18\nWWE 2K14\nGod of War III\nTekken 6\nBlur Racing';
    } else if (type === 'PS2') {
      rate = 30;
      specs = '2x DualShock 2 Controllers\nMemory Card 64MB';
      games = 'GTA San Andreas\nGTA Vice City\nWWE SmackDown Here Comes The Pain\nGod of War II\nTekken 5';
    }

    setForm(prev => ({
      ...prev,
      type,
      pricePerHour: rate,
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
      const data = {
        name: form.name.trim(),
        type: form.type,
        setupNumber: Number(form.setupNumber),
        pricePerHour: Number(form.pricePerHour),
        status: form.status,
        specs: form.specs.split('\n').map(s => s.trim()).filter(Boolean),
        games: form.games.split('\n').map(g => g.trim()).filter(Boolean),
        image: form.image,
      };

      if (editingId) {
        if (imageFile) {
          data.image = await uploadSetupImage(imageFile, editingId);
        }
        await updateSetup(editingId, data);
        toast.success('Updated', `${data.name} updated.`);
      } else {
        const ref = await addSetup(data);
        if (imageFile) {
          const imgUrl = await uploadSetupImage(imageFile, ref.id);
          await updateSetup(ref.id, { image: imgUrl });
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
              title="Add PS2, PS3, PS4, PS5 sample setups"
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
          <div key={setup.id} className="glass admin-setup-manage-card">
            <div className="admin-setup-manage-card__image" style={{ background: 'rgba(147, 51, 234, 0.08)' }}>
              {setup.image ? (
                <img src={setup.image} alt={setup.name} />
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
              <div style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '1.1rem', margin: '4px 0' }}>
                ₹{setup.pricePerHour}/hr
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

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Price / Hour (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.pricePerHour}
                    min={1}
                    onChange={e => setForm(p => ({ ...p, pricePerHour: e.target.value }))}
                    id="setup-price-input"
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
                <label className="form-label">Console Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setImageFile(e.target.files[0])}
                  className="form-input"
                  id="setup-image-input"
                />
                {form.image && (
                  <img
                    src={form.image}
                    alt="Current"
                    style={{ height: 80, borderRadius: 'var(--radius-sm)', marginTop: 6 }}
                  />
                )}
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
