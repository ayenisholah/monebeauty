Project Overview
Stripe website payments (owner-approved, 2026-07-19): product purchases use Stripe-hosted
Checkout and webhook-authoritative payment state. The online catalog supports physical
products, balance gift cards, and single-use prepaid treatment vouchers, with free clinic
pickup or a Stripe-configured Finland shipping rate for physical goods. Payment success,
refunds, voucher issuance/redemption, fulfilment, and localized customer/staff notifications
are persisted and audited. Returning from an unpaid hosted Checkout expires that session;
the signed webhook cancels the order, while admin views expose an Awaiting payment state and
filter for open website orders. Ordinary appointment bookings remain unpaid online and are paid
at the clinic by credit card; the system never sends a Stripe invoice after an appointment.

Account portals and staff operational access (owner-approved, 2026-07-19; expanded
2026-07-19): clients may create
verified accounts without being required to sign in before booking. `/oma-tili` shows the
authenticated client's past and upcoming procedures and submits cancellation/reschedule
requests for admin approval. Guest appointments can be claimed only through a single-use
link sent to the booking email. Admin and staff use separate login surfaces. Admins create
staff credentials and the matching private calendar employee in one step, choose a non-empty
temporary password, and manage every staff account. Admins may reset passwords, revoke
sessions or access, reactivate accounts, and delete credentials while retaining calendar and
appointment history; staff must replace the temporary password on first login and receive no
confirmation email. Staff see their assigned employee calendar and clinical essentials; they may
create, edit, confirm, complete, cancel, and reschedule appointments assigned to their linked
employee. Staff may change only their own working hours and availability. Website content,
services, prices, resources, accounts, and clinic configuration remain admin-only, and
sensitive access/security events are recorded in an immutable admin-visible audit log.

Shared calendar and employee-owned booking (owner-approved, 2026-07-19): the admin exposes
`/admin/kalenteri` as a Timma-inspired shared day/week/month calendar. All active employees
are visible in separate time-based columns; appointment cards show client, procedure, room,
and time. Services have one fixed public owner plus optional qualified backup employees.
Public booking remains Service -> Time -> You, but the selected service now writes directly
to its configured employee schedule. Admins may move appointments between qualified employees;
staff may create and move appointments only within their linked employee calendar and compatible
rooms/devices. The calendar exposes a
Create appointment action and empty available times can be clicked to prefill a new booking.
Staff availability changes remain restricted to the employee linked to their own account.
Rooms and physical treatment devices are separate exclusive resources, so employee, room,
and device overlaps are rejected server-side and at the database boundary.

Expanded client account, saved details, and booking communications (owner-approved,
2026-07-19): `/oma-tili` is a localized account dashboard for verified identity details,
appointments and change requests, website orders, saved Finland delivery addresses, and profile
editing. Authenticated booking and checkout reuse the account's verified contact details; checkout
may reuse a saved address while Stripe still confirms the final order address. Appointment emails
use a branded booking card with full timing, service, employee, clinic address, map/calendar links,
pay-at-clinic information, the published cancellation policy, and a secure account-based cancel or
reschedule action.

External integration observability (owner-approved, 2026-07-19): server-side email, SMS, Stripe,
Anthropic, and Cloudinary attempts record redacted request/response metadata, provider identifiers,
HTTP outcomes, latency, retries, and related business entities. Admin-only integration logs retain
these records for 30 days; secrets, raw personal content, payment data, and authentication material
must never be persisted.

Admin operations (owner-approved, 2026-07-18): the multilingual custom admin includes
dedicated Orders (`tilaukset`) and Appointments (`ajanvaraukset`) modules. Submitted order
contents remain immutable; staff confirm, fulfil, or cancel requests and can send audited
transactional email/SMS. Appointment administration supports confirmation, availability-
validated rescheduling, completion, cancellation, reminders, and audited custom messages.
Customer-facing automatic messages use the record locale through Resend and Sinch.

Public booking assignment (superseded 2026-07-19): the customer flow remains Service ->
Time -> You and customers do not choose between employees. Each bookable service has one
fixed public owner; choosing the service deterministically selects that employee and exposes
only their resource-safe availability. Historical appointment relations are preserved.

