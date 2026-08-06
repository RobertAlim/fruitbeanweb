'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import '../login/login.css';
import { notify } from '../components/toast';

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token         = searchParams.get('token') || '';

  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]               = useState(false);
  const [errors, setErrors]                   = useState({ password: '', confirmPassword: '' });
  const [feedback, setFeedback]               = useState({ msg: '', type: '' });
  const [loading, setLoading]                 = useState(false);
  const [done, setDone]                       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!token) {
      setFeedback({ msg: 'This reset link is missing its token. Please request a new one.', type: 'error' });
      return;
    }
    if (!password)                      errs.password = 'This field is required.';
    else if (password.length < 8)       errs.password = 'Must be at least 8 characters.';
    if (!confirmPassword)                errs.confirmPassword = 'This field is required.';
    else if (confirmPassword !== password) errs.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setErrors({ password: '', confirmPassword: '' });
    setLoading(true);
    setFeedback({ msg: '', type: '' });

    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();

      if (res.ok) {
        setDone(true);
        setFeedback({ msg: '✅ Password updated! Redirecting to login…', type: 'success' });
        notify('Password updated. Redirecting to login…', 'success');
        setTimeout(() => router.push('/login'), 1500);
      } else {
        setFeedback({ msg: data.error || 'Something went wrong. Please try again.', type: 'error' });
        notify(data.error || 'Something went wrong. Please try again.', 'error');
      }
    } catch {
      setFeedback({ msg: 'Network error. Please try again.', type: 'error' });
      notify('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
    <div className="page-wrap">

      {/* Left Panel */}
      <div className="panel panel--left">
        <a href="/" className="logo">
          <div className="logo-icon">
            <Image src="/Fruitbean Logo.png" alt="Fruitbean Logo" width={40} height={40} />
          </div>
          <div className="logo-text">
            <span className="brand">Fruit<span>bean</span></span>
            <span className="sub">Ink Refilling Station</span>
          </div>
        </a>

        <div className="illustration-wrap">
          <div className="circle-bg"></div>
          <span className="deco deco--tl"></span>
          <span className="deco deco--tr"></span>
          <span className="deco deco--bl"></span>
          <span className="deco deco--br"></span>
          <div className="laptop">
            <div className="laptop__screen">
              <div className="laptop__avatar">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="32" cy="24" r="11" fill="#b0bec5" />
                  <path d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#b0bec5" />
                </svg>
              </div>
            </div>
            <div className="laptop__base">
              <div className="laptop__hinge"></div>
            </div>
          </div>
        </div>
        <p className="panel__tagline">Reliable printers. Refilled ink. Zero hassle.</p>
      </div>

      {/* Right Panel */}
      <div className="panel panel--right">
        <a href="/login" className="back-home">
          <span className="back-home__arrow">←</span> Back to Login
        </a>

        <h1 className="form-title">Set a new password</h1>
        <p className="form-subtitle">Choose a new password for your account.</p>

        {!done && (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="password" className="field__label">New Password</label>
              <div className="field__input-wrap">
                <span className="field__icon">🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  id="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                  className={errors.password ? 'input--error' : ''}
                />
                <button type="button" className="field__toggle" onClick={() => setShowPass(p => !p)}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              <span className="field__error">{errors.password}</span>
            </div>

            <div className="field">
              <label htmlFor="confirmPassword" className="field__label">Confirm New Password</label>
              <div className="field__input-wrap">
                <span className="field__icon">🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                  className={errors.confirmPassword ? 'input--error' : ''}
                />
              </div>
              <span className="field__error">{errors.confirmPassword}</span>
            </div>

            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>

            <p className={`form-note${feedback.type ? ' ' + feedback.type : ''}`}>
              {feedback.msg}
            </p>
          </form>
        )}

        {done && (
          <p className={`form-note${feedback.type ? ' ' + feedback.type : ''}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
