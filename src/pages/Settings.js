import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '' });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  async function handleProfileSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile);
      toast.success('Profile updated');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    setSaving(false);
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await authAPI.changePassword({ current_password: passwords.current_password, new_password: passwords.new_password });
      toast.success('Password changed');
      setPasswords({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    setSaving(false);
  }

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="page settings-page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-grid">
        {/* Profile */}
        <div className="card">
          <h3>Profile</h3>
          <div className="profile-header">
            <div className="avatar lg">{initials}</div>
            <div>
              <p className="profile-name">{user?.first_name} {user?.last_name}</p>
              <p className="profile-email">{user?.email}</p>
              <span className={`role-badge ${user?.role}`}>{user?.role}</span>
            </div>
          </div>
          <form onSubmit={handleProfileSave}>
            <div className="form-row">
              <div className="form-group">
                <label>First name</label>
                <input type="text" value={profile.first_name} onChange={e => setProfile({ ...profile, first_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Last name</label>
                <input type="text" value={profile.last_name} onChange={e => setProfile({ ...profile, last_name: e.target.value })} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>Save changes</button>
          </form>
        </div>

        {/* Password */}
        <div className="card">
          <h3>Change password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label>Current password</label>
              <input type="password" value={passwords.current_password} onChange={e => setPasswords({ ...passwords, current_password: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>New password</label>
              <input type="password" value={passwords.new_password} onChange={e => setPasswords({ ...passwords, new_password: e.target.value })} required minLength={8} />
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>Update password</button>
          </form>
        </div>

        {/* Account info */}
        <div className="card">
          <h3>Account</h3>
          <div className="info-list">
            <div className="info-row"><span className="info-label">Email</span><span>{user?.email}</span></div>
            <div className="info-row"><span className="info-label">Role</span><span className="capitalize">{user?.role}</span></div>
            <div className="info-row"><span className="info-label">Member since</span><span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span></div>
            <div className="info-row"><span className="info-label">Last login</span><span>{user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : '—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
