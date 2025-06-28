# Clerk Authentication Setup Guide

This guide will help you set up Clerk authentication with proper database synchronization for the Emissionary app.

## Prerequisites

- Node.js 20+ installed
- A Clerk account (free at [clerk.com](https://clerk.com))
- A PostgreSQL database (local or cloud)

## Step 1: Environment Setup

1. **Run the setup script:**
   ```bash
   pnpm run setup-auth
   ```

2. **Or manually create `.env.local`:**
   ```bash
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
   CLERK_SECRET_KEY=your_clerk_secret_key_here
   CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret_here

   # Database (Update with your actual database URL)
   DATABASE_URL="postgresql://username:password@localhost:5432/emissionary"
   DIRECT_URL="postgresql://username:password@localhost:5432/emissionary"

   # Next.js
   NEXTAUTH_URL=http://localhost:3000
   ```

## Step 2: Clerk Dashboard Setup

1. **Create a Clerk Account:**
   - Go to [clerk.com](https://clerk.com)
   - Sign up for a free account

2. **Create a New Application:**
   - Click "Add Application"
   - Choose "Next.js" as your framework
   - Give it a name (e.g., "Emissionary")

3. **Get Your API Keys:**
   - Go to "API Keys" in the sidebar
   - Copy the "Publishable Key" and "Secret Key"
   - Update your `.env.local` file with these values

4. **Configure Authentication Methods:**
   - Go to "User & Authentication" → "Email, Phone, Username"
   - Enable "Email address" as a sign-in method
   - Optionally enable "GitHub" for OAuth

5. **Set Up Webhooks:**
   - Go to "Webhooks" in the sidebar
   - Click "Add Endpoint"
   - Set the endpoint URL to: `https://yourdomain.com/api/webhooks/clerk`
   - For local development, use: `http://localhost:3000/api/webhooks/clerk`
   - Select these events:
     - `user.created`
     - `user.updated`
     - `user.deleted`
   - Copy the webhook signing secret and add it to `.env.local` as `CLERK_WEBHOOK_SECRET`

## Step 3: Database Setup

1. **Set up your database:**
   ```bash
   # If using Supabase (recommended for development)
   # Create a new project at supabase.com
   # Copy the connection string to DATABASE_URL

   # If using local PostgreSQL
   # Create a database named 'emissionary'
   ```

2. **Push the database schema:**
   ```bash
   pnpm run db:push
   ```

3. **Generate Prisma client:**
   ```bash
   pnpm run db:generate
   ```

## Step 4: Test the Setup

1. **Start the development server:**
   ```bash
   pnpm dev
   ```

2. **Visit the app:**
   - Go to `http://localhost:3000`
   - Click "Sign In" or "Sign Up"
   - Create a new account

3. **Verify user synchronization:**
   - After signing in, go to the dashboard
   - You should see a "User Database Sync Status" card
   - It should show "Synced Successfully" if everything is working

## Step 5: Troubleshooting

### User not appearing in database:
1. Check that your webhook endpoint is accessible
2. Verify the webhook secret is correct
3. Check the browser console for errors
4. Check the server logs for webhook errors

### Webhook not receiving events:
1. Ensure the webhook URL is correct
2. Check that the events are selected in Clerk dashboard
3. Verify the webhook secret matches

### Database connection issues:
1. Check your `DATABASE_URL` is correct
2. Ensure the database is running
3. Verify the user has proper permissions

## Step 6: Production Deployment

1. **Update environment variables:**
   - Use production database URL
   - Update webhook endpoint to your production domain
   - Ensure all secrets are properly set

2. **Deploy your application:**
   - Deploy to Vercel, Netlify, or your preferred platform
   - Update the webhook URL in Clerk dashboard to your production domain

3. **Test in production:**
   - Create a test user account
   - Verify user data appears in your production database

## Architecture Overview

The authentication flow works as follows:

1. **User signs up/signs in** through Clerk's UI
2. **Clerk webhook** sends user data to `/api/webhooks/clerk`
3. **Webhook handler** creates/updates user in Prisma database
4. **Frontend sync** ensures user data is available via `/api/users/sync`
5. **Protected routes** use Clerk middleware for authentication

## Files to Review

- `src/app/api/webhooks/clerk/route.ts` - Webhook handler
- `src/app/api/users/sync/route.ts` - User sync API
- `src/hooks/useUserSync.ts` - Frontend sync hook
- `src/components/providers/user-sync-provider.tsx` - Sync provider
- `src/middleware.ts` - Route protection

## Security Notes

- Never commit your `.env.local` file
- Use strong, unique secrets for production
- Regularly rotate your API keys
- Monitor webhook events for suspicious activity
- Use HTTPS in production for all webhook endpoints

## Support

If you encounter issues:
1. Check the Clerk documentation: [docs.clerk.com](https://docs.clerk.com)
2. Review the Prisma documentation: [prisma.io/docs](https://prisma.io/docs)
3. Check the browser console and server logs for errors
4. Verify all environment variables are set correctly 