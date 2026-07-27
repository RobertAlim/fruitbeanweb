'use client';
import { useState } from 'react';
import Image from 'next/image';
import '../login/login.css';

function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [error, setError]       = useState('');
  const [feedback, setFeedback] = useState({ msg: '', type: '' });
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email)                    { setError('This field is required.'); return; }
    if (!isValidEmail(email))      { setError('Enter a valid email address.'); return; }

    setError('');
    setLoading(true);
    setFeedback({ msg: '', type: '' });

    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setSent(true);
        setFeedback({ msg: data.message || "If an account exists for that email, we've sent a password reset link.", type: 'success' });
      } else {
        setFeedback({ msg: data.error || 'Something went wrong. Please try again.', type: 'error' });
      }
    } catch {
      setFeedback({ msg: 'Network error. Please try again.', type: 'error' });
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

        <h1 className="form-title">Forgot your password?</h1>
        <p className="form-subtitle">
          {sent
            ? 'Check your inbox for the reset link.'
            : "Enter your account email and we'll send you a link to reset it."}
        </p>

        {!sent ? (
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
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className={error ? 'input--error' : ''}
                />
              </div>
              <span className="field__error">{error}</span>
            </div>

            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p className={`form-note${feedback.type ? ' ' + feedback.type : ''}`}>
              {feedback.msg}
            </p>
          </form>
        ) : (
          <p className={`form-note${feedback.type ? ' ' + feedback.type : ''}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </div>
    </div>
  );
}
