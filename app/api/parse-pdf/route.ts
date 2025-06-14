// app/api/parse-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { parsePDF } from '@/app/lib/pdfParser'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Now we get both text and sections
        const { text, sections } = await parsePDF(file)

        return NextResponse.json({
            text,
            sections,
        })
    } catch (error) {
        console.error('Error parsing PDF:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to parse PDF' },
            { status: 500 }
        )
    }
}
