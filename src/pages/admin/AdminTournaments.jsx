import React, { useState, useEffect } from 'react';
import {
  getTournaments,
  addTournament,
  updateTournament,
  deleteTournament,
  getTournamentRegistrations,
} from '../../firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, X, Users, Trophy } from 'lucide-react';

const DEFAULT_FORM = {
  title: '', game: '', date: '', time: '', entryFee: 100,
  prizePool: '₹5,000', maxPlayers: 16, status: 'registration_open',
  description: '', winners: '',
};

export default function AdminTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [regsMap, setRegsMap] = useState({});
  const toast = useToast();

  const load = async () => {
    const snap = await getTournaments();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setTournaments(list);
    // Load registrations count
    const counts = {};
    await Promise.all(list.map(async t => {
      const r = await getTournamentRegistrations(t.id);
      counts[t.id] = r.size;
    }));
    setRegsMap(counts);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(DEFAULT_FORM); setEditingId(null); setShowModal(true); };
  const openEdit = (t) => {
    setForm({ ...DEFAULT_FORM, ...t, winners: (t.winners || []).join('\n') });
    setEditingId(t.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.game || !form.date) {
      toast.error('Validation', 'Title, game, and date are required.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        entryFee: Number(form.entryFee),
        maxPlayers: Number(form.maxPlayers),
        registeredPlayers: editingId ? (tournaments.find(t => t.id === editingId)?.registeredPlayers || 0) : 0,
        winners: form.winners.split('\n').map(w => w.trim()).filter(Boolean),
      };
      if (editingId) {
        await updateTournament(editingId, data);
        toast.success('Updated', `${data.title} updated.`);
      } else {
        await addTournament(data);
        toast.success('Created', `${data.title} created.`);
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await deleteTournament(id);
    toast.success('Deleted', `${title} removed.`);
    load();
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Tournaments ({tournaments.length})</h2>
        <button className="btn btn-primary" onClick={openAdd} id="admin-add-tournament-btn">
          <Plus size={16} /> Create Tournament
        </button>
      </div>

      <div className="glass admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tournament</th>
              <th>Game</th>
              <th>Date</th>
              <th>Time</th>
              <th>Entry</th>
              <th>Prize</th>
              <th>Players</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 700 }}>{t.title}</td>
                <td>{t.game}</td>
                <td>{t.date}</td>
                <td>{t.time}</td>
                <td>₹{t.entryFee}</td>
                <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{t.prizePool}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={12} /> {regsMap[t.id] || t.registeredPlayers}/{t.maxPlayers}
                  </div>
                </td>
                <td><span className={`badge badge-${t.status === 'registration_open' ? 'active' : t.status === 'full' ? 'occupied' : 'completed'}`} style={{ fontSize: '0.6rem' }}>
                  {t.status?.toUpperCase().replace('_', ' ')}
                </span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(t)} id={`edit-tournament-${t.id}`}>
                      <Edit2 size={12} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id, t.title)} id={`delete-tournament-${t.id}`}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tournaments.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>
            No tournaments yet. Create your first one!
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card glass-strong admin-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                <Trophy size={18} style={{ display: 'inline', marginRight: 8 }} />
                {editingId ? 'Edit Tournament' : 'Create Tournament'}
              </h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Valorant Championship" id="tournament-title-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Game</label>
                  <input className="form-input" value={form.game} onChange={e => setForm(p => ({...p, game: e.target.value}))} placeholder="Valorant" id="tournament-game-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} id="tournament-date-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input className="form-input" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} placeholder="4:00 PM" id="tournament-time-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Entry Fee (₹)</label>
                  <input type="number" className="form-input" value={form.entryFee} onChange={e => setForm(p => ({...p, entryFee: e.target.value}))} id="tournament-fee-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Prize Pool</label>
                  <input className="form-input" value={form.prizePool} onChange={e => setForm(p => ({...p, prizePool: e.target.value}))} placeholder="₹5,000" id="tournament-prize-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Players</label>
                  <input type="number" className="form-input" value={form.maxPlayers} onChange={e => setForm(p => ({...p, maxPlayers: e.target.value}))} id="tournament-max-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                    {['registration_open', 'full', 'ongoing', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} id="tournament-desc-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Winners (one per line — 1st, 2nd, 3rd)</label>
                <textarea className="form-input" rows={3} value={form.winners} onChange={e => setForm(p => ({...p, winners: e.target.value}))} placeholder="Aryan K.&#10;Rohit S.&#10;Priya M." id="tournament-winners-input" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary full-width" onClick={handleSave} disabled={saving} id="tournament-save-btn">
                {saving ? 'Saving...' : editingId ? 'Update Tournament' : 'Create Tournament'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
