'use client';
import { useState, useEffect } from 'react';

const printers = {
  'C5790':        { rate: 4500, description: 'The Epson WorkForce Pro C5790 is a business-class color printer designed for productivity and reliability. It delivers high-quality color output and fast performance, making it suitable for shared office environments.' },
  'C5890':        { rate: 5500, description: 'The Epson WorkForce Pro C5890 is built for organizations that require professional-quality color printing and high-volume output. Its speed and durability make it an excellent solution for corporate offices and educational institutions.' },
  'L120':         { rate: 1500, description: 'The Epson L120 are compact single-function printers designed for basic printing needs. They are known for their low operating cost and reliable performance, making them ideal for home offices, small businesses, and everyday document printing.' },
  'L121':         { rate: 1500, description: 'The Epson L121 are compact single-function printers designed for basic printing needs. They are known for their low operating cost and reliable performance, making them ideal for home offices, small businesses, and everyday document printing.' },
  'L130':         { rate: 1800, description: 'The Epson L130 is a compact color printer designed for simple and affordable printing tasks. It is suitable for small offices and users who need reliable color document printing without additional multifunction features.' },
  'L360':         { rate: 1400, description: 'The Epson L360 is a reliable all-in-one printer designed for consistent office productivity. It provides fast printing, scanning, and copying functions, making it suitable for businesses with moderate printing requirements.' },
  'L565':         { rate: 2000, description: 'The Epson L565 is a multifunction printer that offers printing, scanning, copying, and faxing with wireless connectivity. It is well-suited for small businesses that need an efficient and cost-effective document management solution.' },
  'L3110':        { rate: 1500, description: 'The Epson L3110 is an all-in-one printer that can print, scan, and copy documents efficiently. It is a practical choice for small offices and businesses that require multiple functions in one device while keeping printing costs low.' },
  'L3156':        { rate: 2000, description: 'The Epson L3156 is a compact all-in-one ink tank printer that offers printing, scanning, and copying functions. It features wireless connectivity, allowing users to print directly from smartphones, tablets, and laptops. Designed for home and small office use, it delivers high-quality prints while keeping printing costs low through its refillable ink tank system.' },
  'L3210':        { rate: 1700, description: 'The Epson L3210 is a versatile all-in-one printer built for regular office and business use. It delivers high-quality prints, scanning, and copying capabilities, making it suitable for handling daily workloads and business documents.' },
  'L3250':        { rate: 2000, description: 'The Epson L3250 offers wireless connectivity, allowing users to print directly from laptops, smartphones, and tablets. Its print, scan, and copy functions make it a convenient solution for modern offices that require flexible and cable-free printing.' },
  'L5290':        { rate: 2500, description: 'The Epson L5290 is a business-oriented multifunction printer equipped with printing, scanning, copying, and faxing capabilities. With wireless and network connectivity, it is ideal for offices that need efficient document handling and sharing.' },
  'L5590':        { rate: 3000, description: 'The Epson L5590 is designed for growing businesses that require higher productivity and dependable performance. Its automatic document feeder and networking features help streamline office workflows and improve efficiency.' },
  'L6370':        { rate: 4000, description: 'The Epson L6370 is a high-performance business printer built for offices with large printing demands. It supports automatic double-sided printing and fast document processing, helping organizations save both time and paper.' },
  'L6460':        { rate: 4000, description: 'The Epson L6460 is a professional-grade printer designed for businesses that require high-speed and high-volume printing. Its advanced features and network capabilities make it suitable for busy office environments.' },
  'L6550':        { rate: 1000, description: 'The Epson L6550 is a heavy-duty business printer intended for large workgroups and enterprise operations. It offers high paper capacity, fast printing speeds, and advanced document management features for demanding workloads.' },
  'L14150':       { rate: 4500, description: 'The Epson L14150 supports printing up to A3+ size, making it an excellent choice for businesses that need larger documents and graphics. It is commonly used for engineering drawings, marketing materials, and professional presentations.' },
  'L15150':       { rate: 1200, description: 'The Epson L15150 is a powerful A3 multifunction printer designed for high-volume business printing. It combines speed, efficiency, and large-format capabilities, making it ideal for corporate and professional applications.' },
  'LX310':        { rate: 2000,  description: 'The Epson LX-310 is a durable dot matrix printer designed for continuous forms and multipart documents. It is widely used in logistics, warehouses, government offices, and businesses that require reliable receipt and invoice printing.' },
  'MFC T4500 DW': { rate: 4500, description: 'The Brother MFC-T4500DW is a multifunction A3 printer capable of printing, scanning, copying, and faxing large-format documents. It is ideal for businesses that regularly work with spreadsheets, plans, and presentation materials.' },
  'M3170':        { rate: 3000, description: 'The Epson M3170 is a monochrome ink tank printer focused on fast and cost-efficient black-and-white printing. It is ideal for offices that regularly print reports, invoices, and text-heavy documents.' },
};

