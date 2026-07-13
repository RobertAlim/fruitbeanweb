'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import './forms.css';

const PURPOSE_OPTIONS = [
  'Document Printing',
  'Photo Printing',
  'School / Academic Use',
  'Office / Business Use',
  'Government / Institution',
  'Others',
];

const REAM_OPTIONS = [
  '1–2 reams/month (Light)',
  '3–5 reams/month (Moderate)',
  '6–10 reams/month (Heavy)',
  '10+ reams/month (Very Heavy)',
];

const ALL_PRINTERS = [
  { model: 'Epson L120',          rate: 1500, type: 'mono',         tags: ['Basic'],                bestFor: 'Home / small office, everyday docs',        recommend: ['Light', 'Moderate'] },
  { model: 'Epson L121',          rate: 1500, type: 'mono',         tags: ['Basic'],                bestFor: 'Home / small office, everyday docs',        recommend: ['Light', 'Moderate'] },
  { model: 'Epson L130',          rate: 1800, type: 'color',        tags: ['Color'],                bestFor: 'Simple color document printing',            recommend: ['Light', 'Moderate'] },
  { model: 'Epson L360',          rate: 1400, type: 'all-in-one',   tags: ['All-in-One'],           bestFor: 'Print, scan & copy for moderate use',      recommend: ['Light', 'Moderate'] },
  { model: 'Epson LX-310',        rate: 350,  type: 'dot-matrix',   tags: ['Dot Matrix'],           bestFor: 'Receipts, invoices, multi-part forms',      recommend: ['Light', 'Moderate', 'Heavy', 'Very Heavy'] },
  { model: 'Epson L3110',         rate: 1500, type: 'all-in-one',   tags: ['All-in-One'],           bestFor: 'Print, scan & copy on a budget',           recommend: ['Light', 'Moderate'] },
  { model: 'Epson L3156',         rate: 2000, type: 'wireless',     tags: ['Wireless'],             bestFor: 'Mobile/wireless printing, home office',     recommend: ['Light', 'Moderate'] },
  { model: 'Epson L3210',         rate: 1700, type: 'all-in-one',   tags: ['All-in-One'],           bestFor: 'Daily office workloads, documents',         recommend: ['Light', 'Moderate', 'Heavy'] },
  { model: 'Epson L3250',         rate: 2000, type: 'wireless',     tags: ['Wireless'],             bestFor: 'Wireless print/scan/copy, flexible setup',  recommend: ['Light', 'Moderate', 'Heavy'] },
  { model: 'Epson L565',          rate: 2000, type: 'multifunction',tags: ['Fax', 'Wireless'],      bestFor: 'Print, scan, copy & fax for small biz',    recommend: ['Moderate', 'Heavy'] },
  { model: 'Epson L5290',         rate: 2500, type: 'business',     tags: ['Business', 'Fax'],      bestFor: 'Office with wireless, fax & networking',    recommend: ['Moderate', 'Heavy'] },
  { model: 'Epson L5590',         rate: 3000, type: 'business',     tags: ['Business', 'ADF'],      bestFor: 'Growing businesses, ADF, networking',       recommend: ['Moderate', 'Heavy', 'Very Heavy'] },
  { model: 'Epson M3170',         rate: 3000, type: 'mono',         tags: ['Mono', 'Fast'],         bestFor: 'High-speed black-and-white only printing',  recommend: ['Heavy', 'Very Heavy'] },
  { model: 'Epson L6370',         rate: 4000, type: 'high-volume',  tags: ['Duplex', 'Fast'],       bestFor: 'Large offices, auto duplex, high output',   recommend: ['Heavy', 'Very Heavy'] },
  { model: 'Epson L6460',         rate: 4000, type: 'high-volume',  tags: ['Fast', 'Network'],      bestFor: 'Busy offices, high-speed/volume printing',  recommend: ['Heavy', 'Very Heavy'] },
  { model: 'Epson C5790',         rate: 4500, type: 'color-business',tags: ['Color', 'Business'],   bestFor: 'Professional color output, shared offices', recommend: ['Heavy', 'Very Heavy'] },
  { model: 'Epson L14150',        rate: 4500, type: 'a3',           tags: ['A3', 'Large Format'],   bestFor: 'A3+ prints: plans, drawings, marketing',    recommend: ['Moderate', 'Heavy', 'Very Heavy'] },
  { model: 'Epson C5890',         rate: 5500, type: 'color-business',tags: ['Color', 'High Volume'],bestFor: 'Corporate/edu, high-vol color output',      recommend: ['Very Heavy'] },
  { model: 'Epson L6550',         rate: 1000, type: 'enterprise',   tags: ['Enterprise'],           bestFor: 'Large workgroups, high-capacity enterprise',recommend: ['Very Heavy'] },
  { model: 'Epson L15150',        rate: 1200, type: 'a3',           tags: ['A3', 'Multifunction'],  bestFor: 'High-vol A3 MFP, corporate/professional',  recommend: ['Heavy', 'Very Heavy'] },
  { model: 'Brother MFC T4500 DW',rate: 4500, type: 'a3',           tags: ['A3', 'Fax'],            bestFor: 'A3 print/scan/copy/fax, large-format docs', recommend: ['Heavy', 'Very Heavy'] },
];

