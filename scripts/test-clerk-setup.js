#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Clerk Setup...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found');
  console.log('Run: pnpm run setup-auth');
  process.exit(1);
}

// Read and check environment variables
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

console.log('📋 Environment Variables Check:');

const requiredVars = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'CLERK_WEBHOOK_SECRET',
  'DATABASE_URL'
];

let allGood = true;

requiredVars.forEach(varName => {
  const value = envVars[varName];
  if (!value || value.includes('your_') || value.includes('here')) {
    console.log(`❌ ${varName}: Not configured`);
    allGood = false;
  } else {
    console.log(`✅ ${varName}: Configured`);
  }
});

console.log('\n📁 File Structure Check:');

const requiredFiles = [
  'src/app/api/webhooks/clerk/route.ts',
  'src/app/api/users/sync/route.ts',
  'src/hooks/useUserSync.ts',
  'src/components/providers/user-sync-provider.tsx',
  'src/middleware.ts',
  'prisma/schema.prisma'
];

requiredFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${filePath}`);
  } else {
    console.log(`❌ ${filePath}: Missing`);
    allGood = false;
  }
});

console.log('\n🔧 Database Setup Check:');

// Check if Prisma client exists
const prismaClientPath = path.join(process.cwd(), 'generated/prisma/index.js');
if (fs.existsSync(prismaClientPath)) {
  console.log('✅ Prisma client generated');
} else {
  console.log('❌ Prisma client not generated');
  console.log('Run: pnpm run db:generate');
  allGood = false;
}

console.log('\n📝 Next Steps:');

if (allGood) {
  console.log('✅ All checks passed! Your Clerk setup looks good.');
  console.log('\nTo test the setup:');
  console.log('1. Start the development server: pnpm dev');
  console.log('2. Visit http://localhost:3000');
  console.log('3. Sign up for a new account');
  console.log('4. Check the dashboard for the "User Database Sync Status" card');
} else {
  console.log('❌ Some issues found. Please fix them before proceeding.');
  console.log('\nCommon fixes:');
  console.log('- Run: pnpm run setup-auth');
  console.log('- Configure your Clerk API keys in .env.local');
  console.log('- Run: pnpm run db:generate');
  console.log('- Set up your database and update DATABASE_URL');
}

console.log('\n📖 For detailed instructions, see: CLERK_SETUP_GUIDE.md'); 