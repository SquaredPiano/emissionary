# Authentication Setup Guide

This project uses Clerk for authentication and Prisma for database management. Here's how to set it up:

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/emissionary"
DIRECT_URL="postgresql://username:password@localhost:5432/emissionary"
```

## Clerk Setup

1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. Get your publishable key and secret key from the dashboard
4. Set up webhooks:
   - Go to Webhooks in your Clerk dashboard
   - Add endpoint: `https://yourdomain.com/api/webhooks/clerk`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy the webhook secret

## Database Setup

1. Set up a PostgreSQL database
2. Update the DATABASE_URL and DIRECT_URL in your .env.local
3. Run the following commands:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) View your database
npx prisma studio
```

## How It Works

1. **Authentication Flow**: Users sign in/up through Clerk
2. **User Sync**: Clerk webhooks automatically sync user data to your Prisma database
3. **Protected Routes**: All routes except `/`, `/sign-in`, `/sign-up`, and webhooks require authentication
4. **Redirects**: 
   - Authenticated users visiting `/` are redirected to `/dashboard`
   - Unauthenticated users trying to access protected routes are redirected to `/sign-in`

## Key Files

- `src/middleware.ts` - Protects routes using Clerk
- `src/app/api/webhooks/clerk/route.ts` - Syncs user data with database
- `src/lib/auth.ts` - Utility functions for getting current user
- `src/lib/prisma.ts` - Prisma client configuration
- `prisma/schema.prisma` - Database schema with User, Receipt, and Emissions models

## Testing

1. Start the development server: `pnpm dev`
2. Visit `http://localhost:3000`
3. Sign up for a new account
4. You should be redirected to the dashboard
5. Check your database to see the user was created 