Themed controls (owner-approved, 2026-07-18): all dropdowns, calendars, and time pickers use
custom Mone Beauty controls. Compact fields use popovers and the booking calendar remains
inline; no native form select/date/time UI is exposed.

Public URL architecture (owner-approved, 2026-07-17): every user-facing route uses the same
Finnish path segments in FI, EN, and RU; only the locale prefix changes. Finnish remains
unprefixed, while English and Russian use `/en` and `/ru`. Canonical shop paths are
`/verkkokauppa`, `/ostoskori`, `/kassa`, and `/tilaus`; booking is `/ajanvaraus`, services
are under `/palvelut`, device treatments are under `/laitehoidot`, and the staff portal is
`/henkilosto`. Existing English public paths permanently redirect to their Finnish
equivalents. API paths, admin paths, product/article slugs, database identifiers, and booking
query values remain stable.

Admin and runtime-content architecture (owner-approved, 2026-07-16): the custom Prisma admin
is a responsive multilingual management application with a permanent desktop sidebar and an
accessible mobile drawer. Admin path segments are Finnish in every interface locale: Finnish
uses `/admin/...`, English `/en/admin/...`, and Russian `/ru/admin/...`; locale switching
preserves the route, record, query, and editor context. Clinical services, clinical
technologies, professional products, pricing, pages, and articles are distinct Prisma-backed
types with independently publishable EN/FI/RU content. Public runtime rendering reads
published content from PostgreSQL with no cross-locale fallback. Generated JSON and scraped
content are bootstrap/import sources only and routine imports never overwrite admin edits.

Homepage reference direction (owner-approved, 2026-07-12): the localized homepage reproduces
the rendered design, composition, and approved copy of repository-root `index.html`. All
medical, diagnostic, evidence-based, and licensing language in that reference is explicitly
owner-approved for homepage use and supersedes the previous homepage composition. Order:
centered real-video hero with three facts;
Standard of Care; clinical services (including `[CLINIC TO PROVIDE]` medical stubs);
alternating technologies; AROSHA/DIXIDOX tabs; compact `/ajanvaraus?service=<key>` handoff; and
clinic standard/contact. The working booking wizard remains the only appointment flow.

