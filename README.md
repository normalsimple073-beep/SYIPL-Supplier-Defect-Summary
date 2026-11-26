# SYIPL Supplier Defect Summary (starter)

A real-time React/Supabase starter with Admin/Supplier roles and database Row Level Security.

## 1. Create Supabase project
- Create a free project at https://supabase.com
- SQL Editor -> paste `supabase.sql` -> Run.
- Project Settings -> API: copy Project URL and anon/public key (NOT service-role key).

## 2. Set up the app
- Install Node.js on your computer.
- Extract this folder; run `npm install`.
- Copy `.env.example` to `.env` and set the Supabase URL and anon key.
- Run `npm run dev`, then open the local address printed by Vite.

## 3. Create Admin profile
- Sign up through the app using your email, then verify it.
- Supabase Dashboard -> Authentication -> Users -> copy your user's UUID.
- SQL Editor: run the commented insert at the bottom of `supabase.sql`, replacing USER_UUID and email.
- Sign out and sign in again. Admin profile will be read from the profiles table.

## 4. Link supplier accounts (manual onboarding for this starter)
- Admin adds supplier name and email in dashboard.
- Supplier registers using the same email and verifies it.
- In Supabase Authentication -> Users, copy supplier UUID.
- In SQL Editor, insert a profile row, linking the supplier record ID:
  `insert into public.profiles(id,role,supplier_id,email) values('SUPPLIER_AUTH_UUID','supplier','SUPPLIER_ROW_UUID','supplier@email.com');`
- Supplier logs out/in again. The supplier sees only assigned defects.

## 5. Deploy free using Cloudflare Pages
- Push this project to a GitHub repository.
- Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git.
- Select repository. Build command: `npm run build`; build output directory: `dist`.
- Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Pages settings, then deploy.
- In Supabase Authentication -> URL Configuration, add the Cloudflare URL to Site URL and Redirect URLs.

## Security notes
- Never put the Supabase service-role key in frontend code.
- SQL policies are a starter; test with separate supplier accounts before using real company data.
- In this starter, supplier profile creation and linking is a manual Admin step. Do not let suppliers self-assign a supplier ID.
- Supplier users can write action-plan fields; original defect fields are protected by separate tables and RLS.
- File attachments and email notifications are not implemented in this starter.
- Use HTTPS and keep authentication email verification enabled.