const TAG_COLORS = {
  'Basic':        'tag-allpurpose',
  'All-in-One':   'tag-best',
  'Wireless':     'tag-wireless',
  'Color':        'tag-wireless',
  'Business':     'tag-best',
  'Fax':          'tag-dotmatrix',
  'ADF':          'tag-allpurpose',
  'Fast':         'tag-best',
  'Duplex':       'tag-heavy',
  'Network':      'tag-heavy',
  'Dot Matrix':   'tag-dotmatrix',
  'Mono':         'tag-mono',
  'A3':           'tag-a3',
  'Large Format': 'tag-a3',
  'Enterprise':   'tag-mono',
  'Multifunction':'tag-allpurpose',
  'High Volume':  'tag-heavy',
};

const RANK_COLORS = ['#e0338a', '#00aeef', '#3ab549', '#f5c518', '#9b59b6'];

function getUsageKey(reams) {
  if (!reams) return null;
  if (reams.includes('Light'))    return 'Light';
  if (reams.includes('Moderate')) return 'Moderate';
  if (reams.includes('Very'))     return 'Very Heavy';
  return 'Heavy';
}

function getRecommended(reams) {
  const key = getUsageKey(reams);
  if (!key) return [];
  return ALL_PRINTERS.filter(p => p.recommend.includes(key));
}

