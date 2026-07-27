import { saveInquiry } from '../../chat/inquiries';
import { createClientAccount } from '../../chat/accounts';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      companyName,
      companyAddress,
      contactNumber,
      email,
      purposes,
      usageLevel,
      printerCount,
      rentalYears,
      printers,
    } = body;

    if (
      !companyName || !companyAddress || !contactNumber || !email || !usageLevel ||
      !printerCount || !rentalYears || !printers?.length
    ) {
      return Response.json(
        { success: false, message: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const inquiryResult = await saveInquiry({
      companyName,
      companyAddress,
      contactNumber,
      email,
      purposes,
      usageLevel,
      printerCount,
      rentalYears,
      selectedPrinters: printers,
    });

    if (!inquiryResult.success) {
      return Response.json(inquiryResult, { status: 200 });
    }

    const accountResult = await createClientAccount({
      inquiryId: inquiryResult.inquiryId,
    });

    if (!accountResult.success) {
      return Response.json({
        success: true,
        inquirySaved: true,
        accountCreated: false,
        message:
          'Inquiry saved, but account creation failed. Our team will follow up manually.',
      });
    }

    // n8n handles sending the welcome email via SMTP
    return Response.json({
      success: true,
      inquirySaved: true,
      accountCreated: true,
      email: accountResult.email,
      companyName: accountResult.companyName,
      plainPassword: accountResult.plainPassword ?? null,
    });
  } catch (err) {
    console.error('finalize-rental error:', err);
    return Response.json(
      { success: false, message: 'Server error finalizing rental.' },
      { status: 500 }
    );
  }
}
