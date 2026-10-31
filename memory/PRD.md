# SahaCep — PRD

## Original problem
"githubda saha cep var o uygulama olacak bağımsız yapıyoruz". The approved plan: SahaCep, a Turkish, mobile-first web app for small field service businesses, sold on a monthly subscription.

## Architecture
- FastAPI + MongoDB backend (`/app/backend/server.py`), React frontend (`/app/frontend/src`)
- Sign-in: Emergent-managed Clerk (email/password + Google), Turkish localization
- Photos and logo: Emergent Object Storage, served through authenticated or public-token endpoints
- Payments: Stripe test mode through emergentintegrations (shared test key, since Turkey is not supported for a claimable sandbox). Each ₺399 payment adds 30 days of Pro.
- Multi-tenant: `companies`, `members` (owner/staff), `invites`, `customers`, `jobs`, `files`, `usage`, `payment_transactions`

## Personas
Business owner (paying customer), field staff/technician, end customer (public form only)

## Implemented (2026-06)
- Landing page, sign-in and sign-up pages, company onboarding
- Owner and staff roles. Staff join automatically when they sign in with the invited email (Pro plan only, up to 10 staff).
- Customer directory with job history and debt
- Jobs: create, edit and delete; status flow; filters; desktop table and mobile cards
- Before/after photos, work notes, materials, payment status and method, job completion
- Public service form `/servis-formu/:token`, sharing via WhatsApp, print/PDF. The company logo shows only on Pro.
- Receivables list with "mark paid" and a WhatsApp payment reminder
- Dashboard: today's jobs, monthly revenue, pending collections, jobs completed
- Free plan: 15 jobs per month, tracked by a counter that only goes up. Pro: ₺399 via Stripe checkout (test mode).

## Backlog
- P1: Turkish payment provider (iyzico/PayTR) for real payments; true recurring subscription
- P1: Calendar view, recurring maintenance reminders
- P2: Customer signature and PDF, technician location, automatic SMS/WhatsApp
- P3: Stock and pricing, quotes, reports, customer self-service request page, app store version
