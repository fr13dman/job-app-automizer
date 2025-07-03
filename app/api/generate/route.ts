import { NextRequest, NextResponse } from 'next/server'
import {
    generateCoverLetter,
    OpenAIError,
    ContentGenerationError,
    generateCoverLetterWithFile,
} from '../../lib/chatgpt'
import { validateInput } from '../../lib/validation'
import logger from '../../lib/logger'

// Custom error class for API-specific errors
class APIError extends Error {
    constructor(message: string, public statusCode: number, public details?: unknown) {
        super(message)
        this.name = 'APIError'
    }
}

// Add CORS headers to the response
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*', // Or specify your domain: 'http://localhost:3000'
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() })
}

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || ''

        let resume: string
        let jobDescription: string
        let tone: string
        let processingMode: string = 'text'
        let resumeFile: File | null = null

        // Check if this is a multipart form data request (file upload)
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()

            resumeFile = formData.get('resumeFile') as File
            const jobDescriptionForm = formData.get('jobDescription')
            const toneForm = formData.get('tone')
            const processingModeForm = formData.get('processingMode')

            if (!resumeFile || !jobDescriptionForm || !toneForm) {
                throw new APIError(
                    'Missing required fields (resumeFile, jobDescription, tone)',
                    400
                )
            }

            jobDescription = jobDescriptionForm.toString()
            tone = toneForm.toString()
            processingMode = processingModeForm?.toString() || 'text'

            // For direct processing, we don't need resume text
            resume = ''
        } else {
            // Handle JSON request (text-based)
            const body = await request.json()
            resume = body.resume
            jobDescription = body.jobDescription
            tone = body.tone
            processingMode = body.processingMode || 'text'
        }

        // Input validation
        if (processingMode === 'text' && (!resume || !jobDescription || !tone)) {
            throw new APIError('Missing required fields (resume, jobDescription, tone)', 400)
        }

        if (processingMode === 'direct' && (!resumeFile || !jobDescription || !tone)) {
            throw new APIError('Missing required fields (resumeFile, jobDescription, tone)', 400)
        }

        // Backend validation for security
        if (processingMode === 'text') {
            const resumeValidation = validateInput(resume)
            if (!resumeValidation.isValid) {
                throw new APIError(`Resume validation failed: ${resumeValidation.error}`, 400)
            }

            const jobDescriptionValidation = validateInput(jobDescription)
            if (!jobDescriptionValidation.isValid) {
                throw new APIError(
                    `Job description validation failed: ${jobDescriptionValidation.error}`,
                    400
                )
            }
        } else {
            // Validate file
            if (resumeFile) {
                const jobDescriptionValidation = validateInput(jobDescription)
                if (!jobDescriptionValidation.isValid) {
                    throw new APIError(
                        `Job description validation failed: ${jobDescriptionValidation.error}`,
                        400
                    )
                }

                // Validate file type and size
                if (resumeFile.type !== 'application/pdf') {
                    throw new APIError('File must be a PDF', 400)
                }

                if (resumeFile.size > 25 * 1024 * 1024) {
                    // 25MB limit for OpenAI
                    throw new APIError('File size must be less than 25MB', 400)
                }
            }
        }

        const additionalParameters = [
            '# GOAL\nBased on my resume write a humanized cover letter that is personalized and emphasizes why I am the right fit for the job',
            '# REQUIREMENTS\n- Try to maintain a Flesch Reading Ease score of around 80\n- Use a conversational, engaging tone\n- Add natural digressions about related topics that matter\n- Mix professional jargon or work terms with casual explanations\n- Mix in subtle emotional cues and rhetorical questions\n- Use contractions, idioms, and colloquialisms to create an informal, engaging tone\n- Vary Sentence Length and Structure. Mix short, impactful sentences with longer, more complex ones.',
            '# STRUCTURAL ELEMENTS\n- Mix paragraph lengths (1 to 7 sentences) \n- Use bulleted lists sparingly and naturally\n- Include conversational subheadings\n- Ensure logical coherence with dynamic rhythm across paragraphs\n- Use varied punctuation naturally (dashes, semicolons, parentheses)\n- Mix formal and casual language naturally\n- Use a mix of active and passive voice, but lean towards active\n- Include mild contradictions that you later explain\n- Before drafting, create a brief outline or skeleton to ensure logical structure and flow.',
            '# NATURAL LANGUAGE ELEMENTS\n- Where appropriate, include casual phrases like "You know what?" or "Honestly"\n- Where appropriate, use transitional phrases like "Let me explain" or "Here \'s the thing" to guide the reader smoothly through the content.\n- Regional expressions or cultural references\n- Analogies that relate to everyday life\n- Mimic human imperfections like slightly informal phrasing or unexpected transitions\n- Introduce mild repetition of ideas or phrases, as humans naturally do when emphasizing a point or when writing spontaneously\n- Add a small amount of redundancy in sentence structure or wording, but keep it minimal to avoid affecting readability\n- Include subtle, natural digressions or tangents, but ensure they connect back to the main point to maintain focus.',
            '# ADDITIONAL INSTRUCTIONS\n- Include a call to action to apply to the job',
        ]

        let response: string

        if (processingMode === 'direct' && resumeFile) {
            // Use file-based processing
            response = await generateCoverLetterWithFile({
                resumeFile,
                jobDescription,
                tone,
                additionalParameters,
            })
        } else {
            // Use text-based processing
            response = await generateCoverLetter({
                resume,
                jobDescription,
                tone,
                additionalParameters,
            })
        }

        return NextResponse.json(
            {
                success: true,
                coverLetter: response,
            },
            { headers: corsHeaders() }
        )
    } catch (error) {
        // Log the full error for debugging
        logger.error({
            msg: 'Error in generate API route',
            error:
                error instanceof Error
                    ? {
                          name: error.name,
                          message: error.message,
                          stack: error.stack,
                      }
                    : error,
            details: error instanceof APIError ? error.details : undefined,
        })

        // Handle different types of errors
        if (error instanceof APIError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'API Error',
                    message: error.message,
                },
                { status: error.statusCode, statusText: error.message, headers: corsHeaders() }
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
                {
                    status: error.statusCode || 500,
                    statusText: error.message,
                    headers: corsHeaders(),
                }
            )
        }

        if (error instanceof ContentGenerationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Content Generation Error',
                    message: error.message,
                },
                { status: 500, statusText: error.message, headers: corsHeaders() }
            )
        }

        // Handle unknown errors
        return NextResponse.json(
            {
                success: false,
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
            },
            {
                status: 500,
                statusText: error instanceof Error ? error.message : 'An unexpected error occurred',
                headers: corsHeaders(),
            }
        )
    }
}
