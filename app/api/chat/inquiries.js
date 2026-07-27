import { getPool } from '@/lib/db';
import { ALL_PRINTERS } from './printers';

const VALID_USAGE_LEVELS = ['Light', 'Moderate', 'Heavy', 'Very Heavy'];

export async function saveInquiry({
  companyName,
  companyAddress,
  contactNumber,
  email,
  purposes,
  usageLevel,
  printerCount,
  rentalYears,
  selectedPrinters,
}) {
  // ── Validate (mirrors your old form's validate() function) ──
  if (!companyName?.trim()) {
    return { success: false, message: 'Company name is missing.' };
  }
  if (!companyAddress?.trim()) {
    return { success: false, message: 'Company address is missing.' };
  }
  if (!contactNumber?.trim()) {
    return { success: false, message: 'Contact number is missing.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
    return { success: false, message: 'That email address looks invalid.' };
  }
  if (!purposes || purposes.length === 0) {
    return { success: false, message: 'At least one printing purpose is required.' };
  }
  if (!VALID_USAGE_LEVELS.includes(usageLevel)) {
    return { success: false, message: 'Usage level must be Light, Moderate, Heavy, or Very Heavy.' };
  }
  if (!printerCount || printerCount < 1) {
    return { success: false, message: 'Printer count must be at least 1.' };
  }
  if (!rentalYears || rentalYears < 1) {
    return { success: false, message: 'Rental period must be at least 1 year.' };
  }
  if (!selectedPrinters || selectedPrinters.length === 0) {
    return { success: false, message: 'At least one printer must be selected.' };
  }

  // ── Recompute pricing from real data — never trust the model's math ──
  const enrichedPrinters = [];
  let totalQuantity = 0;

  for (const sp of selectedPrinters) {
    const printer = ALL_PRINTERS.find(p => p.model === sp.model);
    if (!printer) {
      return { success: false, message: `"${sp.model}" isn't a printer we offer.` };
    }
    const quantity = Number(sp.quantity) || 0;
    if (quantity < 1) {
      return { success: false, message: `Quantity for ${sp.model} must be at least 1.` };
    }
    totalQuantity += quantity;
    enrichedPrinters.push({
      model: printer.model,
      quantity,
      rate: printer.rate,
      subtotal: printer.rate * quantity,
    });
  }

  if (totalQuantity > printerCount) {
    return {
      success: false,
      message: `Selected ${totalQuantity} units, but the client only asked for ${printerCount}.`,
    };
  }

  const totalMonthly = enrichedPrinters.reduce((sum, p) => sum + p.subtotal, 0);
  const totalYearly = totalMonthly * 12;
  const totalContract = totalYearly * rentalYears;

  // ── Save to Postgres ──
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `INSERT INTO inquiries
        (company_name, company_address, contact_number, email, purposes, usage_level,
         printer_count, rental_years, selected_printers,
         total_monthly, total_yearly, total_contract)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING inquiry_id`,
      [
        companyName.trim(),
        companyAddress.trim(),
        contactNumber.trim(),
        email.trim(),
        purposes,
        usageLevel,
        printerCount,
        rentalYears,
        JSON.stringify(enrichedPrinters),
        totalMonthly,
        totalYearly,
        totalContract,
      ]
    );

    return {
      success: true,
      inquiryId: rows[0].inquiry_id,
      printers: enrichedPrinters,
      totalMonthly,
      totalYearly,
      totalContract,
    };
  } catch (err) {
    console.error('saveInquiry DB error:', err);
    return { success: false, message: 'Something went wrong saving this — please try again.' };
  }
}
