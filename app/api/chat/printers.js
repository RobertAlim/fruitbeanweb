// app/api/chat/printers.js
export const ALL_PRINTERS = [
  { model: 'Epson L120', rate: 1400, bestFor: 'Home / small office, everyday docs', recommend: ['Light', 'Moderate'] },
  { model: 'Epson L121', rate: 1500, bestFor: 'Home / small office, everyday docs', recommend: ['Light', 'Moderate'] },
  { model: 'Epson L130', rate: 1800, bestFor: 'Simple color document printing', recommend: ['Light', 'Moderate'] },
  { model: 'Epson L360', rate: 1400, bestFor: 'Print, scan & copy for moderate use', recommend: ['Light', 'Moderate'] },
  { model: 'Epson LX-310', rate: 350, bestFor: 'Receipts, invoices, multi-part forms', recommend: ['Light', 'Moderate', 'Heavy', 'Very Heavy'] },
  { model: 'Epson L3110', rate: 1500, bestFor: 'Print, scan & copy on a budget', recommend: ['Light', 'Moderate'] },
  { model: 'Epson L3156', rate: 2000, bestFor: 'Mobile/wireless printing, home office', recommend: ['Light', 'Moderate'] },
  { model: 'Epson L3210', rate: 1700, bestFor: 'Daily office workloads, documents', recommend: ['Light', 'Moderate', 'Heavy'] },
  { model: 'Epson L3250', rate: 2000, bestFor: 'Wireless print/scan/copy, flexible setup', recommend: ['Light', 'Moderate', 'Heavy'] },
  { model: 'Epson L565', rate: 2000, bestFor: 'Print, scan, copy & fax for small biz', recommend: ['Moderate', 'Heavy'] },
  { model: 'Epson L5290', rate: 2500, bestFor: 'Office with wireless, fax & networking', recommend: ['Moderate', 'Heavy'] },
  { model: 'Epson L5590', rate: 3000, bestFor: 'Growing businesses, ADF, networking', recommend: ['Moderate', 'Heavy', 'Very Heavy'] },
  { model: 'Epson M3170', rate: 3000, bestFor: 'High-speed black-and-white only printing', recommend: ['Heavy', 'Very Heavy'] },
  { model: 'Epson L6370', rate: 4000, bestFor: 'Large offices, auto duplex, high output', recommend: ['Heavy', 'Very Heavy'] },
  { model: 'Epson L6460', rate: 4000, bestFor: 'Busy offices, high-speed/volume printing', recommend: ['Heavy', 'Very Heavy'] },
  { model: 'Epson C5790', rate: 4500, bestFor: 'Professional color output, shared offices', recommend: ['Heavy', 'Very Heavy'] },
  { model: 'Epson L14150', rate: 4500, bestFor: 'A3+ prints: plans, drawings, marketing', recommend: ['Moderate', 'Heavy', 'Very Heavy'] },
  { model: 'Epson C5890', rate: 5500, bestFor: 'Corporate/edu, high-vol color output', recommend: ['Very Heavy'] },
  { model: 'Epson L6550', rate: 1000, bestFor: 'Large workgroups, high-capacity enterprise', recommend: ['Very Heavy'] },
  { model: 'Epson L15150', rate: 1200, bestFor: 'High-vol A3 MFP, corporate/professional', recommend: ['Heavy', 'Very Heavy'] },
  { model: 'Brother MFC T4500 DW', rate: 4500, bestFor: 'A3 print/scan/copy/fax, large-format docs', recommend: ['Heavy', 'Very Heavy'] },
];

export function getRecommendedPrinters(usageLevel) {
  return ALL_PRINTERS.filter(p => p.recommend.includes(usageLevel));
}