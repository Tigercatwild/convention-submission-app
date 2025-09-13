#!/usr/bin/env node

// Simple script to check if required environment variables are set
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
]

console.log('Checking environment variables...\n')

let allPresent = true

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar]
  if (value && value !== 'placeholder-key' && value !== 'placeholder-service-key' && value !== 'https://placeholder.supabase.co') {
    console.log(`✅ ${envVar}: Set`)
  } else {
    console.log(`❌ ${envVar}: Missing or placeholder`)
    allPresent = false
  }
})

if (allPresent) {
  console.log('\n🎉 All required environment variables are set!')
  process.exit(0)
} else {
  console.log('\n⚠️  Some environment variables are missing. Please set them in your deployment environment.')
  console.log('\nRequired variables:')
  requiredEnvVars.forEach(envVar => {
    console.log(`  - ${envVar}`)
  })
  process.exit(1)
}
