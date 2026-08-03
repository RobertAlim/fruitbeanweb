import { saveInquiry } from '../../chat/inquiries';
import { createClientAccount, addRentalsToExistingClient } from '../../chat/accounts';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      clientId,
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

    // Existing signed-in client asking for another printer — the AI already
    // knows who they are, so just attach the rental to their account.
    // Skip the new-account fields (company/contact/email) that only matter
    // for brand-new signups, and skip the duplicate-account check entirely
    // since we already know exactly which account this is.
    if (clientId) {
      if (!usageLevel || !printerCount || !rentalYears || !printers?.length) {
        return Response.json(
          { success: false, message: 'Missing required fields.' },
          { status: 400 }
        );
      }

      const result = await addRentalsToExistingClient({ clientId, printers, rentalYears });

      if (!result.success) {
        return Response.json({
          success: true,
          accountCreated: false,
          existingAccount: true,
          message: result.message || 'Could not add that rental to your account.',
        });
      }

      return Response.json({
        success: true,
        accountCreated: false,
        existingAccount: true,
        duplicate: Boolean(result.duplicate),
        clientId: result.clientId,
        email: result.email,
        companyName: result.companyName,
      });
    }

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
