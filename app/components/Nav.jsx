'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Nav() {
  const router = useRouter();

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
        <li><a href="#brands">Lorem</a></li>
        <li><a href="#pricing">Lorem</a></li>
        <li><a href="#footer-wrap">Contact</a></li>
      </ul>
      <button className="nav-cta" onClick={() => router.push('/login')}>Login</button>
    </nav>
  );
}