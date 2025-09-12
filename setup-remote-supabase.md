# Remote Supabase Setup Guide

Since Docker is having issues, here's how to set up a remote Supabase project:

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - Name: `convention-submission-app`
   - Database Password: (generate a strong password)
   - Region: Choose closest to you
6. Click "Create new project"

## 2. Get Project Credentials

1. Go to Settings → API
2. Copy the following:
   - Project URL
   - Anon public key
   - Service role key (keep secret!)

## 3. Set Up Environment Variables

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 4. Run Database Schema

1. Go to SQL Editor in Supabase Dashboard
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the SQL

## 5. Update Scripts for Remote Use

The package.json scripts are already set up to work with both local and remote Supabase.

## 6. Test Connection

```bash
npm run dev
```

Your app should now connect to the remote Supabase instance!
