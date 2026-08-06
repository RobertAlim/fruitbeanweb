'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import './login.css';
import { notify } from '../components/toast';

function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors,   setErrors]   = useState({ email: '', password: '' });
  const [feedback, setFeedback] = useState({ msg: '', type: '' });
  const [loading,    setLoading]    = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!email)                  errs.email    = 'This field is required.';
    else if (!isValidEmail(email)) errs.email  = 'Enter a valid email address.';
    if (!password)               errs.password = 'This field is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setFeedback({ msg: '', type: '' });

    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (res.ok) {
        // Always keep the session alive for this tab
        sessionStorage.setItem('client_id',     data.client_id);
        sessionStorage.setItem('account_name',  data.account_name);
        sessionStorage.setItem('account_email', data.account_email);
        sessionStorage.setItem('account_type',  data.account_type);

        // "Remember me" → persist across browser restarts via localStorage
        if (rememberMe) {
          localStorage.setItem('client_id',     data.client_id);
          localStorage.setItem('account_name',  data.account_name);
          localStorage.setItem('account_email', data.account_email);
          localStorage.setItem('account_type',  data.account_type);
        } else {
          // Make sure any old persistent session is cleared
          localStorage.removeItem('client_id');
          localStorage.removeItem('account_name');
          localStorage.removeItem('account_email');
          localStorage.removeItem('account_type');
        }

        setFeedback({ msg: '✅ Login successful! Redirecting…', type: 'success' });
        notify('Login successful. Redirecting…', 'success');
        const destination = data.account_type === 'admin' ? '/admin' : '/client';
        setTimeout(() => router.push(destination), 800);
      } else {
        setFeedback({ msg: data.error || 'Incorrect email or password.', type: 'error' });
        notify(data.error || 'Incorrect email or password.', 'error');
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
        <a href="/" className="back-home">
          <span className="back-home__arrow">←</span> Back to Home
        </a>

        <h1 className="form-title">Welcome!</h1>
        <p className="form-subtitle">Sign in to your account</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email" className="field__label">Email</label>
            <div className="field__input-wrap">
              <span className="field__icon">✉</span>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                className={errors.email ? 'input--error' : ''}
              />
            </div>
            <span className="field__error">{errors.email}</span>
          </div>

          <div className="field">
            <label htmlFor="password" className="field__label">Password</label>
            <div className="field__input-wrap">
              <span className="field__icon">🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                id="password"
                placeholder="Enter your password"
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

          <div className="field field--row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              /> <span>Remember me</span>
            </label>
            <a href="/forgot-password" className="link">Forgot password?</a>
          </div>

          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>

          <p className={`form-note${feedback.type ? ' ' + feedback.type : ''}`}>
            {feedback.msg}
          </p>
        </form>

        <p className="form-subtitle" style={{ marginTop: '20px', textAlign: 'center' }}>
          Need admin access? <a href="/admin-signup" className="link">Request an admin account</a>
        </p>
      </div>
    </div>
    </div>
  );
}