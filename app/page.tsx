import { auth } from "@clerk/nextjs/server"
import { HomePage } from '@/src/components/home/home-page'

export default async function Home() {
  const { userId } = await auth()
  
  // Show beautiful landing page with option to go to dashboard if logged in
  return <HomePage user={userId ? { id: userId } : null} />
}
