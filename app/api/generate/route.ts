import { NextRequest, NextResponse } from 'next/server'
import { generateCoverLetter, OpenAIError, ContentGenerationError } from '../../lib/chatgpt'
import { validateInput } from '../../lib/validation'

// Custom error class for API-specific errors
class APIError extends Error {
    constructor(message: string, public statusCode: number, public details?: unknown) {
        super(message)
        this.name = 'APIError'
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get resume, job description, and tone from request body
        const body = await request.json()
        const { resume, jobDescription, tone } = body

        // Input validation
        if (!resume || !jobDescription || !tone) {
            throw new APIError('Missing required fields (resume, jobDescription, tone)', 400)
        }

        // Backend validation for security
        const resumeValidation = validateInput(resume)
        if (!resumeValidation.isValid) {
            throw new APIError(`Resume validation failed: ${resumeValidation.error}`, 400, {
                field: 'resume',
                details: resumeValidation.error,
            })
        }

        const jobDescriptionValidation = validateInput(jobDescription)
        if (!jobDescriptionValidation.isValid) {
            throw new APIError(
                `Job description validation failed: ${jobDescriptionValidation.error}`,
                400,
                { field: 'jobDescription', details: jobDescriptionValidation.error }
            )
        }

        const additionalParameters = [
            '# GOAL\nBased on my resume write a humanized cover letter that is personalized and emphasizes why I am the right fit for the job',
            '# REQUIREMENTS\n- Try to maintain a Flesch Reading Ease score of around 80\n- Use a conversational, engaging tone\n- Add natural digressions about related topics that matter\n- Mix professional jargon or work terms with casual explanations\n- Mix in subtle emotional cues and rhetorical questions\n- Use contractions, idioms, and colloquialisms to create an informal, engaging tone\n- Vary Sentence Length and Structure. Mix short, impactful sentences with longer, more complex ones.',
            '# STRUCTURAL ELEMENTS\n- Mix paragraph lengths (1 to 7 sentences) \n- Use bulleted lists sparingly and naturally\n- Include conversational subheadings\n- Ensure logical coherence with dynamic rhythm across paragraphs\n- Use varied punctuation naturally (dashes, semicolons, parentheses)\n- Mix formal and casual language naturally\n- Use a mix of active and passive voice, but lean towards active\n- Include mild contradictions that you later explain\n- Before drafting, create a brief outline or skeleton to ensure logical structure and flow.',
            '# NATURAL LANGUAGE ELEMENTS\n- Where appropriate, include casual phrases like "You know what?" or "Honestly"\n- Where appropriate, use transitional phrases like "Let me explain" or "Here \'s the thing" to guide the reader smoothly through the content.\n- Regional expressions or cultural references\n- Analogies that relate to everyday life\n- Mimic human imperfections like slightly informal phrasing or unexpected transitions\n- Introduce mild repetition of ideas or phrases, as humans naturally do when emphasizing a point or when writing spontaneously\n- Add a small amount of redundancy in sentence structure or wording, but keep it minimal to avoid affecting readability\n- Include subtle, natural digressions or tangents, but ensure they connect back to the main point to maintain focus.',
            '# ADDITIONAL INSTRUCTIONS\n- Include a call to action to apply to the job',
        ]

        const response = await generateCoverLetter({
            resume,
            jobDescription,
            tone,
            additionalParameters,
        })

        return NextResponse.json({
            success: true,
            coverLetter: response,
        })
    } catch (error) {
        // Log the full error for debugging
        console.error('Error:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            details: error instanceof APIError ? error.details : undefined,
        })

        // Handle different types of errors
        if (error instanceof APIError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'API Error',
                    message: error.message,
                    details: error.details,
                },
                { status: error.statusCode }
            )
        }

        if (error instanceof OpenAIError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'OpenAI API Error',
                    message: error.message,
                    statusCode: error.statusCode,
                },
                { status: error.statusCode || 500 }
            )
        }

        if (error instanceof ContentGenerationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Content Generation Error',
                    message: error.message,
                },
                { status: 500 }
            )
        }

        // Handle unknown errors
        return NextResponse.json(
            {
                success: false,
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
            },
            { status: 500 }
        )
    }
}
