const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/"/g, '');
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
supabase
  .from('users')
  .select('*')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('Connection error:', error);
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('Data:', data);
    }
  })
  .catch((error) => {
    console.error('❌ Connection failed:', error);
  }); 