#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔐 Setting up Authentication for Emissionary...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env.local file...');
  
  const envContent = `# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret_here

# Database (Update with your actual database URL)
DATABASE_URL="postgresql://username:password@localhost:5432/emissionary"
DIRECT_URL="postgresql://username:password@localhost:5432/emissionary"

# Next.js
NEXTAUTH_URL=http://localhost:3000
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file');
} else {
  console.log('✅ .env.local file already exists');
}

console.log('\n📋 Next steps:');
console.log('1. Go to https://clerk.com and create an account');
console.log('2. Create a new application');
console.log('3. Copy your publishable key and secret key to .env.local');
console.log('4. Set up webhooks in Clerk dashboard pointing to /api/webhooks/clerk');
console.log('5. Update DATABASE_URL with your actual database connection string');
console.log('6. Run: npx prisma db push');
console.log('7. Run: pnpm dev');
console.log('\n📖 See AUTHENTICATION_SETUP.md for detailed instructions'); 