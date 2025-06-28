import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    })
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id: clerkId, email_addresses, first_name, last_name } = evt.data;
    
    if (email_addresses && email_addresses.length > 0) {
      const primaryEmail = email_addresses.find(email => email.id === evt.data.primary_email_address_id);
      
      if (primaryEmail) {
        await prisma.user.create({
          data: {
            clerkId: clerkId,
            email: primaryEmail.email_address,
            firstName: first_name || null,
            lastName: last_name || null,
          },
        });
      }
    }
  }

  if (eventType === 'user.updated') {
    const { id: clerkId, email_addresses, first_name, last_name } = evt.data;
    
    if (email_addresses && email_addresses.length > 0) {
      const primaryEmail = email_addresses.find(email => email.id === evt.data.primary_email_address_id);
      
      if (primaryEmail) {
        await prisma.user.update({
          where: { clerkId },
          data: {
            email: primaryEmail.email_address,
            firstName: first_name || null,
            lastName: last_name || null,
          },
        });
      }
    }
  }

  if (eventType === 'user.deleted') {
    const { id: clerkId } = evt.data;
    
    await prisma.user.delete({
      where: { clerkId },
    });
  }

  return new Response('', { status: 200 })
} 