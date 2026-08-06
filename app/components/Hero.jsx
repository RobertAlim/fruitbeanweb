'use client';
import { useState, useEffect, useRef } from 'react';

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const total = 5;
  const progressRef = useRef(null);

  function goToSlide(n) { setCurrent(((n % total) + total) % total); }
  function nextSlide()  { setCurrent(c => (c + 1) % total); }
  function prevSlide()  { setCurrent(c => (c - 1 + total) % total); }
  function switchTab(tab) {
    const panel = document.getElementById(`tab-${tab}`);
    if (panel) panel.scrollIntoView({ behavior: 'smooth' });
  }

  // Progress bar drives the auto-advance
  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;

    bar.style.transition = 'none';
    bar.style.width = '0%';
    bar.getBoundingClientRect();
    bar.style.transition = 'width 5s linear';
    bar.style.width = '100%';

    const timer = setTimeout(() => {
      setCurrent(c => (c + 1) % total);
    }, 5000);

    return () => clearTimeout(timer);
  }, [current]);

  return (
    <div className="hero">
      <div className="slides" style={{ transform: `translateX(-${current * 100}%)` }}>

        {/* Slide 1 */}
        <div className={`slide slide-1${current === 0 ? ' slide-active' : ''}`}>
          <div className="slide-bg-blobs">
            <div className="blob" style={{ width: '320px', height: '320px', background: '#00aeef', top: '-80px', right: '100px', animationDelay: '0s' }}></div>
            <div className="blob" style={{ width: '200px', height: '200px', background: '#3ab549', bottom: '-40px', right: '300px', animationDelay: '2s' }}></div>
          </div>
          <div className="slide-content">
            <h1 className="slide-title">Mission and Vision<br /><span>Printing Made Easy</span></h1>
            <p className="slide-desc">We help businesses print without the headaches, reliable printer rentals, free ink refills, and fast technical support, all in one simple package.</p>
            <div className="slide-btns">
              <a href="#services" className="btn-primary">Learn More About Us</a>
              <a href="#contact" className="btn-outline">Contact Us</a>
            </div>
          </div>
        </div>

        {/* Slide 2 */}
        <div className={`slide slide-2${current === 1 ? ' slide-active' : ''}`}>
          <div className="slide-bg-blobs">
            <div className="blob" style={{ width: '280px', height: '280px', background: '#3ab549', top: '-60px', right: '120px', animationDelay: '1s' }}></div>
            <div className="blob" style={{ width: '220px', height: '220px', background: '#f5c518', bottom: '-30px', right: '350px', animationDelay: '3s' }}></div>
          </div>
          <div className="slide-content">
            <h1 className="slide-title">AVAILABLE PRINTERS AND PRICES<br /><span className="alt">MADE SIMPLE</span></h1>
            <p className="slide-desc">Straightforward monthly rates with no hidden fees,  browse our full lineup of Epson and Brother printers and find the right fit for your office.</p>
            <div className="slide-btns">
              <a href="#pricing" className="btn-primary">View Pricing</a>
              <a href="#brands" className="btn-outline">Browse Printer Models</a>
            </div>
          </div>
        </div>

        {/* Slide 3 — Top 3 Printers */}
        <div className={`slide slide-3${current === 2 ? ' slide-active' : ''}`}>
          <div className="slide-bg-blobs">
            <div className="blob" style={{ width: '300px', height: '300px', background: '#9b59b6', top: '-70px', right: '80px', animationDelay: '0.5s' }}></div>
            <div className="blob" style={{ width: '180px', height: '180px', background: '#e0338a', bottom: '-30px', right: '400px', animationDelay: '2.5s' }}></div>
          </div>
          <div className="slide3-wrap">
            <div className="slide3-heading">
              <h1 className="slide-title" style={{ fontSize: 'clamp(22px, 3vw, 42px)', marginBottom: '4px' }}>
                Top 3 Printers <span style={{ color: '#e0338a' }}>This Month</span>
              </h1>
            </div>

            <div className="slide3-rows">

              {/* Row 1 */}
              <div className="top-printer-row top-printer-row--left">
                <div className="top-printer-img">
                  <img src="TOP1.png" alt="Epson L3210" />
                </div>
                <div className="top-printer-desc">
                <span className="top-printer-badge">#1</span>
                <div className="top-printer-desc-text">
                  <h3>Epson L3210</h3>
                  <p>Affordable single-function inkjet. Perfect for home printing with ultra-low cost per page.</p>
                </div>
                <span className="top-printer-rate">₱1,700<small>/mo</small></span>
              </div>
              </div>

              {/* Row 2 */}
              <div className="top-printer-row top-printer-row--right">
                <div className="top-printer-desc">
                  <span className="top-printer-badge" style={{ background: '#00aeef' }}>#2</span>
                  <div className="top-printer-desc-text">
                    <h3>Epson L3110</h3>
                    <p>High-speed color printing built for busy offices. Crisp output, fast turnaround.</p>
                  </div>
                  <span className="top-printer-rate">₱1,500<small>/mo</small></span>
                </div>
                <div className="top-printer-img">
                  <img src="TOP2.png" alt="Epson L3110" />
                </div>
              </div>

              {/* Row 3 */}
              <div className="top-printer-row top-printer-row--left">
                <div className="top-printer-img">
                  <img src="TOP3.png" alt="Epson L121" />
                </div>
                <div className="top-printer-desc">
                  <span className="top-printer-badge" style={{ background: '#f5c518', color: '#1a1a2e' }}>#3</span>
                  <div className="top-printer-desc-text">
                    <h3>Epson L121</h3>
                    <p>Reliable everyday printing at an unbeatable price. Great for students and small offices.</p>
                  </div>
                  <span className="top-printer-rate">₱1,500<small>/mo</small></span>
                </div>
              </div>

            </div>

            <div className="slide3-footer">
              <a href="#services" onClick={() => switchTab('brands')} className="btn-outline">View All Epson Printers →</a>
            </div>
          </div>
        </div>

        {/* Slide 4 — Services Included */}
        <div className={`slide slide-4${current === 3 ? ' slide-active' : ''}`}>
          <div className="slide-bg-blobs">
            <div className="blob" style={{ width: '310px', height: '310px', background: '#00aeef', top: '-70px', right: '90px', animationDelay: '1s' }}></div>
            <div className="blob" style={{ width: '190px', height: '190px', background: '#f5c518', bottom: '-40px', right: '320px', animationDelay: '3.5s' }}></div>
          </div>
          <div className="slide4-wrap">
            <div className="slide4-left">
              <h1 className="slide-title" style={{ marginBottom: '14px', lineHeight: '1' }}>
                <span style={{ color: '#00aeef', display: 'block' }}>FREE</span>
                <span style={{ color: '#ffffff', fontSize: '0.5em', display: 'block', margin: '4px 0' }}> when you</span>
                <span style={{ color: '#18f518', display: 'block' }}>RENT A PRINTER</span>
              </h1>
              <ul className="slide4-service-list">
                <li style={{ fontSize: '15px' }}><span className="slide4-dot" style={{ background: '#00aeef' }}></span>Networking</li>
                <li style={{ fontSize: '15px' }}><span className="slide4-dot" style={{ background: '#e0338a' }}></span>Maintenance</li>
                <li style={{ fontSize: '15px' }}><span className="slide4-dot" style={{ background: '#f5c518' }}></span>Tech Support</li>
                <li style={{ fontSize: '15px' }}><span className="slide4-dot" style={{ background: '#00aeef' }}></span>Ink Supply</li>
                <li style={{ fontSize: '15px' }}><span className="slide4-dot" style={{ background: '#e0338a' }}></span>Setup</li>
                <li style={{ fontSize: '15px' }}><span className="slide4-dot" style={{ background: '#f5c518' }}></span>Delivery</li>
              </ul>
            </div>
            <div className="slide4-collage">
              <div className="s4-photo s4-photo-1"><img src="images/TECH-SUPPORT.jpg" alt="Tech Support" /></div>
              <div className="s4-photo s4-photo-2"><img src="images/REPAIR.jpg" alt=" Repair" /></div>
              <div className="s4-photo s4-photo-3"><img src="images/MAINTENANCE-1.jpg" alt="Maintenance" /></div>
              <div className="s4-photo s4-photo-4"><img src="images/INK-REFILL.jpg" alt="Ink Supply" /></div>
              <div className="s4-photo s4-photo-5"><img src="images/SETUP.jpg" alt="SETUP" /></div>
              <div className="s4-photo s4-photo-6"><img src="images/MAINTENANCE-2.jpg" alt="Delivery" /></div>
            </div>
          </div>
        </div>

        {/* Slide 5 — Our Ink */}
        <div className={`slide slide-5${current === 4 ? ' slide-active' : ''}`}>
          <div className="slide-bg-blobs">
            <div className="blob" style={{ width: '290px', height: '290px', background: '#f5c518', top: '-60px', right: '110px', animationDelay: '0.8s' }}></div>
            <div className="blob" style={{ width: '200px', height: '200px', background: '#3ab549', bottom: '-35px', right: '360px', animationDelay: '2.8s' }}></div>
          </div>
          <div className="slide5-wrap">
            <div className="slide5-content">
              <h1 className="slide-title">
                Vibrant Prints,<br />
                <span style={{ color: '#f5c518' }}>Our Own Ink.</span>
              </h1>
              <p className="slide-desc">
                Every print we produce uses our very own premium ink blend — crafted for richer colors,
                sharper text, and longer-lasting results. That's the Fruitbean difference.
              </p>
              <div className="slide5-ink-pills">
                <span className="ink-pill" style={{ background: '#000' }}>Black</span>
                <span className="ink-pill" style={{ background: '#00aeef' }}>Cyan</span>
                <span className="ink-pill" style={{ background: '#e0338a' }}>Magenta</span>
                <span className="ink-pill" style={{ background: '#f5c518', color: '#1a1a2e' }}>Yellow</span>
              </div>
            </div>
            <div className="slide5-photo">
              <img src="images/INK.png" alt="Fruitbean Premium Ink" />
              <div className="slide5-photo-badge"><span>✦</span> Premium Quality Ink</div>
            </div>
          </div>
        </div>

      </div>

      {/* Dots */}
      <div className="slider-dots">
        {[0, 1, 2, 3, 4].map(i => (
          <button key={i} className={`dot${current === i ? ' active' : ''}`} onClick={() => goToSlide(i)}></button>
        ))}
      </div>

      {/* Arrows */}
      <div className="slider-arrows">
        <button className="arrow-btn" onClick={prevSlide}>&#8249;</button>
        <button className="arrow-btn" onClick={nextSlide}>&#8250;</button>
      </div>

      <div className="slide-progress" ref={progressRef}></div>
    </div>
  );
}