export default function RentalForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    company: '',
    contact: '',
    email: '',
    purposes: [],
    reams: '',
    printerCount: '',
    rentalYears: '',
    confirmDetails: false,
    images: [],
  });
  const [errors, setErrors]         = useState({});
  const [printerSelections, setPrinterSelections] = useState({});
  const [selectionError, setSelectionError] = useState('');
  const fileRef = useRef(null);

  // ── helpers ──────────────────────────────────────────────────
  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(err => ({ ...err, [e.target.name]: '' }));
  }

  function togglePurpose(p) {
    setForm(f => ({
      ...f,
      purposes: f.purposes.includes(p)
        ? f.purposes.filter(x => x !== p)
        : [...f.purposes, p],
    }));
    setErrors(err => ({ ...err, purposes: '' }));
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files);
    setForm(f => ({ ...f, images: [...f.images, ...files] }));
  }

  function removeImage(i) {
    setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  }

  function toggleConfirm() {
    setForm(f => ({ ...f, confirmDetails: !f.confirmDetails }));
    setErrors(err => ({ ...err, confirmDetails: '' }));
  }

  function validate() {
    const e = {};
    if (!form.company.trim()) e.company = 'Company name is required.';
    if (!form.contact.trim()) e.contact = 'Contact number is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    if (form.purposes.length === 0) e.purposes = 'Select at least one purpose.';
    if (!form.reams) e.reams = 'Please select printer usage volume.';
    if (!form.printerCount || isNaN(form.printerCount) || +form.printerCount < 1)
      e.printerCount = 'Enter a valid number of printers.';
    if (!form.rentalYears || isNaN(form.rentalYears) || +form.rentalYears < 1)
      e.rentalYears = 'Enter a valid rental period (minimum 1 year).';
    if (!form.confirmDetails) e.confirmDetails = 'Please confirm that the details above are correct.';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setPrinterSelections({});
    setSelectionError('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleApprove() {
    const totalSelected = Object.values(printerSelections).reduce((a, b) => a + b, 0);
    if (totalSelected === 0) {
      setSelectionError('Please select at least one printer before approving.');
      return;
    }
    setSelectionError('');
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── printer selection helpers ─────────────────────────────────
  const printerLimit = parseInt(form.printerCount, 10) || 0;
  const rentalYears   = parseInt(form.rentalYears, 10) || 0;

  function togglePrinterSelect(model) {
    setPrinterSelections(prev => {
      if (prev[model] !== undefined) {
        const next = { ...prev };
        delete next[model];
        return next;
      }
      const currentTotal = Object.values(prev).reduce((a, b) => a + b, 0);
      if (currentTotal >= printerLimit) return prev;
      return { ...prev, [model]: 1 };
    });
    setSelectionError('');
  }

  function changeQty(model, delta) {
    setPrinterSelections(prev => {
      const current = prev[model] ?? 1;
      const next = current + delta;
      if (next < 1) {
        const updated = { ...prev };
        delete updated[model];
        return updated;
      }
      const otherTotal = Object.entries(prev)
        .filter(([m]) => m !== model)
        .reduce((a, [, v]) => a + v, 0);
      if (otherTotal + next > printerLimit) return prev;
      return { ...prev, [model]: next };
    });
  }

  function setQtyDirect(model, val) {
    const num = parseInt(val, 10);
    if (!val || isNaN(num) || num < 1) {
      setPrinterSelections(prev => {
        const updated = { ...prev };
        delete updated[model];
        return updated;
      });
    } else {
      setPrinterSelections(prev => {
        const otherTotal = Object.entries(prev)
          .filter(([m]) => m !== model)
          .reduce((a, [, v]) => a + v, 0);
        const capped = Math.min(num, printerLimit - otherTotal);
        if (capped < 1) {
          const updated = { ...prev };
          delete updated[model];
          return updated;
        }
        return { ...prev, [model]: capped };
      });
    }
  }

  // ── derived data ──────────────────────────────────────────────
  const recommended      = getRecommended(form.reams);
  const totalSelectedQty = Object.values(printerSelections).reduce((a, b) => a + b, 0);
  const remainingSlots   = printerLimit - totalSelectedQty;
  const totalMonthlyCost = Object.entries(printerSelections).reduce((sum, [model, qty]) => {
    const printer = ALL_PRINTERS.find(p => p.model === model);
    return sum + (printer ? printer.rate * qty : 0);
  }, 0);
  const totalYearlyCost   = totalMonthlyCost * 12;
  const totalContractCost = totalYearlyCost * (rentalYears || 1);

  // ── step indicator ────────────────────────────────────────────
  const StepBar = () => (
    <div className="rf-steps">
      {['Inquiry', 'Quotation', 'Conforme'].map((label, i) => (
        <div key={i} className={`rf-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`}>
          <div className="rf-step-circle">{step > i + 1 ? '✓' : i + 1}</div>
          <span className="rf-step-label">{label}</span>
          {i < 2 && <div className="rf-step-line" />}
        </div>
      ))}
    </div>
  );

  // ── render ────────────────────────────────────────────────────
  return (
    <div className="rf-page">

      {/* Header */}
      <div className="rf-header">
        <div className="rf-logo-row">
          <div className="rf-logo-icon">
            <Image src="/Fruitbean Logo.png" alt="Fruitbean Logo" width={50} height={50} />
          </div>
          <div className="rf-logo-text">
            <span className="rf-brand">Fruit<span>bean</span></span>
            <p className="rf-header-sub">Ink Refilling Station</p>
          </div>
        </div>
        <StepBar />
      </div>

      <div className="rf-body">

        {/* ── STEP 1: FORM ── */}
        {step === 1 && (
          <form className="rf-card" onSubmit={handleSubmit} noValidate>
            <h2 className="rf-card-title">Rental Form</h2>
            <p className="rf-card-desc">All documents and information submitted will be treated with strict confidentiality and 
              used solely for the evaluation and processing of your rental inquiry.</p>

            <div className="rf-grid-2 rf-grid-tight">
              <div className="rf-field">
                <label className="rf-label">Company / Organization Name</label>
                <input
                  className={`rf-input ${errors.company ? 'rf-input--err' : ''}`}
                  name="company" value={form.company}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corp."
                />
                {errors.company && <span className="rf-err">{errors.company}</span>}
              </div>

              <div className="rf-field">
                <label className="rf-label">Contact Number</label>
                <input
                  className={`rf-input ${errors.contact ? 'rf-input--err' : ''}`}
                  name="contact" value={form.contact}
                  onChange={handleChange}
                  placeholder="e.g. 0917-123-4567"
                />
                {errors.contact && <span className="rf-err">{errors.contact}</span>}
              </div>
            </div>

            <div className="rf-field">
              <label className="rf-label">Email Address</label>
              <input
                className={`rf-input ${errors.email ? 'rf-input--err' : ''}`}
                name="email" type="email" value={form.email}
                onChange={handleChange}
                placeholder="e.g. you@company.com"
              />
              {errors.email && <span className="rf-err">{errors.email}</span>}
            </div>

            <div className="rf-field">
              <label className="rf-label">
                Purpose of Printing{' '}
                <span className="rf-label-note">(select all that apply)</span>
              </label>
              <div className="rf-checkbox-grid">
                {PURPOSE_OPTIONS.map(p => (
                  <label
                    key={p}
                    className={`rf-purpose-row ${form.purposes.includes(p) ? 'checked' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={form.purposes.includes(p)}
                      onChange={() => togglePurpose(p)}
                      style={{ display: 'none' }}
                    />
                    <span className="rf-purpose-dot" />
                    {p}
                  </label>
                ))}
              </div>
              {errors.purposes && <span className="rf-err">{errors.purposes}</span>}
            </div>

            <div className="rf-grid-2">
              <div className="rf-field">
                <label className="rf-label">Estimated Monthly Printer Usage</label>
                <div className="rf-radio-stack">
                  {REAM_OPTIONS.map(r => (
                    <label
                      key={r}
                      className={`rf-radio-row ${form.reams === r ? 'checked' : ''}`}
                    >
                      <input
                        type="radio" name="reams" value={r}
                        checked={form.reams === r}
                        onChange={handleChange}
                      />
                      <span className="rf-radio-dot" />
                      {r}
                    </label>
                  ))}
                </div>
                {errors.reams && <span className="rf-err">{errors.reams}</span>}

                <div className="rf-field" style={{ marginTop: '24px' }}>
                  <label className="rf-label">Documents</label>
                  <p className="rf-hint">Upload clear images or scanned copies of supporting documents required for verification, 
                    such as your BIR, Business Permit, DTI/SEC Registration, 
                    Proof of Business Operations that establish the legitimacy and operational status of your company or organization.</p>
                  <button type="button" className="rf-upload-btn" onClick={() => fileRef.current.click()}>
                    + Attach Images
                  </button>
                  <input
                    ref={fileRef} type="file" accept="image/*" multiple
                    style={{ display: 'none' }} onChange={handleFiles}
                  />
                  {form.images.length > 0 && (
                    <div className="rf-image-previews">
                      {form.images.map((img, i) => (
                        <div key={i} className="rf-preview-thumb">
                          <img src={URL.createObjectURL(img)} alt={img.name} />
                          <button type="button" className="rf-thumb-remove" onClick={() => removeImage(i)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rf-field">
                <label className="rf-label">Number of Printers Needed</label>
                <input
                  className={`rf-input ${errors.printerCount ? 'rf-input--err' : ''}`}
                  name="printerCount"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.printerCount}
                  onChange={handleChange}
                  placeholder="e.g. 3"
                />
                {errors.printerCount && <span className="rf-err">{errors.printerCount}</span>}

                <div className="rf-field" style={{ marginTop: '24px' }}>
                  <label className="rf-label">Rental Period (Years)</label>
                  <input
                    className={`rf-input ${errors.rentalYears ? 'rf-input--err' : ''}`}
                    name="rentalYears"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.rentalYears}
                    onChange={handleChange}
                    placeholder="e.g. 1"
                  />
                  <p className="rf-hint" style={{ marginTop: '4px', marginBottom: 0 }}>Minimum of 1 year</p>
                  {errors.rentalYears && <span className="rf-err">{errors.rentalYears}</span>}
                </div>

                <div className="rf-field" style={{ marginTop: '24px' }}>
                  <label className="rf-label">Confirmation</label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#999',
                      lineHeight: '1.5',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.confirmDetails}
                      onChange={toggleConfirm}
                      style={{ marginTop: '2px', width: '14px', height: '14px', accentColor: '#00aeef', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span>
                      I hereby certify that all information provided in this form is true, complete, and accurate to the best of my knowledge. 
                      I understand that the submitted details will be used for the evaluation and processing of this printer rental inquiry.
                    </span>
                  </label>
                  {errors.confirmDetails && <span className="rf-err">{errors.confirmDetails}</span>}
                </div>
              </div>
            </div>

            <div className="rf-form-footer">
              <button type="submit" className="rf-btn-primary">Submit Inquiry →</button>
            </div>
          </form>
        )}

        {/* ── STEP 2: QUOTATION ── */}
        {step === 2 && (
          <div className="rf-card">
            <div className="rf-quotation-badge">Quotation</div>
            <h2 className="rf-card-title">Printer Rental Proposal</h2>

            <div className="rf-prose-block">
              <p>Dear <strong>{form.company}</strong>,</p>
              <p>
                Thank you for your interest in renting a printer from{' '}
                <strong>Fruitbean Ink Refilling Station</strong>. Based on your usage of{' '}
                <strong>{form.reams}</strong> and purpose of{' '}
                <strong>{form.purposes.join(', ')}</strong>, we recommend the printers
                below. All packages include{' '}
                <span className="rf-highlight-cyan">free ink refills</span>,{' '}
                <span className="rf-highlight-green">weekly maintenance</span>, and{' '}
                <span className="rf-highlight-magenta">technical support</span> at no extra cost.
              </p>
            </div>

            <div className="rf-summary-row">
              <div className="rf-summary-item">
                <span className="rf-summary-label">Units Requested</span>
                <span className="rf-summary-val">{form.printerCount}</span>
              </div>
              <div className="rf-summary-item">
                <span className="rf-summary-label">Rental Period</span>
                <span className="rf-summary-val">
                  {form.rentalYears} Year{form.rentalYears > 1 ? 's' : ''}
                </span>
              </div>
              <div className="rf-summary-item">
                <span className="rf-summary-label">Ink Refills</span>
                <span className="rf-summary-val" style={{ color: '#3ab549' }}>FREE</span>
              </div>
              <div className="rf-summary-item">
                <span className="rf-summary-label">Maintenance</span>
                <span className="rf-summary-val" style={{ color: '#3ab549' }}>FREE</span>
              </div>
            </div>
            <p className="rf-hint" style={{ marginTop: '-12px', marginBottom: '20px' }}>Minimum of 1 year</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h3 className="rf-section-label" style={{ marginBottom: 0 }}>
                Recommended Printers
                <span className="rf-count-badge" style={{ marginLeft: '8px' }}>{recommended.length} MODELS </span>
              </h3>
              <span className={`rf-slots-pill ${remainingSlots === 0 ? 'full' : ''}`}>
                {remainingSlots === 0
                  ? '✓ All slots filled'
                  : `${remainingSlots} SLOT${remainingSlots > 1 ? 'S' : ''} REMAINING`}
              </span>
            </div>
            <p className="rf-hint" style={{ marginBottom: '16px' }}>
              Click a printer to select it.
              You can select up to <strong>{printerLimit}</strong> unit{printerLimit > 1 ? 's' : ''} total.
            </p>

            <div className="rf-printer-cards">
              {recommended.map((p, recIdx) => {
                const isSelected  = printerSelections[p.model] !== undefined;
                const qty         = printerSelections[p.model] ?? 0;
                const isLocked    = !isSelected && remainingSlots === 0;
                return (
                  <div
                    key={p.model}
                    className={`rf-printer-card ${isSelected ? 'recommended' : ''} ${isLocked ? 'locked' : ''}`}
                    style={{ cursor: isLocked ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}
                    onClick={() => !isLocked && togglePrinterSelect(p.model)}
                  >
                    <div
                      className="rf-printer-rank"
                      style={{
                        background: isSelected ? RANK_COLORS[recIdx % RANK_COLORS.length] : isLocked ? '#eee' : undefined,
                        color: isSelected ? '#fff' : isLocked ? '#ccc' : undefined,
                      }}
                    >
                      {isSelected ? '✓' : `#${recIdx + 1}`}
                    </div>

                    <div className="rf-printer-info">
                      {isSelected && <div className="rf-rec-badge">Selected</div>}
                      {isLocked  && <div className="rf-locked-badge">Limit reached</div>}
                      <h4 style={{ color: isLocked ? '#bbb' : undefined }}>{p.model}</h4>
                      <p>{p.bestFor}</p>
                      <div>
                        {p.tags.map(t => (
                          <span key={t} className={`rf-printer-tag ${TAG_COLORS[t] || 'tag-mono'}`}>{t}</span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <div className="rf-printer-rate" style={{ color: isLocked ? '#ccc' : undefined }}>
                        ₱{p.rate.toLocaleString()}<small>/mo</small>
                      </div>

                      {isSelected && (
                        <div
                          className="rf-qty-stepper"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="rf-qty-btn"
                            onClick={() => changeQty(p.model, -1)}
                          >−</button>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="rf-qty-input"
                            value={qty}
                            onChange={e => setQtyDirect(p.model, e.target.value)}
                          />
                          <button
                            type="button"
                            className="rf-qty-btn"
                            onClick={() => changeQty(p.model, 1)}
                            disabled={remainingSlots === 0}
                            style={{ opacity: remainingSlots === 0 ? 0.35 : 1 }}
                          >+</button>
                        </div>
                      )}

                      {isSelected && (
                        <div style={{ fontSize: '12px', color: '#00aeef', fontWeight: 500, textAlign: 'right' }}>
                          ₱{(p.rate * qty).toLocaleString()}/mo
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalSelectedQty > 0 && (
              <div className="rf-selection-summary">
                <div>
                  <span className="rf-summary-label">Selected</span>
                  <span className="rf-summary-val">{totalSelectedQty} / {printerLimit} units</span>
                </div>
                <div>
                  <span className="rf-summary-label">Est. Monthly Total</span>
                  <span className="rf-summary-val" style={{ color: '#00aeef' }}>
                    ₱{totalMonthlyCost.toLocaleString()}/mo
                  </span>
                </div>
                <div>
                  <span className="rf-summary-label">Est. Yearly Total</span>
                  <span className="rf-summary-val" style={{ color: '#f5c518' }}>
                    ₱{totalYearlyCost.toLocaleString()}/yr
                  </span>
                </div>
                <div>
                  <span className="rf-summary-label">
                    Total Contract Value ({form.rentalYears} yr{form.rentalYears > 1 ? 's' : ''})
                  </span>
                  <span className="rf-summary-val" style={{ color: '#e0338a' }}>
                    ₱{totalContractCost.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="rf-summary-label">Models Chosen</span>
                  <span className="rf-summary-val">{Object.keys(printerSelections).length}</span>
                </div>
              </div>
            )}

            {selectionError && (
              <div style={{ marginTop: '12px' }}>
                <span className="rf-err">{selectionError}</span>
              </div>
            )}

            <div className="rf-form-footer" style={{ justifyContent: 'space-between' }}>
              <button className="rf-btn-outline" onClick={() => setStep(1)}>← Revise Inquiry</button>
              <button className="rf-btn-primary" onClick={handleApprove}>Approve Quotation →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFORME ── */}
        {step === 3 && (
          <div className="rf-card">
            <div className="rf-quotation-badge" style={{ background: '#eaf3de', color: '#3b6d11' }}>Conforme</div>
            <h2 className="rf-card-title">Terms & Agreement</h2>

            <div className="rf-prose-block">
              <p>
                This Conforme serves as the formal confirmation of <strong>{form.company}</strong>'s
                agreement to rent printer unit(s) from <strong>Fruitbean Ink Refilling Station</strong>,
                located at 6223 Tramo St. San Dionisio, Parañaque, Philippines.
              </p>
            </div>

            <h3 className="rf-section-label">Selected Printers</h3>
            <div className="rf-terms-list" style={{ marginBottom: '20px' }}>
              {Object.entries(printerSelections).map(([model, qty]) => {
                const printer = ALL_PRINTERS.find(p => p.model === model);
                return (
                  <div key={model} className="rf-term-item">
                    <div className="rf-term-num">{qty}×</div>
                    <div>
                      <h4 style={{ margin: 0 }}>{model}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#666' }}>
                        ₱{printer.rate.toLocaleString()}/mo each &nbsp;·&nbsp; Subtotal: ₱{(printer.rate * qty).toLocaleString()}/mo
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="rf-term-item" style={{ borderTop: '1px solid #eee', paddingTop: '12px', marginTop: '4px' }}>
                <div className="rf-term-num" style={{ background: '#e0338a', color: '#fff' }}>Σ</div>
                <div>
                  <h4 style={{ margin: 0 }}>Total Monthly Cost</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#e0338a' }}>
                    ₱{totalMonthlyCost.toLocaleString()}/mo
                  </p>
                </div>
              </div>
              <div className="rf-term-item" style={{ borderTop: '1px solid #eee', paddingTop: '12px', marginTop: '4px' }}>
                <div className="rf-term-num" style={{ background: '#3ab549', color: '#fff' }}>Σ</div>
                <div>
                  <h4 style={{ margin: 0 }}>
                    Total Contract Cost ({form.rentalYears} year{form.rentalYears > 1 ? 's' : ''})
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#3ab549' }}>
                    ₱{totalContractCost.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <h3 className="rf-section-label">Terms & Conditions</h3>
            <div className="rf-terms-list">
              {[
                ['Rental Period',        `The agreed rental period is ${form.rentalYears || 1} year${(+form.rentalYears || 1) > 1 ? 's' : ''} from the date of deployment. Early termination may be subject to applicable fees.`],
                ['Monthly Payment',      'Rental fees are billed monthly and must be settled on or before the due date indicated in the invoice.'],
                ['Ink Refills',          "Unlimited ink refills using Fruitbean's premium ink blend are included throughout the rental period at no extra cost."],
                ['Maintenance & Support','Weekly preventive maintenance and technical support are included. The client must provide access to the unit for servicing.'],
                ['Equipment Care',       'The rented printer unit remains the property of Fruitbean Ink Refilling Station. The client is responsible for any damage caused by misuse or negligence.'],
                ['Renewal',             'The rental agreement may be renewed upon mutual written agreement before the end of the current term.'],
              ].map(([title, desc], i) => (
                <div key={i} className="rf-term-item">
                  <div className="rf-term-num">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <h4>{title}</h4>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rf-conforme-box">
              <p>
                By proceeding, <strong>{form.company}</strong> confirms that they have read, understood,
                and agreed to all terms and conditions set forth by Fruitbean Ink Refilling Station.
                A copy of this agreement will be sent to <strong>{form.email}</strong>.
              </p>
            </div>

            <div className="rf-form-footer" style={{ justifyContent: 'space-between' }}>
              <button className="rf-btn-outline" onClick={() => setStep(2)}>← Back to Quotation</button>
              <button className="rf-btn-primary" style={{ background: '#3ab549' }}>
                ✓ Confirm & Submit
              </button>
            </div>
          </div>
        )}

      </div>

      <div className="rf-footer">
        <span>© 2025 Fruitbean Ink Refilling Station</span>
        <span>0949-885-8466 · fruitbeanink@email.com</span>
      </div>
    </div>
  );
}