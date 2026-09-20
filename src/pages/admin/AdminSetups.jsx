import React, { useState, useEffect } from 'react';
import {
  subscribeToSetups,
  addSetup,
  updateSetup,
  deleteSetup,
} from '../../firebase/firestore';
import { uploadSetupImage } from '../../firebase/storage';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, X, Monitor } from 'lucide-react';

const TYPES = ['PC', 'PS5', 'VR', 'Racing'];
const STATUSES = ['available', 'occupied', 'maintenance'];

const DEFAULT_FORM = {
  name: '', type: 'PC', setupNumber: 1, pricePerHour: 60,
  status: 'available', specs: '', games: '', image: '',
};

export default function AdminSetups() {
  const [setups, setSetups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => subscribeToSetups(setSetups), []);

  const openAdd = () => { setForm(DEFAULT_FORM); setEditingId(null); setShowModal(true); };
  const openEdit = (setup) => {
    setForm({
      name: setup.name, type: setup.type, setupNumber: setup.setupNumber,
      pricePerHour: setup.pricePerHour, status: setup.status,
      specs: (setup.specs || []).join('\n'),
      games: (setup.games || []).join('\n'),
      image: setup.image || '',
    });
    setEditingId(setup.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Validation', 'Setup name is required.'); return; }
    setSaving(true);
    try {
      const data = {
        name: form.name,
        type: form.type,
        setupNumber: Number(form.setupNumber),
        pricePerHour: Number(form.pricePerHour),
        status: form.status,
        specs: form.specs.split('\n').map(s => s.trim()).filter(Boolean),
        games: form.games.split('\n').map(g => g.trim()).filter(Boolean),
        image: form.image,
      };

      if (editingId) {
        // Upload new image if selected
        if (imageFile) {
          data.image = await uploadSetupImage(imageFile, editingId);
        }
        await updateSetup(editingId, data);
        toast.success('Updated', `${data.name} has been updated.`);
      } else {
        const ref = await addSetup(data);
        if (imageFile) {
          const imgUrl = await uploadSetupImage(imageFile, ref.id);
          await updateSetup(ref.id, { image: imgUrl });
        }
        toast.success('Added', `${data.name} has been added.`);
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

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Gaming Setups ({setups.length})</h2>
        <button className="btn btn-primary" onClick={openAdd} id="admin-add-setup-btn">
          <Plus size={16} /> Add Setup
        </button>
      </div>

      {/* Setup cards */}
      <div className="admin-setups-manage-grid">
        {setups.map(setup => (
          <div key={setup.id} className="glass admin-setup-manage-card">
            <div className="admin-setup-manage-card__image">
              {setup.image ? (
                <img src={setup.image} alt={setup.name} />
              ) : (
                <Monitor size={40} className="text-dim" />
              )}
              <span className={`badge badge-${setup.status}`} style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.6rem' }}>
                {setup.status?.toUpperCase()}
              </span>
            </div>
            <div className="admin-setup-manage-card__body">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', color: 'var(--color-primary)', letterSpacing: '0.2em' }}>
                #{String(setup.setupNumber).padStart(2,'0')} · {setup.type}
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem' }}>{setup.name}</div>
              <div style={{ color: 'var(--color-primary)', fontWeight: 700 }}>₹{setup.pricePerHour}/hr</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button className="btn btn-sm btn-ghost" onClick={() => openEdit(setup)} id={`edit-setup-${setup.id}`}>
                  <Edit2 size={13} /> Edit
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => handleStatusToggle(setup)}>
                  Toggle
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(setup.id, setup.name)} id={`delete-setup-${setup.id}`}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {setups.length === 0 && (
          <div className="glass" style={{ gridColumn: '1 / -1', padding: 'var(--space-3xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No setups yet. Click "Add Setup" to get started.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card glass-strong admin-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                {editingId ? 'Edit Setup' : 'Add New Setup'}
              </h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Setup Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="RTX Gaming PC" id="setup-name-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Setup Number</label>
                  <input type="number" className="form-input" value={form.setupNumber} min={1} onChange={e => setForm(p => ({...p, setupNumber: e.target.value}))} id="setup-number-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Price/Hour (₹)</label>
                  <input type="number" className="form-input" value={form.pricePerHour} min={1} onChange={e => setForm(p => ({...p, pricePerHour: e.target.value}))} id="setup-price-input" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Specifications (one per line)</label>
                <textarea className="form-input" rows={4} value={form.specs} onChange={e => setForm(p => ({...p, specs: e.target.value}))} placeholder="RTX 4090 GPU&#10;16GB DDR5 RAM&#10;144Hz Monitor" id="setup-specs-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Available Games (one per line)</label>
                <textarea className="form-input" rows={3} value={form.games} onChange={e => setForm(p => ({...p, games: e.target.value}))} placeholder="Valorant&#10;Counter-Strike 2&#10;GTA V" id="setup-games-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Setup Image</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="form-input" id="setup-image-input" />
                {form.image && <img src={form.image} alt="Current" style={{ height: 80, borderRadius: 'var(--radius-sm)', marginTop: 6 }} />}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary full-width" onClick={handleSave} disabled={saving} id="setup-save-btn">
                {saving ? 'Saving...' : editingId ? 'Update Setup' : 'Add Setup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
