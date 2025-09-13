import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client for admin operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Browser client for SSR
export const createClientComponentClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Database types
export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface School {
  id: string
  name: string
  organization_id: string
  created_at: string
  organizations?: {
    id: string
    name: string
  }
}

export interface Member {
  id: string
  name: string
  school_id: string
  organization_id: string
  submission_url: string
  created_at: string
  schools?: {
    id: string
    name: string
    organizations?: {
      id: string
      name: string
    }
  }
}

export interface Admin {
  id: string
  email: string
  role: string
}
