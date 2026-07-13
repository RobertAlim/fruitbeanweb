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
        <p className="section-subtitle reveal">Since 2015, Fruitbean Ink Refilling Station has been providing reliable, affordable, and high-quality ink refilling services to customers from both the North and South, serving schools, offices, and businesses.</p>
        <div className="why-grid">
          <div className="why-item reveal">
            <span className="why-item-icon">⚡</span>
            <div>
              <h4>Fast Service</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi tincidunt pulvinar tellus, nec ultrices eros blandit eu.</p>
            </div>
          </div>
          <div className="why-item reveal">
            <span className="why-item-icon">💧</span>
            <div>
              <h4>Quality Inks</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi tincidunt pulvinar tellus, nec ultrices eros blandit eu.</p>
            </div>
          </div>
          <div className="why-item reveal">
            <span className="why-item-icon">💸</span>
            <div>
              <h4>Affordable</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi tincidunt pulvinar tellus, nec ultrices eros blandit eu.</p>
            </div>
          </div>
          <div className="why-item reveal">
            <span className="why-item-icon">🛡️</span>
            <div>
              <h4>Guaranteed</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi tincidunt pulvinar tellus, nec ultrices eros blandit eu.</p>
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