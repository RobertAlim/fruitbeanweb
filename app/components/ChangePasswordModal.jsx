'use client';
import { useState } from 'react';

export default function ChangePasswordModal({ clientId, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [error, setError]                     = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [success, setSuccess]                 = useState(false);

  const eyeBtnStyle = {
    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', lineHeight: 1,
  };
  const inputStyle = { minHeight: 'unset', resize: 'none', paddingRight: '40px' };

  async function handleSubmit() {
    if (submitting) return;
    setError('');

    if (!currentPassword)               { setError('Enter your current password.'); return; }
    if (!newPassword || newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    if (newPassword === currentPassword) { setError('New password must be different from your current password.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password.');
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: '420px' }}>
        {!success ? (
          <>
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>🔒 Change Password</h2>
                <p>Update the password for your account</p>
              </div>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-section-label">Current Password</div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="modal-notes"
                  style={inputStyle}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
                <button type="button" style={eyeBtnStyle} onClick={() => setShowCurrent(p => !p)}>
                  {showCurrent ? '🙈' : '👁'}
                </button>
              </div>

              <div className="modal-section-label">New Password</div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  className="modal-notes"
                  style={inputStyle}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                <button type="button" style={eyeBtnStyle} onClick={() => setShowNew(p => !p)}>
                  {showNew ? '🙈' : '👁'}
                </button>
              </div>

              <div className="modal-section-label">Confirm New Password</div>
              <input
                type={showNew ? 'text' : 'password'}
                className="modal-notes"
                style={{ minHeight: 'unset', resize: 'none' }}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              />

              {error && <div className="resolve-error">{error}</div>}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary"
                style={{ flex: 2, justifyContent: 'center' }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </>
        ) : (
          <div className="report-success">
            <div className="success-icon">✅</div>
            <h3>Password Updated!</h3>
            <p>Your password has been changed successfully. Use it the next time you log in.</p>
            <br />
            <button className="btn-primary" style={{ margin: '0 auto' }} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
