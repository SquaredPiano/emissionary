import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Convert file to base64 for Python processing
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`

    // Call Python Flask OCR service
    const pythonResponse = await fetch('http://localhost:5000/api/ocr/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image
      })
    })

    if (!pythonResponse.ok) {
      throw new Error(`Python OCR service error: ${pythonResponse.statusText}`)
    }

    const ocrResult = await pythonResponse.json()

    return NextResponse.json({
      success: true,
      ...ocrResult
    })

  } catch (error) {
    console.error('OCR processing error:', error)
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    )
  }
} 