'use client';
import { useState } from 'react';
import Image from 'next/image';
import '../login/login.css';
import { notify } from '../components/toast';

function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export default function AdminSignupPage() {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [number, setNumber]     = useState('');
  const [address, setAddress]   = useState('');
  const [email, setEmail]       = useState('');
  const [errors, setErrors]     = useState({});
  const [feedback, setFeedback] = useState({ msg: '', type: '' });
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!userName.trim())            errs.userName = 'This field is required.';
    if (!password)                   errs.password = 'This field is required.';
    else if (password.length < 8)    errs.password = 'Must be at least 8 characters.';
    if (!number.trim())              errs.number   = 'This field is required.';
    if (!address.trim())             errs.address  = 'This field is required.';
    if (!email)                      errs.email    = 'This field is required.';
    else if (!isValidEmail(email))   errs.email    = 'Enter a valid email address.';
    if (Object.keys(errs).length)    { setErrors(errs); return; }

    setErrors({});
    setLoading(true);
    setFeedback({ msg: '', type: '' });

    try {
      const res  = await fetch('/api/auth/register-admin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userName: userName.trim(),
          password,
          number: number.trim(),
          address: address.trim(),
          email: email.trim(),
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setFeedback({ msg: data.message, type: 'success' });
        notify(data.message || 'Signup request submitted.', 'success');
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

        <h1 className="form-title">Request an Admin Account</h1>
        <p className="form-subtitle">
          {submitted
            ? 'An existing admin will need to approve your request before you can log in.'
            : 'Fill this out to request access. An existing admin will need to approve it first.'}
        </p>

        {!submitted ? (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="userName" className="field__label">Username</label>
              <div className="field__input-wrap">
                <span className="field__icon">👤</span>
                <input
                  type="text"
                  id="userName"
                  placeholder="Your name"
                  value={userName}
                  onChange={e => { setUserName(e.target.value); setErrors(p => ({ ...p, userName: '' })); }}
                  className={errors.userName ? 'input--error' : ''}
                />
              </div>
              <span className="field__error">{errors.userName}</span>
            </div>

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
              <label htmlFor="number" className="field__label">Contact Number</label>
              <div className="field__input-wrap">
                <span className="field__icon">📞</span>
                <input
                  type="text"
                  id="number"
                  placeholder="09XX XXX XXXX"
                  value={number}
                  onChange={e => { setNumber(e.target.value); setErrors(p => ({ ...p, number: '' })); }}
                  className={errors.number ? 'input--error' : ''}
                />
              </div>
              <span className="field__error">{errors.number}</span>
            </div>

            <div className="field">
              <label htmlFor="address" className="field__label">Address</label>
              <div className="field__input-wrap">
                <span className="field__icon">📍</span>
                <input
                  type="text"
                  id="address"
                  placeholder="Your address"
                  value={address}
                  onChange={e => { setAddress(e.target.value); setErrors(p => ({ ...p, address: '' })); }}
                  className={errors.address ? 'input--error' : ''}
                />
              </div>
              <span className="field__error">{errors.address}</span>
            </div>

            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit Request'}
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
