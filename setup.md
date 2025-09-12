# Quick Setup Guide

## 1. Environment Setup

Create a `.env.local` file in the root directory with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 2. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. This will create all tables and insert sample data

## 3. Admin User Setup

1. Go to Supabase Dashboard > Authentication > Users
2. Create a new user with email/password
3. Go to Table Editor > admins
4. Add a new row:
   - email: (the email you used for the user)
   - role: admin

## 4. Run the App

```bash
npm run dev
```

Visit:
- Public portal: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin

## Sample Data

The schema includes sample data:
- 2 organizations (Sigma Kappa Delta, Sigma Tau Delta)
- 4 schools (University of Alabama, Auburn University, University of Georgia, Georgia Tech)
- 4 members with submission URLs

You can test the public flow immediately, or log in as admin to manage the data.
