import React, { useState, useEffect } from 'react';
import { getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { updateUser } from '../../firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { Users, Shield, User } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Error', 'Could not load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleAdmin = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await updateUser(user.id, { role: newRole });
    toast.success('Role Updated', `${user.name} is now ${newRole}.`);
    load();
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Users ({users.length})</h2>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      <div className="glass admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=9333ea&color=fff&size=40`}
                      alt={u.name}
                      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)', flexShrink: 0 }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name || 'N/A'}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{u.email}</td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{u.phone || '—'}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-active' : 'badge-pending'}`} style={{ fontSize: '0.65rem' }}>
                    {u.role === 'admin' ? <><Shield size={9} /> ADMIN</> : <><User size={9} /> USER</>}
                  </span>
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                  {u.createdAt?.toDate?.()?.toLocaleDateString('en-IN') || '—'}
                </td>
                <td>
                  <button
                    className={`btn btn-sm ${u.role === 'admin' ? 'btn-ghost' : 'btn-ghost'}`}
                    onClick={() => toggleAdmin(u)}
                    id={`toggle-admin-${u.id}`}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>Loading users...</div>
        )}
        {!loading && users.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>No users registered yet.</div>
        )}
      </div>
    </div>
  );
}
