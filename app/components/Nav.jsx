'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState(null); // { name, type } once resolved
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu automatically if the viewport is resized back
  // up to desktop width (e.g. rotating a tablet), so it can't get stuck open.
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) setMenuOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock background scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    // Check sessionStorage first; fall back to localStorage (Remember me)
    const clientId =
      sessionStorage.getItem('client_id') ||
      localStorage.getItem('client_id');

    if (clientId) {
      // If localStorage had the data but sessionStorage lost it (new tab/restart),
      // restore sessionStorage so the rest of the app keeps working seamlessly
      if (!sessionStorage.getItem('client_id')) {
        ['client_id', 'account_name', 'account_email', 'account_type'].forEach(key => {
          const val = localStorage.getItem(key);
          if (val) sessionStorage.setItem(key, val);
        });
      }

      const name = sessionStorage.getItem('account_name') || localStorage.getItem('account_name') || 'Account';
      const type = sessionStorage.getItem('account_type') || localStorage.getItem('account_type') || 'client';
      setUser({ name, type });
    }
  }, []);

  function goToDashboard() {
    setMenuOpen(false);
    if (user?.type === 'admin') router.push('/admin');
    else router.push('/client');
  }

  function goToLogin() {
    setMenuOpen(false);
    router.push('/login');
  }

  return (
    <nav>
      <a href="#" className="logo" onClick={() => setMenuOpen(false)}>
        <div className="logo-icon">
          <Image src="/Fruitbean Logo.png" alt="Fruitbean Logo" width={50} height={50} />
        </div>
        <div className="logo-text">
          <span className="brand">Fruit<span>bean</span></span>
          <span className="sub">Ink Refilling Station</span>
        </div>
      </a>

      <ul className="nav-links">
        <li><a href="#" className="active">Home</a></li>
        <li><a href="#services">Services</a></li>
        <li><a href="#footer-wrap">Contact</a></li>
      </ul>

      <div className="nav-desktop-actions">
        {user ? (
          <div className="nav-user">
            <span className="nav-user__name">👤 {user.name}</span>
            <button className="nav-cta" onClick={goToDashboard}>My Dashboard</button>
          </div>
        ) : (
          <button className="nav-cta" onClick={goToLogin}>Login</button>
        )}
      </div>

      {/* Mobile hamburger toggle — only visible under 768px */}
      <button
        className={`nav-burger${menuOpen ? ' open' : ''}`}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(o => !o)}
      >
        <span></span><span></span><span></span>
      </button>

      {/* Mobile slide-down menu */}
      <div className={`nav-mobile-menu${menuOpen ? ' open' : ''}`}>
        <ul className="nav-mobile-links">
          <li><a href="#" className="active" onClick={() => setMenuOpen(false)}>Home</a></li>
          <li><a href="#services" onClick={() => setMenuOpen(false)}>Services</a></li>
          <li><a href="#footer-wrap" onClick={() => setMenuOpen(false)}>Contact</a></li>
        </ul>
        {user ? (
          <div className="nav-mobile-user">
            <span className="nav-user__name">👤 {user.name}</span>
            <button className="nav-cta" onClick={goToDashboard}>My Dashboard</button>
          </div>
        ) : (
          <button className="nav-cta" onClick={goToLogin}>Login</button>
        )}
      </div>

      {/* Backdrop to close menu on outside tap */}
      {menuOpen && <div className="nav-mobile-backdrop" onClick={() => setMenuOpen(false)}></div>}
    </nav>
  );
}
