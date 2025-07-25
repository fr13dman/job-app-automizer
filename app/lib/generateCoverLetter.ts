// app/lib/generateCoverLetter.ts

import { resilientFetch } from './fetchRetry'

interface GenerateCoverLetterResponse {
    success: boolean
    coverLetter?: string
    error?: string
}

export async function generateCoverLetter(
    resume: string,
    jobDescription: string,
    tone: string
): Promise<GenerateCoverLetterResponse> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jobappautomizerz.netlify.app'
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Use CORS proxy in development
    const apiUrl = isDevelopment ? `http://localhost:3000/api/generate` : `${baseUrl}/api/generate`

    try {
        const result = await resilientFetch<GenerateCoverLetterResponse>(
            apiUrl,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ resume, jobDescription, tone }),
                responseType: 'json',
            },
            {
                maxRetries: 3,
                initialDelay: 1000,
                maxDelay: 5000,
                timeout: 30000,
            }
        )

        if (!result.success) {
            throw new Error(result.error || 'Failed to generate cover letter')
        }

        return result
    } catch (error) {
        console.error(
            'Failed to generate cover letter:',
            error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
    }
}

// New function for handling file uploads
export async function generateCoverLetterWithFile(
    formData: FormData
): Promise<GenerateCoverLetterResponse> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://job-app-automizer-g2gz.vercel.app/'
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Use CORS proxy in development
    const apiUrl = isDevelopment ? `http://localhost:3000/api/generate` : `${baseUrl}/api/generate`

    try {
        const result = await resilientFetch<GenerateCoverLetterResponse>(
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
            throw new Error(result.error || 'Failed to generate cover letter with file')
        }

        return result
    } catch (error) {
        console.error(
            'Failed to generate cover letter with file:',
            error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
    }
}
