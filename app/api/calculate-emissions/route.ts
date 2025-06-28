import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { NextResponse } from "next/server"
import { EmissionsResponseSchema } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized: User not found." }, { status: 401 })
  }

  const { items, storeName, fileUrl } = await request.json()

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Invalid or empty item list provided." }, { status: 400 })
  }

  const systemPrompt = `
    You are an expert in environmental science and Life Cycle Assessments (LCAs) for food products.
    Your task is to calculate the estimated carbon footprint (in kg CO2e) for a given list of grocery items.
    - Use your knowledge of global and regional food production emissions data.
    - For each item, provide the calculated emissions, a food category, and a brief justification.
    - If an item is ambiguous, make a reasonable assumption and state it in the justification.
    - Calculate the total emissions for the entire list.
    - Provide a one-sentence summary of the receipt's overall impact.
    - Return the data in the exact JSON format specified.
  `

  try {
    const { object: emissionsData } = await generateObject({
      model: openai("gpt-4o"),
      schema: EmissionsResponseSchema,
      system: systemPrompt,
      prompt: `Please calculate the carbon footprint for the following list of items: ${items.join(", ")}`,
    })

    // Save the results to the database using Prisma
    await prisma.receipt.create({
      data: {
        profile_id: user.id,
        store_name: storeName || "Unknown Store",
        file_url: fileUrl || null,
        total_emissions: emissionsData.totalEmissionsKg,
        status: "processed",
        items: {
          create: emissionsData.items.map((item) => ({
            item_name: item.itemName,
            quantity: item.quantity,
            emissions: item.emissionsKg,
            category: item.category,
          })),
        },
      },
    })

    return NextResponse.json(emissionsData)
  } catch (error) {
    console.error("Error calculating and saving emissions:", error)
    return NextResponse.json({ error: "Failed to process receipt." }, { status: 500 })
  }
}
