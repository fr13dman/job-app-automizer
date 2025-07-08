import { NextRequest, NextResponse } from 'next/server'
import { OpenAIError, ContentGenerationError, generateCuratedResume } from '../../lib/chatgpt'
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

        let jobDescription: string
        let resumeFile: File | null = null

        // Check if this is a multipart form data request (file upload)
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()

            resumeFile = formData.get('resumeFile') as File
            const jobDescriptionForm = formData.get('jobDescription')

            if (!resumeFile || !jobDescriptionForm) {
                throw new APIError(
                    'Missing required fields (resumeFile, jobDescription, tone)',
                    400
                )
            }

            jobDescription = jobDescriptionForm.toString()
        } else {
            // Handle JSON request (text-based)
            const body = await request.json()
            jobDescription = body.jobDescription
        }

        // Input validation
        if (!resumeFile || !jobDescription) {
            throw new APIError('Missing required fields (resumeFile, jobDescription)', 400)
        }

        // Backend validation for security

        const jobDescriptionValidation = validateInput(jobDescription)
        if (!jobDescriptionValidation.isValid) {
            throw new APIError(
                `Job description validation failed: ${jobDescriptionValidation.error}`,
                400
            )
        }

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

        const additionalParameters = [
            '# GOAL\nBased on the provided job description and resume, curate the resume to highlight the most relevant experience and skills that match the job description.',
            // '#SUMMARY / PROFILE CURATION\n Rewrite the resume’s “Summary” section using conversational language, short active sentences, and plain words. Emphasize measurable achievements already listed in the resume that align with the job’s scope. Keep it warm but professional. Target Flesch Reading Ease ≈ 80. Do not invent any new stories.',
            // '#EXPERIENCE SECTION\n Rewrite this experience entry to better reflect the skills, outcomes, and impact relevant to the job description. Use only details from the original resume. Maintain a maximum of 4–5 bullet points. Use simple, direct sentences. Start each bullet with an action verb. Quantify outcomes (retaining original numbers). Prioritize achievements that map to job responsibilities. Target a Flesch Reading Ease score of ~80. Don’t make up any new work history. Make sure to adjust the bullet points to match the job description.',
            '#EXPERIENCE SECTION\n Do not rewrite or remove any work history. Just adjust the bullet points to match the job description. And if there is a recommendation to improve or call to action to add impact please call it out in a bullet point.',
            '#SKILLS SECTION\n Review the resume’s skills section. Remove uncommon terms that aren’t in the job description. Highlight key tools, technologies, or leadership traits that exist in the resume and are requested in the job description. Reorganize for clarity using grouped categories (e.g., Technical Skills, Leadership, Tools). Keep phrasing simple and scannable. Make sure to adjust the bullet points to match the job description.',
            '#EDUCATION SECTION\n Keep the Education section unchanged unless formatting needs alignment with the rest of the resume. Simplify degree names if overly complex. Do not adjust content unless the original resume contains a mismatch or redundant details.',
            // '#READABILITY\n Go through the revised resume and adjust language for better readability (targeting Flesch Reading Ease ≈ 80). Replace long, formal phrases with plain alternatives. Break long sentences into shorter ones. Make sure each section sounds like it was written by a real person — friendly, clear, and confident.',
            '#FINAL CONSISTENCY CHECK\n Compare the curated resume with the job description again. Confirm that: Only existing data and achievements have been used. Structure and sections remain unchanged. Each bullet reflects a clear impact or outcome. Tone is human and readable. Language avoids overused buzzwords or AI-generated patterns.',
            '#TRACKING\n Track the changes you make to the resume and provide a summary of the changes at the end.',
        ]

        let response: string = ''

        if (resumeFile) {
            // Use file-based processing
            response = await generateCuratedResume({
                resumeFile,
                jobDescription,
                additionalParameters,
            })
        }

        return NextResponse.json(
            {
                success: true,
                curatedResume: response,
            },
            { headers: corsHeaders() }
        )
    } catch (error) {
        // Log the full error for debugging
        logger.error({
            msg: 'Error in generate-resume API route',
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
                    error: 'Content Generation Error when curating resume',
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
                message:
                    error instanceof Error
                        ? error.message
                        : 'An unexpected error occurred when curating resume',
            },
            {
                status: 500,
                statusText:
                    error instanceof Error
                        ? error.message
                        : 'An unexpected error occurred when curating resume',
                headers: corsHeaders(),
            }
        )
    }
}