Develop a website from scratch for Mone Beauty Clinic, an aesthetic medicine clinic. The website should be more than just a corporate presentation—it should serve as a comprehensive platform for:
Presenting the clinic
Showcasing services
Online appointment booking
Client database management
Client communication
SEO optimization
Staff workflow automation
⸻
Brand Positioning
Clinic Name: Mone Beauty Clinic Main Focus: Aesthetic Medicine Clinic Main Slogan: Next-Generation Aesthetic Medicine Subtitle: A comprehensive approach to beauty, skin health, and restoring the natural harmony of the face, body, and hair. The website should convey:
Premium quality
Trust
Medical expertise
Safety
Modernity
Elegance
Care
Personalized approach
⸻
Visual Style
The design should reflect:
Luxury minimalism
Scandinavian aesthetics
Clean medical beauty
Premium wellness
Contemporary European medical clinic
Color Palette
Milky white
Cream
Beige
Sand
Taupe
Soft brown
Subtle gold accents
Avoid:
Bright neon colors
Traditional pink beauty salon aesthetics
Cold hospital-like appearance
Heavy black backgrounds
Cheap stock photography
Overloaded layouts
⸻
Homepage
The homepage should be long-form, logically structured, and optimized for smooth scrolling. Section 1 — Hero Must include:
Mone Beauty Clinic logo
Main navigation
Online Booking button
Language switcher
Large premium hero image
Main headline
Hero Text Aesthetic Medicine Clinic Next-Generation Aesthetic Medicine A comprehensive approach to beauty, skin health, and restoring the natural harmony of the face, body, and hair.
Buttons:
Book Online
Our Services
⸻ Section 2 — Key Advantages Highlight:
Medical approach
Innovative technologies
Personalized treatment programs
Licensed medical clinic
Safe and evidence-based procedures
⸻ Section 3 — Our Services Each service should lead to its own dedicated page.
аппаратная косметология → Aesthetic Device Treatments
Laser Hair Removal
Endospheres Therapy
Microneedling RF
Facial Treatments
Body Treatments
Injectable Aesthetic Medicine
Trichology
Medical Consultation
⸻ Section 4 — About the Clinic Heading Beauty Backed by Science. Harmony Designed for You. Text Mone Beauty Clinic combines aesthetic medicine, advanced technologies, and a comprehensive approach to beauty, skin health, facial rejuvenation, body care, and hair restoration. Emphasize:
A medical clinic, not a beauty salon
Evidence-based medical approach
Licensed facility
Safe procedures
Advanced technologies
Personalized treatment plans
⸻ Section 5 — Technologies & Treatments Include:
Endospheres Therapy
Laser technologies
RF technologies
Aesthetic device treatments
Injectable procedures
Trichology
Facial treatments
Body treatments
Section 6 — Online Booking Dedicated CTA section: Book your consultation and receive personalized recommendations from our specialists. Button: Book Online ⸻ Section 7 — Footer Include:
Logo
Navigation
Contact information
Address
Phone
Email
Instagram
Facebook
WhatsApp
Online Booking
Privacy Policy
Terms of Use
⸻
Website Structure
Each page should be a standalone page. Required pages:
Home
About the Clinic
Services
Aesthetic Device Treatments
Laser Hair Removal
Endospheres Therapy
Microneedling RF
Facial Treatments
Body Treatments
Injectable Aesthetic Medicine
Trichology
Medical Consultation
Pricing
Blog / Articles
Contact
Online Booking
Privacy Policy
Terms of Use
Do not include a “Specialists” page. ⸻
Service Pages
Each treatment should have its own SEO-optimized page. Every page should include:
Treatment name
Short description
What the treatment is
Who it is suitable for
Benefits and concerns addressed
Procedure process
Why it is safe
Pre-treatment recommendations
Post-treatment recommendations
Contraindications
Recommended number of sessions
Expected results
FAQ
Online Booking button
Online Booking
This is one of the most important features. Client Features
Select treatment
Automatic clinic assignment (no public specialist selection)
Choose date and time
24/7 online booking
Email confirmation
SMS confirmation (preferred)
Appointment reminders
Reschedule or cancel appointments
Staff Features
Personal schedule access
Ability to manage working hours
Open/close appointment slots
View personal appointments
Notifications about new bookings
Mobile access
Daily and weekly calendar
⸻
CRM / Client Database
The website should include a convenient client management system. Each client profile should contain:
Full name
Phone number
Email
Appointment history
Treatments received
Treatment dates
Practitioner
Notes
Contraindications / important comments
Cancellation and rescheduling history
Quick search by name, phone number, or email
⸻
Chatbot
The website should include an AI-powered chatbot. Functions:
Answer customer questions
Explain procedures
Help clients choose treatments
Provide pre- and post-treatment recommendations
Assist with online booking
Transfer conversations to an administrator
Preferably support Russian, Finnish, and English
⸻
Website Languages
The website should ideally support three languages:
Russian
Finnish
English
The language switcher should be located in the website header. ⸻
Mobile Version
The website must be fully responsive and optimized for:
iPhone
Android devices
Tablets
Mobile-first design is essential, as most visitors will access the website from their smartphones. ⸻
SEO
The website should be fully optimized for Google. Requirements:
Dedicated page for each treatment
SEO titles
Meta descriptions
Image ALT text
Fast loading speed
Proper H1/H2/H3 heading structure
Blog / Articles
Local SEO targeting Helsinki
Google Analytics integration
Google Search Console integration
⸻
Technical Requirements
The website should include:
Modern CMS
User-friendly admin panel
Ability to edit text, images, pricing, and services
Fast loading speed
SSL certificate
GDPR compliance
Personal data protection
Email notification integration
SMS notification integration
Online booking integration
CRM integration
AI chatbot
Instagram and WhatsApp integration
⸻
Project Priorities
The key priorities of the project are:
Build the website from scratch.
Every service must have its own dedicated page.
The online booking system must be intuitive for both clients and staff.
Staff must be able to manage their own schedules.
The system must include a client database with treatment history.
The website must feature an AI chatbot to answer customer inquiries.
The overall experience should reflect a premium, modern, and medically credible aesthetic.
The design should avoid heavy black backgrounds and instead use a soft luxury beige color palette.
The website must be fully responsive and mobile-first.
The website must be fully prepared for long-term SEO growth.
