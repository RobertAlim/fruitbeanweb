# Fruitbean Ink Refilling Station

A Next.js web app for **Fruitbean Ink Refilling Station**, a printer rental and ink-refill business in Parañaque, Philippines. It combines a public marketing site with an AI sales chat widget, a client portal for managing rentals, and an admin dashboard for staff.

## Features

* **Public site** — hero, printer catalog tabs, and value-proposition sections (`app/page.jsx` and `app/components/`).
* **AI chat widget** — an on-site assistant (Groq via the [Vercel AI SDK](https://sdk.vercel.ai)) that answers questions about the printer catalog and rental terms, and can create inquiries/client accounts and send welcome emails (`app/api/chat/`).
* **Client portal** (`app/client/`) — clients log in to view their active rentals, report problems, and track resolution status.
* **Admin dashboard** (`app/admin/`) — staff view of all clients and rentals, with search and status breakdown (active / pending / problem / ended).
* **Rental request form** (`app/forms/`) — printer recommendation quiz that matches a visitor's usage profile to a catalog model.
* **Auth** — simple email/password login backed by Postgres + bcrypt (`app/api/auth/login/`).
* **Contract tracking** — rentals carry contract start/end dates and status (Active / Expiring / Expired); a Vercel cron job (`vercel.json`) is configured to hit `/api/cron/check-contracts` daily to keep this up to date (that route isn't included in this checkout — add it before relying on the cron).

## Tech stack

|Layer|Technology|
|-|-|
|Framework|Next.js 16 (App Router), React 19|
|Styling|Tailwind CSS 4 + plain CSS per page|
|Database|PostgreSQL (via `pg`)|
|AI / chat|Vercel AI SDK (`ai`) with Groq and Google model providers|
|Auth|bcryptjs, session data kept in `sessionStorage`|
|Email|Nodemailer over SMTP|
|Deployment|Vercel (see `vercel.json` for the cron config)|

## Project structure

```
app/
├── page.jsx              # Public homepage
├── layout.jsx             # Root layout, loads global chat widget
├── components/            # Nav, Hero, Tabs, Why, Footer, ChatWidget
├── login/                  # Login page
├── client/                 # Client portal (view rentals, report problems)
├── admin/                  # Admin dashboard (clients + rentals overview)
├── forms/                  # Printer recommendation / rental request form
└── api/
    ├── auth/login/         # POST — email/password auth
    ├── admin/clients/      # GET — clients + rentals for the admin dashboard
    ├── rentals/            # GET/PATCH — client rentals, status updates
    └── chat/               # AI chat: route, tool implementations
        ├── route.js         # streamText endpoint + tool wiring
        ├── printers.js       # printer recommendation tool
        ├── inquiries.js      # save visitor inquiries
        ├── accounts.js       # create client accounts from chat
        └── emails.js         # welcome email sender

lib/db.js                  # Shared pg Pool helper
migrations/                # SQL migrations (problem ticketing, contract fields)
public/                    # Logo, printer photos, uploaded images
n8n/                        # (reserved for n8n workflow exports)
```

## Getting started

### Prerequisites

* Node.js 20+
* A PostgreSQL database
* API keys for Groq (chat) and SMTP credentials (email), if you want those features working

### Setup

1. Install dependencies:

```bash
   npm install
   ```

2. Configure environment variables in `.env.local`:

```bash
   DATABASE\_URL=postgresql://user:password@host:5432/your\_db
   GROQ\_API\_KEY=your\_groq\_api\_key

   SMTP\_HOST=smtp.gmail.com
   SMTP\_PORT=465
   SMTP\_SECURE=true
   SMTP\_USER=your\_smtp\_user
   SMTP\_PASS=your\_smtp\_app\_password
   SMTP\_FROM="Fruitbean Ink Refilling Station <you@example.com>"
   ```

> ⚠️ The `.env.local` in this checkout contains live-looking database, Groq, and Gmail SMTP credentials. Rotate/revoke those and keep real secrets out of version control — `.env.local` should never be committed or shared.

3. Set up the database schema, then apply the migrations in `migrations/` (they use `ADD COLUMN IF NOT EXISTS`, so they're safe to run against an existing `rentals` table):

```bash
   psql "$DATABASE\_URL" -f migrations/002\_problem\_ticketing.sql
   psql "$DATABASE\_URL" -f migrations/add\_contract\_fields\_to\_rentals.sql
   ```

4. Run the dev server:

```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Other scripts

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```

## Notes

* Client/admin session state is stored in `sessionStorage` (`client\_id`, `account\_type`, `account\_name`) rather than a server-side session — treat this as a starting point, not a hardened auth setup.
* The rental `status` column enforces specific casing (`Active`, `Pending`, `Problem`, `Ended`) at the database level; see the `STATUS\_MAP` in `app/api/rentals/route.js` if you're extending it.
* The `public/uploads/` folder holds user-uploaded images; `public/images/` holds the static printer catalog photos used across the site and chat.





\# FruitBean Setup Guide



This guide covers the setup for:



\- Next.js

\- PostgreSQL

\- Neon Database

\- Drizzle ORM

\- Drizzle Studio

\- SMTP Email (Nodemailer)



\---



\# 1. Install Dependencies



\## PostgreSQL Driver



```bash

npm install pg

```



\## Drizzle ORM



```bash

npm install drizzle-orm

npm install -D drizzle-kit

npm install dotenv

```



\## Email (SMTP)



```bash

npm install nodemailer

```



\---



\# 2. Configure Environment Variables



Create a `.env.local` file in the project root.



\## Local PostgreSQL



```env

DATABASE\_URL=postgresql://postgres:WEBSITE123@localhost:5432/Fruitbean\_DB

```



\## Neon PostgreSQL



```env

DATABASE\_URL=postgresql://fiix\_db\_owner:YOUR\_PASSWORD@ep-orange-mud-a19sqnwo-pooler.ap-southeast-1.aws.neon.tech/n8n-ramara?sslmode=require\&channel\_binding=require

```



\## SMTP



```env

SMTP\_HOST=smtp.gmail.com

SMTP\_PORT=587

SMTP\_USER=your@email.com

SMTP\_PASS=your\_app\_password

SMTP\_FROM=FruitBean <your@email.com>

```



\---



\# 3. Create `drizzle.config.ts`



Create this file in the project root.



```ts

import { defineConfig } from "drizzle-kit";

import dotenv from "dotenv";



dotenv.config({ path: ".env.local" });



export default defineConfig({

&#x20; schema: "./db/schema.ts",

&#x20; out: "./drizzle",

&#x20; dialect: "postgresql",

&#x20; dbCredentials: {

&#x20;   url: process.env.DATABASE\_URL!,

&#x20; },

});

```



\---



\# 4. Create the Database Schema



Create:



```

db/

└── schema.ts

```



Example:



```ts

import { pgTable, serial, text } from "drizzle-orm/pg-core";



export const users = pgTable("users", {

&#x20; id: serial("id").primaryKey(),

&#x20; name: text("name"),

});

```



If you already have an existing PostgreSQL database, generate the schema instead:



```bash

npx drizzle-kit introspect

```



\---



\# 5. Update `package.json`



Add the following scripts:



```json

"scripts": {

&#x20; "dev": "next dev",

&#x20; "build": "next build",

&#x20; "start": "next start",

&#x20; "lint": "eslint",

&#x20; "db:studio": "drizzle-kit studio",

&#x20; "db:generate": "drizzle-kit generate",

&#x20; "db:push": "drizzle-kit push",

&#x20; "db:introspect": "drizzle-kit introspect"

}

```



\---



\# 6. Open Drizzle Studio



```bash

npm run db:studio

```



This opens a browser-based interface for your PostgreSQL database.



\---



\# 7. Import Local PostgreSQL Database into Neon



\### Export Local Database



```bash

pg\_dump -U postgres -d Fruitbean\_DB > fruitbean.sql

```



\### Import into Neon



```bash

psql "postgresql://fiix\_db\_owner:YOUR\_PASSWORD@ep-orange-mud-a19sqnwo-pooler.ap-southeast-1.aws.neon.tech/n8n-ramara?sslmode=require\&channel\_binding=require" < fruitbean.sql

```



This imports:



\- Tables

\- Data

\- Primary Keys

\- Foreign Keys

\- Indexes

\- Constraints

\- Sequences



\---



\# 8. SMTP (Nodemailer)



Example configuration:



```ts

import nodemailer from "nodemailer";



const transporter = nodemailer.createTransport({

&#x20; host: process.env.SMTP\_HOST,

&#x20; port: Number(process.env.SMTP\_PORT),

&#x20; secure: false,

&#x20; auth: {

&#x20;   user: process.env.SMTP\_USER,

&#x20;   pass: process.env.SMTP\_PASS,

&#x20; },

});



await transporter.sendMail({

&#x20; from: process.env.SMTP\_FROM,

&#x20; to: "customer@example.com",

&#x20; subject: "Test Email",

&#x20; text: "Hello from FruitBean!",

});

```



\---



\# Useful Commands



\### Start Development Server



```bash

npm run dev

```



\### Open Drizzle Studio



```bash

npm run db:studio

```



\### Generate Migrations



```bash

npm run db:generate

```



\### Push Schema to Database



```bash

npm run db:push

```



\### Introspect Existing Database



```bash

npm run db:introspect

```



\### Export Local PostgreSQL Database



```bash

pg\_dump -U postgres -d Fruitbean\_DB > fruitbean.sql

```



\### Import SQL Backup into Neon



```bash

psql "postgresql://USERNAME:PASSWORD@HOST/DATABASE?sslmode=require" < fruitbean.sql

```



\---



\# Project Structure



```text

fruitbean/

├── app/

├── db/

│   └── schema.ts

├── drizzle/

├── drizzle.config.ts

├── package.json

├── .env.local

├── tsconfig.json

└── README.md

```



\---



\# Installed Packages



| Package | Purpose |

|----------|---------|

| next | React Framework |

| react | UI Library |

| pg | PostgreSQL Driver |

| drizzle-orm | ORM for PostgreSQL |

| drizzle-kit | CLI, migrations, and Drizzle Studio |

| dotenv | Loads environment variables |

| nodemailer | SMTP Email Sending |

| zod | Validation |

| bcryptjs | Password Hashing |



\---



\## Notes



\- Keep `.env.local` out of version control.

\- Never commit passwords or API keys.

\- Use the local PostgreSQL database during development if preferred.

\- Use the Neon database for cloud deployment and shared development.

\- Drizzle Studio provides a graphical interface for managing your PostgreSQL database.

