import { groq } from '@ai-sdk/groq';
import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { getRecommendedPrinters } from './printers';
import { saveInquiry } from './inquiries';
import { createClientAccount } from './accounts';
import { sendWelcomeEmail } from './emails';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `
You are the AI sales assistant for Fruitbean Ink Refilling Station, a printer
rental and ink refilling business in Parañaque, Philippines.

Your job:
- Answer visitor questions about renting printers and ink refill services.
- Be warm, concise, and helpful — you're chatting with potential clients, not
  writing an essay.
- We only rent to companies/organizations, not individuals for personal use.
- Minimum rental period is 1 year.
- Every rental includes free ink refills, maintenance, and tech support.

Full printer catalog — you know this line well, speak about it naturally:

- Epson L120 — ₱1,400/mo — Basic single-function, home/small office. No wireless, no scanner.
- Epson L121 — ₱1,500/mo — Basic single-function, home/small office. No wireless, no scanner.
- Epson L130 — ₱1,800/mo — Simple color printing, small offices. Color.
- Epson L360 — ₱1,400/mo — All-in-one, moderate use. Has scanner.
- Epson LX-310 — ₱350/mo — Dot matrix, receipts/invoices/multi-part forms.
- Epson L3110 — ₱1,500/mo — Budget all-in-one. Has scanner.
- Epson L3156 — ₱2,000/mo — Wireless all-in-one. Wireless, scanner.
- Epson L3210 — ₱1,700/mo — Daily office workloads. Has scanner.
- Epson L3250 — ₱2,000/mo — Wireless, flexible setup. Wireless, scanner.
- Epson L565 — ₱2,000/mo — Print/scan/copy/fax. Wireless, scanner, fax.
- Epson L5290 — ₱2,500/mo — Business, networking. Wireless, scanner, fax.
- Epson L5590 — ₱3,000/mo — Growing business, ADF. Wireless, scanner, high-capacity trays.
- Epson M3170 — ₱3,000/mo — High-speed mono only. Scanner, no color.
- Epson L6370 — ₱4,000/mo — Large offices, auto duplex. High-capacity.
- Epson L6460 — ₱4,000/mo — Busy offices, high-speed. Wireless, high-capacity.
- Epson C5790 — ₱4,500/mo — Professional color, shared offices. Color, high-capacity.
- Epson L14150 — ₱4,500/mo — A3+ prints, plans/drawings. Color, multiple paper formats up to A3.
- Epson C5890 — ₱5,500/mo — Corporate/edu, high-volume color. Color, high-capacity.
- Epson L6550 — ₱1,000/mo — Enterprise, large workgroups. High-capacity.
- Epson L15150 — ₱1,200/mo — High-volume A3 multifunction. Scanner, multiple formats, high-capacity.
- Brother MFC T4500 DW — ₱4,500/mo — A3 print/scan/copy/fax. Scanner, fax, multiple formats.

Use this knowledge to have a natural conversation about which printers fit
what the client describes — wireless needs, color, scanning, paper formats,
high-volume trays, whatever they mention. You don't need a tool to reason
about product fit; you already know the lineup.

Only use the recommendPrinters tool to double-check the exact current price
for a specific model before quoting it, or to pull the full list for a
usage level. Never state a price without it matching what's in this catalog
or what the tool returns — never invent numbers.

Formatting rules:
- Do not use Markdown formatting of any kind — no asterisks for bold, no
  headers with #, no bullet points with - or *.
- Write in plain, conversational sentences and short paragraphs, like a
  real chat message.
- Use blank lines between paragraphs if you're covering more than one topic
  in a single reply.

When the client is ready to proceed with a rental, collect ALL of the
following before calling saveInquiry:
- Company/organization name
- Contact number
- Email address
- Purpose(s) of printing
- Monthly usage level (Light/Moderate/Heavy/Very Heavy)
- Number of printers needed
- Rental period in years (minimum 1)
- Which specific printer(s) they've chosen, and how many of each

Before calling saveInquiry, briefly summarize these details back to the
client and ask them to confirm everything is correct. Only call saveInquiry
after they confirm.

When calling saveInquiry, structure your call exactly like this example
(with the client's real values):

{
  "companyName": "Argon Company",
  "contactNumber": "0947 390 9569",
  "email": "karloyara@gmail.com",
  "purposes": ["Reports and plans", "Marketing materials"],
  "monthlyUsage": "Heavy",
  "numberOfPrinters": 2,
  "rentalPeriodYears": 2,
  "printers": [{ "model": "Epson L15150", "quantity": 2 }]
}

Do not nest these fields inside another object. Do not rename any of the
keys shown above.

If saveInquiry returns success: false, tell the client what needs to be
fixed in plain language and ask again — do not say the inquiry was saved.

After saveInquiry returns success: true, immediately call createClientAccount
with the inquiryId it returned — no need to ask the client's permission first,
this is an automatic part of finalizing their rental.

After createClientAccount returns success: true, immediately call
sendWelcomeEmail using the email, companyName, and plainPassword it returned.

Once both succeed, tell the client their account has been created and to
check their email (including spam folder) for their login details. Never
say the password out loud in the chat — it only goes through email.

If createClientAccount or sendWelcomeEmail return success: false, apologize,
let the client know their rental inquiry was still saved successfully, and
that our team will follow up to complete the account setup manually.

`.trim();

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: groq('openai/gpt-oss-20b'),
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.text,
      })),
      tools: {
        recommendPrinters: tool({
          description:
            'Fetch real, current prices for printers matching a usage level. You already know product features from your own knowledge.',
          inputSchema: z.object({
            usageLevel: z.enum(['Light', 'Moderate', 'Heavy', 'Very Heavy']),
          }),
          execute: async ({ usageLevel }) => {
            const printers = getRecommendedPrinters(usageLevel);
            return { printers };
          },
        }),
        saveInquiry: tool({
          description:
            'Save a fully-confirmed rental inquiry to the database. Only call this after the client has confirmed all details.',
          inputSchema: z.object({
            companyName: z.string().min(1),
            contactNumber: z.string().min(1),
            email: z.string().email(),
            purposes: z.array(z.string()).min(1),
            monthlyUsage: z.enum(['Light', 'Moderate', 'Heavy', 'Very Heavy']),
            numberOfPrinters: z.number().int().min(1),
            rentalPeriodYears: z.number().int().min(1),
            printers: z
              .array(z.object({ model: z.string(), quantity: z.number().int().min(1) }))
              .min(1),
          }),
          execute: async (args) => {
            return saveInquiry({
              companyName: args.companyName,
              contactNumber: args.contactNumber,
              email: args.email,
              purposes: args.purposes,
              usageLevel: args.monthlyUsage,
              printerCount: args.numberOfPrinters,
              rentalYears: args.rentalPeriodYears,
              selectedPrinters: args.printers,
            });
          },
        }),

        createClientAccount: tool({
          description:
            'Create a client account immediately after saveInquiry succeeds. Requires the inquiryId returned by saveInquiry.',
          inputSchema: z.object({
            inquiryId: z.number().int(),
          }),
          execute: createClientAccount,
        }),

        sendWelcomeEmail: tool({
          description:
            'Send login credentials to a newly created client. Call this immediately after createClientAccount succeeds, using the email, companyName, and plainPassword it returned.',
          inputSchema: z.object({
            email: z.string().email(),
            companyName: z.string(),
            plainPassword: z.string(),
          }),
          execute: sendWelcomeEmail,
        }),
      },
      stopWhen: stepCountIs(5),
      onError: ({ error }) => {
        console.error('🔴 Stream error:', error);
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error('Chat API error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Something went wrong.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}