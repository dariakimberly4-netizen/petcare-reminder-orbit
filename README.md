# PetCare Reminder — Orbit Version

**Tagline:** Never Miss Their Care.

Mobile-first pet health, vaccination, grooming, medication, veterinary reminder and clinic-management system for **Pet Family Animal Clinic and Grooming Center**.

## Modes

- **Demo mode** — keeps the original browser-only sample data and the ENTER PET OWNER DEMO / ENTER CLINIC DEMO buttons.
- **Secure account mode** — uses Supabase Auth, Postgres, Storage, Row Level Security, Realtime, scheduled reminders, and Edge Functions.

The circular Pet Owner Orbit and circular Clinic Staff Orbit remain the primary navigation experience.

## Production backend

Supabase project: **PetCare Reminder**

The secure backend includes:

- email/password authentication
- persistent sessions and password reset
- pet-owner and clinic-staff access roles
- Row Level Security
- full pet profiles and private pet photos
- vaccinations, next-due dates, lot numbers, notes, and private certificates
- configurable reminders at 30 / 14 / 7 / 3 / 1 days and same day
- automatic daily reminder processing and in-app notifications
- medication records plus Taken / Skipped / Rescheduled events
- grooming records and status workflow
- appointment booking, rescheduling, cancellation, and calendar export
- vet visits
- Version 22 billing with invoices, consultation/vaccine/grooming/medication/procedure line items, discounts, partial/full payments, Cash/GCash/Card/Bank Transfer records, printable receipts, unpaid balances, and daily revenue export
- private document upload, preview, download, and delete
- automatic health timeline
- family sharing per pet
- clinic staff roles
- audit logs
- contact history
- advanced clinic pet lookup
- clinic reminder center and secure reports
- private Storage buckets
- read-only tokenized public vaccine-card page
- live Realtime updates across signed-in devices
- explicit, non-destructive import of old local demo records

## Version 22 Billing

Billing remains a temporary workspace; the Orbit stays home. In Clinic mode, use the **BILLING** action in the Clinic Orbit toolbar or **OPEN BILLING** in the Smart Hub. Completed/ready queue cards can also create a draft invoice for a registered pet.

Clinic Admin and Receptionist can create/finalize invoices and record payments. Owners have read-only access to finalized invoices and receipts. Finalized invoice line items and discounts are locked. Posted payments must be voided before an invoice can be voided.

The app records payment methods but **does not directly process external GCash, card, or bank payments**. Printing uses the browser print dialog, which can also save the invoice as PDF.

## Staff roles

- CLINIC ADMIN
- VETERINARIAN
- RECEPTIONIST
- GROOMER

Groomer access is intentionally restricted from unnecessary medical and billing information.

## Storage buckets

- `pet-documents`
- `vaccination-certificates`
- `pet-photos`

All are private. Authorized users receive short-lived signed URLs for private documents.

## Reminder engine

A scheduled Supabase database job runs daily and updates reminder status. It creates in-app notifications only for the reminder intervals enabled on each reminder. Vaccination records with a next-due date automatically create or update a vaccination reminder. No vaccination schedule is calculated by the app; the entered next-due date remains the source of truth.

## Frontend Supabase configuration

The static GitHub Pages client uses:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` / Supabase publishable key

The publishable key is designed to be used in a browser. **Never place a Supabase service-role key in frontend JavaScript.** Service-role access is used only inside protected Supabase Edge Functions.

## Clinic logo

The approved logo is the existing root asset:

`Pet-Family-Animal-Clinic-and-Grooming-Center.png`

Do not redesign, recolor, crop, distort, or recreate it.

## GitHub Pages

Publish the repository from **main / root** in GitHub Pages settings.

## Safety

“PetCare Reminder helps organize your pet's records and reminders. For medical advice, diagnosis, vaccination schedules, and treatment decisions, consult a licensed veterinarian.”
