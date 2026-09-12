# PetCare Reminder — Orbit Version

**Tagline:** Never Miss Their Care.

Mobile-first pet health, vaccination, grooming, medication, veterinary reminder and clinic-management system for **Pet Family Animal Clinic and Grooming Center**.

## Modes

- **Demo mode** — keeps the original browser-only sample data and the ENTER PET OWNER DEMO / ENTER CLINIC DEMO buttons.
- **Secure account mode** — uses Supabase Auth, Postgres, Storage, Row Level Security, Realtime, and Edge Functions.

The circular Pet Owner Orbit and circular Clinic Staff Orbit remain the primary navigation experience.

## Production backend

Supabase project: **PetCare Reminder**

The secure backend includes:

- email/password authentication
- persistent sessions and password reset
- pet-owner and clinic-staff access roles
- Row Level Security
- pet records
- vaccinations and certificates
- reminders
- medications
- grooming records
- appointments
- vet visits
- private document storage
- health timeline
- family sharing
- clinic staff roles
- audit logs
- contact history
- private pet photos
- read-only tokenized public vaccine card endpoint
- realtime subscriptions

## Staff roles

- CLINIC ADMIN
- VETERINARIAN
- RECEPTIONIST
- GROOMER

Groomer access is intentionally restricted from unnecessary medical information.

## Storage buckets

- `pet-documents`
- `vaccination-certificates`
- `pet-photos`

All are private. Authorized users receive short-lived signed URLs for private documents.

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