const printerModels = Object.keys(printers);

// ✅ FIX: faqs now has both q and a
const faqs = [
  {
    q: 'What is the minimum rental period for a printer?',
    a: 'Our minimum printer rental period is one (1) year.',
  },
  {
    q: 'Can individuals rent a printer for personal use?',
    a: 'No. Our rental services are designed for companies, offices, schools, and other organizations with valid business or operating documents.',
  },
  {
    q: 'Are ink refills and maintenance included in the rental?',
    a: 'Yes. Ink refills, preventive maintenance, and technical support are included in our printer rental service at no additional cost throughout the rental period.',
  },
  {
    q: 'INSERT QUESTION HERE',
    a: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  {
    q: 'INSERT QUESTION HERE',
    a: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
];

export default function TabsSection() {
  const [activeTab, setActiveTab] = useState('services');
  const [openFaq, setOpenFaq] = useState(null);
  const [modal, setModal] = useState(null);

  function toggleFaq(index) {
    setOpenFaq(openFaq === index ? null : index);
  }

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [activeTab]);

  return (
    <section className="tabs-section" id="services">
      <div className="reveal">
        <p className="section-label">What We Offer</p>
        <h2 className="section-title">Everything You Need to Keep Printing</h2>
        <p className="section-subtitle">From ink refills to repairs, we&apos;ve got you covered.</p>
      </div>

      <div className="tabs-nav reveal">
        <button className={`tab-btn${activeTab === 'services' ? ' active' : ''}`} onClick={() => setActiveTab('services')}>
          <span className="tab-icon">🖨️</span> Services
        </button>
        <button className={`tab-btn${activeTab === 'brands' ? ' active' : ''}`} onClick={() => setActiveTab('brands')}>
          <span className="tab-icon">🖨️</span> Printer Models
        </button>
        <button className={`tab-btn${activeTab === 'faq' ? ' active' : ''}`} onClick={() => setActiveTab('faq')}>
          <span className="tab-icon">❓</span> FAQ
        </button>
      </div>

      <div className="tab-panels">

        {/* Services Tab */}
        <div className={`tab-panel${activeTab === 'services' ? ' active' : ''}`}>
          <div className="cards-grid">
            <div className="service-card reveal">
              <div className="card-icon icon-cyan">🖨️</div>
              <h3>Printer Renting</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div className="service-card reveal">
              <div className="card-icon icon-blue">🔧</div>
              <h3>Troubleshooting</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div className="service-card reveal">
              <div className="card-icon icon-magenta">🧪</div>
              <h3>Ink Refilling</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div className="service-card reveal">
              <div className="card-icon icon-green">🚀</div>
              <h3>Express Service</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          </div>
        </div>

        {/* Brands Tab */}
        <div className={`tab-panel${activeTab === 'brands' ? ' active' : ''}`}>
          <div className="brands-list">
            {printerModels.map(model => (
              <div key={model} className="brand-pill reveal" onClick={() => setModal(model)}>
                {model}
                <span>View Details</span>
              </div>
            ))}
          </div>
        </div>

              {/* FAQ Tab */}
      <div className={`tab-panel${activeTab === 'faq' ? ' active' : ''}`}>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}> {/* ✅ no 'reveal' */}
              <div className="faq-q" onClick={() => toggleFaq(i)}>
                {faq.q}
                <span className="faq-arrow">&#8964;</span>
              </div>
              <div className="faq-a">{faq.a}</div>
            </div>
          ))}
        </div>
      </div>

      </div>
      
      {modal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content">
            <span className="close-btn" onClick={() => setModal(null)}>&times;</span>
            <img src={`/images/${modal}.jpg`} alt={modal} />
            <h2>{modal}</h2>
            <div className="printer-rate">₱{printers[modal]?.rate}/month</div>
            <p>{printers[modal]?.description}</p>
          </div>
        </div>
      )}
    </section>
  );
}