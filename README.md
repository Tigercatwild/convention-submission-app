# Convention Submission App

A modern web application for managing convention submissions with organization, school, and member management.

## Features

### Public User Flow
- Select organization (Sigma Kappa Delta or Sigma Tau Delta)
- Choose school from filtered list
- Find and select member name
- Redirect to personalized submission URL

### Admin Dashboard
- Authentication-protected admin panel
- CRUD operations for organizations, schools, and members
- Bulk CSV upload for members
- Modern, responsive UI with TailwindCSS

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and TailwindCSS
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd convention-submission-app
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the schema from `supabase-schema.sql`
3. Get your project URL and anon key from Settings > API

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Create Admin User

1. Go to Supabase Dashboard > Authentication > Users
2. Create a new user with email/password
3. Go to Table Editor > admins
4. Add a new row with the admin's email and role "admin"

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` for the public portal and `http://localhost:3000/admin` for the admin dashboard.

## Database Schema

### Organizations
- `id` (UUID, Primary Key)
- `name` (TEXT, Unique)
- `created_at` (TIMESTAMP)

### Schools
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `organization_id` (UUID, Foreign Key)
- `created_at` (TIMESTAMP)

### Members
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `school_id` (UUID, Foreign Key)
- `organization_id` (UUID, Foreign Key)
- `submission_url` (TEXT)
- `created_at` (TIMESTAMP)

### Admins
- `id` (UUID, Primary Key)
- `email` (TEXT, Unique)
- `role` (TEXT, Default: "admin")
- `created_at` (TIMESTAMP)

## API Endpoints

### Public Endpoints
- `GET /api/organizations` - List all organizations
- `GET /api/schools?orgId={id}` - List schools for organization
- `GET /api/members?schoolId={id}` - List members for school
- `GET /api/members/{id}` - Get member details

### Admin Endpoints (Protected)
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/{id}` - Update organization
- `DELETE /api/organizations/{id}` - Delete organization
- Similar endpoints for schools and members
- `POST /api/members/bulk` - Bulk upload members

## Bulk Upload Format

CSV file should have the following columns:
- `organization` - Organization name
- `school` - School name
- `member_name` - Member's full name
- `submission_url` - URL to redirect to

Example:
```csv
organization,school,member_name,submission_url
Sigma Kappa Delta,University of Alabama,John Doe,https://example.com/submit/john-doe
Sigma Tau Delta,University of Georgia,Jane Smith,https://example.com/submit/jane-smith
```

## Deployment

### Vercel Deployment

1. **Set up your Supabase project:**
   - Go to your Supabase Dashboard → "Default Project"
   - In SQL Editor, run the schema from `supabase/migrations/20240101000000_initial_schema.sql`
   - Run the seed data from `supabase/seed.sql`

2. **Get your Supabase credentials:**
   - Go to Settings → API
   - Copy your Project URL (looks like `https://xxxxxxxx.supabase.co`)
   - Copy your `anon public` key

3. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

4. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "New Project" → Import your GitHub repository
   - Vercel will auto-detect Next.js framework
   - Add these environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - Click "Deploy"

5. **Set up admin authentication:**
   - Go to your Supabase project → Authentication → Users
   - Create a new user with email/password
   - Go to Table Editor → `admins` table
   - Add a row with the admin's email and role "admin"

### Environment Variables for Production

Required in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

Optional (for advanced features):
- `SUPABASE_SERVICE_ROLE_KEY` - For server-side operations
- `NEXT_PUBLIC_APP_URL` - Your production URL

## Security

- Row Level Security (RLS) enabled on all tables
- Public read access for organizations, schools, and members
- Admin-only write access with JWT authentication
- Input validation on all API endpoints

## Future Enhancements

- Email invitations for members
- Statistics dashboard
- Audit logs for admin actions
- Member search and filtering
- Export functionality