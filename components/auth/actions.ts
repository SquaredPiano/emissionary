'use server';

import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(prevState: { message?: string } | null, formData: FormData) {
  const supabase = createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { message: 'Could not authenticate user. Please check your credentials.' };
  }

  return redirect('/dashboard');
}

export async function signup(prevState: { message?: string } | null, formData: FormData) {
  const origin = (await headers()).get('origin');
  const supabase = createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.user) {
    return { message: 'Could not create user. Please try again.' };
  }

  // Create a profile for the new user in the public.profiles table
  await prisma.profile.create({
    data: {
      id: data.user.id,
      full_name: fullName,
      // You can add a default avatar URL here if you want
    },
  });

  // For the sake of the demo, we'll redirect directly.
  // In a real app, you'd want to show a "Check your email" message.
  return redirect('/dashboard');
}
