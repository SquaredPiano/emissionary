import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { syncUser } from '@/lib/actions/users';
import { logger } from '@/lib/logger';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { serializePrismaResult } from '@/lib/utils/prisma-serializer';

const UserSyncSchema = z.object({
  clerkId: z.string(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: 'Missing svix headers' },
        { status: 400 }
      );
    }

    // Get the body
    const payload = await request.text();
    const body = JSON.parse(payload);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return NextResponse.json(
        { error: 'Webhook verification failed' },
        { status: 400 }
      );
    }

    // Get the ID and type
    const { id } = evt.data;
    const eventType = evt.type;

    logger.info('Webhook received', { eventType, userId: id });

    // Handle the webhook
    switch (eventType) {
      case 'user.created':
      case 'user.updated':
        const user = evt.data;
        const email = user.email_addresses?.[0]?.email_address;
        
        if (!email) {
          logger.error('No email found for user', undefined, { userId: id });
          return NextResponse.json(
            { error: 'No email found for user' },
            { status: 400 }
          );
        }

        const syncResult = await syncUser({
          clerkId: id,
          email,
          firstName: user.first_name,
          lastName: user.last_name,
          avatar: user.image_url,
        });

        if (!syncResult.success) {
          logger.error('User sync failed', new Error(syncResult.error), { userId: id });
          return NextResponse.json(
            { error: syncResult.error },
            { status: 500 }
          );
        }

        logger.info('User synced successfully', { userId: id, action: syncResult.action });
        break;

      case 'user.deleted':
        // Handle user deletion if needed
        logger.info('User deleted', { userId: id });
        break;

      default:
        logger.info('Unhandled webhook event', { eventType, userId: id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Webhook error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: serializePrismaResult({
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }),
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 