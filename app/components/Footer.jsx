export default function Footer() {
  return (
    <div className="footer-wrap" id="footer-wrap">
      <div className="footer-left">
        <div className="footer-contact-row">
          <div className="footer-icon-circle">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
          <div className="footer-contact-text">
            <span className="sub">Location</span>
            <span className="main">6223 Tramo St. San Dionisio, Parañaque, Philippines, 1700</span>
          </div>
        </div>
        <div className="footer-contact-row">
          <div className="footer-icon-circle">
            <svg viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z"/></svg>
          </div>
          <div className="footer-contact-text">
            <span className="sub">Call / Text</span>
            <span className="main">0949-885-8466</span>
          </div>
        </div>
        <div className="footer-contact-row">
          <div className="footer-icon-circle">
            <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
          </div>
          <div className="footer-contact-text">
            <span className="sub">Email</span>
            <a className="link" href="mailto:fruitbeanink@email.com">fruitbeanink@email.com</a>
          </div>
        </div>
      </div>
      <div className="footer-right">
        <h3>About Fruitbean Ink</h3>
        <p>Since 2015, Fruitbean Ink Refilling Station has been providing reliable, affordable, and high-quality ink refilling services to customers from both the North and South, serving schools, offices, and businesses.</p>
        <div className="footer-socials">
          <a href="https://www.facebook.com/FruitbeanInkRefillingStation/" target="_blank" rel="noopener" aria-label="Facebook">
            <svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
          <a href="https://www.instagram.com/fruitbeanrefillingstation/" target="_blank" rel="noopener" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round"/></svg>
          </a>
          <a href="https://www.tiktok.com/FruitbeanRefillingStation" target="_blank" rel="noopener" aria-label="TikTok">
            <svg viewBox="0 0 24 24" fill="#fff"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-6.13 6.33 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.75a4.85 4.85 0 0 1-1-.06z"/></svg>
          </a>
        </div>
      </div>
    </div>
  );
}