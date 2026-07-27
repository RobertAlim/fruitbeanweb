'use client';
import { useEffect } from 'react';

export default function WhySection() {

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="why-section" id="why">
      <div className="left">
        <p className="section-label reveal">Why Fruitbean</p>
        <h2 className="section-title reveal">Quality you can<br />count on.</h2>
        <p className="section-subtitle reveal">Renting a printer shouldn't mean gambling on service you can't count on. 
          At Fruitbean, we handle the ink, the maintenance, and the headaches — so you can just print. Here's what you get when you rent with us.</p>
        <div className="why-grid">
          <div className="why-item reveal">
            <span className="why-item-icon">⚡</span>
            <div>
              <h4>Fast Service</h4>
              <p>We know a stuck printer means stuck work. Our technicians respond quickly and get you back up and running with minimal downtime, whether it's a quick fix or a full unit swap.</p>
            </div>
          </div>
          <div className="why-item reveal">
            <span className="why-item-icon">💧</span>
            <div>
              <h4>Quality Inks</h4>
              <p>Every refill uses genuine, high-yield ink built for consistent, professional output. No streaks, no faded pages — just clean prints your documents and clients can count on."</p>
            </div>
          </div>
          <div className="why-item reveal">
            <span className="why-item-icon">💸</span>
            <div>
              <h4>Affordable</h4>
              <p>Skip the upfront cost of buying a printer outright. One predictable monthly rate covers your unit, ink, and support — so you can budget with confidence and scale up as you grow.</p>
            </div>
          </div>
          <div className="why-item reveal">
            <span className="why-item-icon">🛡️</span>
            <div>
              <h4>Guaranteed</h4>
              <p>Every rental includes free repairs, replacements, and refills for as long as you're with us. If something goes wrong, it's on us to fix it — not an extra bill for you.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="ink-visual reveal">
        <div className="ink-bar-wrap">
          <div className="ink-bar-outer">
            <div className="ink-bar-inner" style={{'--h':'85%', background:'#e0338a'}}></div>
          </div>
          <span className="ink-bar-label">Magenta</span>
        </div>
        <div className="ink-bar-wrap">
          <div className="ink-bar-outer">
            <div className="ink-bar-inner" style={{'--h':'92%', background:'#00aeef', animationDelay:'0.2s'}}></div>
          </div>
          <span className="ink-bar-label">Cyan</span>
        </div>
        <div className="ink-bar-wrap">
          <div className="ink-bar-outer">
            <div className="ink-bar-inner" style={{'--h':'78%', background:'#f5c518', animationDelay:'0.4s'}}></div>
          </div>
          <span className="ink-bar-label">Yellow</span>
        </div>
        <div className="ink-bar-wrap">
          <div className="ink-bar-outer">
            <div className="ink-bar-inner" style={{'--h':'95%', background:'#222', animationDelay:'0.6s'}}></div>
          </div>
          <span className="ink-bar-label">Black</span>
        </div>
      </div>
    </section>
  );
}