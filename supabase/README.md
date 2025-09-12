# Supabase Configuration

This directory contains the Supabase configuration files for the Convention Submission App.

## Files

- `config.toml` - Main Supabase configuration file
- `migrations/` - Database migration files
- `seed.sql` - Seed data for development
- `functions/` - Edge functions (if any)

## Setup

1. Supabase CLI is available via npx (no global installation needed)

2. Login to Supabase:
   ```bash
   npx supabase login
   ```

3. Link to your project:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

4. Start local development:
   ```bash
   npm run supabase:start
   ```

5. Run migrations:
   ```bash
   npm run supabase:reset
   ```

## Environment Variables

Create a `.env.local` file in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase-start
```

## Commands

- `npm run supabase:start` - Start local Supabase stack
- `npm run supabase:stop` - Stop local Supabase stack
- `npm run supabase:status` - Check status of local stack
- `npm run supabase:reset` - Reset database and run migrations
- `npm run supabase:types` - Generate TypeScript types
- `npx supabase db diff` - Generate migration from schema changes
- `npm run supabase:db-push` - Push local migrations to remote
- `npm run supabase:db-pull` - Pull remote schema to local

## Database Schema

The app uses the following main tables:
- `organizations` - Academic organizations
- `schools` - Schools within organizations
- `members` - Members with submissions
- `admins` - Admin users

See `migrations/20240101000000_initial_schema.sql` for the complete schema.
