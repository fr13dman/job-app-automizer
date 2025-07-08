// app/lib/generateCuratedResume.ts

import { resilientFetch } from './fetchRetry'

interface GenerateCuratedResumeResponse {
    success: boolean
    curatedResume?: string
    error?: string
}

// New function for handling file uploads
export async function generateCuratedResume(
    formData: FormData
): Promise<GenerateCuratedResumeResponse> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jobappautomizerz.netlify.app'
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Use CORS proxy in development
    const apiUrl = isDevelopment
        ? `http://localhost:3000/api/generate-resume`
        : `${baseUrl}/api/generate-resume`

    try {
        const result = await resilientFetch<GenerateCuratedResumeResponse>(
            apiUrl,
            {
                method: 'POST',
                body: formData, // Send FormData directly
                responseType: 'json',
            },
            {
                maxRetries: 3,
                initialDelay: 1000,
                maxDelay: 5000,
                timeout: 60000, // Longer timeout for file processing
            }
        )

        if (!result.success) {
            throw new Error(result.error || 'Failed to generate curated resume')
        }

        return result
    } catch (error) {
        console.error(
            'Failed to generate curated resume:',
            error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
    }
}
