'use client';

import { useEffect } from 'react';

export default function WhySection() {
  useEffect(() => {
    // Reveal animation for text/cards — re-triggers every time you scroll
    // back into view (toggle, not just add)
    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle('visible', entry.isIntersecting);
        });
      },
      { threshold: 0.12 }
    );

    // NOTE: '.why-item' cards are observed directly now (no longer via
    // the generic '.reveal' class) — see the class-name change below and
    // the explanation of why that fixes the desktop reveal bug.
    document
      .querySelectorAll('.why-section .reveal, .why-section .why-item')
      .forEach(el => {
        revealObserver.observe(el);
      });

    // Ink bars — fill once, when they scroll into view.
    //
    // IMPORTANT: we observe '.ink-bar-outer' (the fixed-height container),
    // NOT '.ink-bar-inner' (the bar that starts at scaleY(0)). Observing
    // the inner bar meant IntersectionObserver was trying to measure the
    // visibility of an element that was squashed to ~0px tall before it
    // animated — an unstable, flicker-prone measurement that got worse
    // with scroll speed and zoom. The outer wrapper never changes size,
    // so its intersection ratio is stable.
    //
    // We also only fill once (unobserve after triggering) instead of
    // toggling on exit — the previous toggle-on-exit behavior could catch
    // a bar mid-transition and leave it partially filled.
    const inkObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const bar = entry.target.querySelector('.ink-bar-inner');
            if (bar) bar.classList.add('animate');
            inkObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll('.ink-bar-outer').forEach(el => {
      inkObserver.observe(el);
    });

    return () => {
      revealObserver.disconnect();
      inkObserver.disconnect();
    };
  }, []);

  return (
    <section className="why-section" id="why">

      {/* ─────────────────────────────────────────
          LEFT — BENEFITS
      ───────────────────────────────────────── */}
      <div className="why-left">

        <div className="why-kicker reveal">
          <span className="why-kicker-mark">
            <span></span>
            <span></span>
            <span></span>
          </span>
          WHY FRUITBEAN
        </div>

        <h2 className="section-title reveal">
          Quality you can
          <br />
          <span>count on.</span>
        </h2>

        <p className="section-subtitle reveal">
          Renting a printer shouldn't mean gambling on service you can't
          count on. At Fruitbean, we handle the ink, the maintenance,
          and the headaches — so you can just print.
        </p>

        <div className="why-grid">

          {/* 01 — FAST SERVICE */}
          {/* className changed: "why-item reveal" -> "why-item"
              (the card's own CSS already fully handles its reveal;
              keeping "reveal" here was the cause of the desktop glitch) */}
          <article className="why-item">
            <div className="why-item-top">
              <span className="why-item-number">01</span>

              <div className="why-item-icon icon-speed">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 14C4 9.58172 7.58172 6 12 6C16.4183 6 20 9.58172 20 14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 14L16 10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5 18H19"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="why-item-content">
              <h3>Fast Service</h3>
              <p>
                We know a stuck printer means stuck work. Our technicians
                respond quickly and get you back up and running with minimal
                downtime, whether it's a quick fix or a full unit swap.
              </p>
            </div>

            <span className="why-item-accent"></span>
          </article>

          {/* 02 — QUALITY INKS */}
          <article className="why-item">
            <div className="why-item-top">
              <span className="why-item-number">02</span>

              <div className="why-item-icon icon-ink">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 3C12 3 6 9.2 6 13.2C6 16.514 8.686 19 12 19C15.314 19 18 16.514 18 13.2C18 9.2 12 3 12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 14.5C9.5 15.6046 10.3954 16.5 11.5 16.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="why-item-content">
              <h3>Quality Inks</h3>
              <p>
                Every refill uses genuine, high-yield ink built for
                consistent, professional output. No streaks, no faded
                pages — just clean prints your documents and clients can
                count on.
              </p>
            </div>

            <span className="why-item-accent"></span>
          </article>

          {/* 03 — AFFORDABLE */}
          <article className="why-item">
            <div className="why-item-top">
              <span className="why-item-number">03</span>

              <div className="why-item-icon icon-price">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 3V21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16 7.5C15.25 6.65 14.05 6 12.5 6C10.57 6 9 7.05 9 8.65C9 10.35 10.55 11.1 12.6 11.65C14.65 12.2 16 12.9 16 14.65C16 16.35 14.45 17.5 12.25 17.5C10.45 17.5 8.95 16.75 8 15.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="why-item-content">
              <h3>Affordable</h3>
              <p>
                Skip the upfront cost of buying a printer outright. One
                predictable monthly rate covers your unit, ink, and support
                — so you can budget with confidence and scale up as you grow.
              </p>
            </div>

            <span className="why-item-accent"></span>
          </article>

          {/* 04 — GUARANTEED */}
          <article className="why-item">
            <div className="why-item-top">
              <span className="why-item-number">04</span>

              <div className="why-item-icon icon-shield">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 3L19 6V11C19 15.5 16.15 19.3 12 21C7.85 19.3 5 15.5 5 11V6L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.8 12L11 14.2L15.5 9.7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="why-item-content">
              <h3>Guaranteed</h3>
              <p>
                Every rental includes free repairs, replacements, and refills
                for as long as you're with us. If something goes wrong,
                it's on us to fix it — not an extra bill for you.
              </p>
            </div>

            <span className="why-item-accent"></span>
          </article>

        </div>
      </div>

      {/* ─────────────────────────────────────────
          RIGHT — CMYK INK MONITOR
      ───────────────────────────────────────── */}
      <div className="ink-panel reveal">

        <div className="ink-panel-header">
          <div>
            <span className="ink-panel-eyebrow">PRINT SYSTEM</span>
            <h3>Ink levels</h3>
          </div>

          <div className="ink-status">
            <span className="ink-status-dot"></span>
            READY
          </div>
        </div>

        <div className="ink-register">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className="ink-visual">

          {/* MAGENTA */}
          <div className="ink-bar-wrap">
            <div className="ink-bar-meta">
              <span>M</span>
              <strong>85%</strong>
            </div>

            <div className="ink-bar-outer">
              <div
                className="ink-bar-inner"
                style={{
                  '--h': '85%',
                  background: '#e0338a'
                }}
              ></div>
            </div>

            <span className="ink-bar-label">MAGENTA</span>
          </div>

          {/* CYAN */}
          <div className="ink-bar-wrap">
            <div className="ink-bar-meta">
              <span>C</span>
              <strong>92%</strong>
            </div>

            <div className="ink-bar-outer">
              <div
                className="ink-bar-inner"
                style={{
                  '--h': '92%',
                  background: '#00aeef',
                  transitionDelay: '0.18s'
                }}
              ></div>
            </div>

            <span className="ink-bar-label">CYAN</span>
          </div>

          {/* YELLOW */}
          <div className="ink-bar-wrap">
            <div className="ink-bar-meta">
              <span>Y</span>
              <strong>78%</strong>
            </div>

            <div className="ink-bar-outer">
              <div
                className="ink-bar-inner"
                style={{
                  '--h': '78%',
                  background: '#f5c518',
                  transitionDelay: '0.36s'
                }}
              ></div>
            </div>

            <span className="ink-bar-label">YELLOW</span>
          </div>

          {/* BLACK */}
          <div className="ink-bar-wrap">
            <div className="ink-bar-meta">
              <span>K</span>
              <strong>95%</strong>
            </div>

            <div className="ink-bar-outer">
              <div
                className="ink-bar-inner"
                style={{
                  '--h': '95%',
                  background: '#222',
                  transitionDelay: '0.54s'
                }}
              ></div>
            </div>

            <span className="ink-bar-label">BLACK</span>
          </div>

        </div>

        <div className="ink-panel-footer">
          <span>CMYK PROCESS</span>
          <span className="ink-footer-line"></span>
          <span>FRUITBEAN</span>
        </div>

      </div>

    </section>
  );
}
