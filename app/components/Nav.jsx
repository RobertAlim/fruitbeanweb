'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState(null); // { name, type } once resolved

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
    if (user?.type === 'admin') router.push('/admin');
    else router.push('/client');
  }

  return (
    <nav>
      <a href="#" className="logo">
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

      {user ? (
        <div className="nav-user">
          <span className="nav-user__name">👤 {user.name}</span>
          <button className="nav-cta" onClick={goToDashboard}>My Dashboard</button>
        </div>
      ) : (
        <button className="nav-cta" onClick={() => router.push('/login')}>Login</button>
      )}
    </nav>
  );
}
