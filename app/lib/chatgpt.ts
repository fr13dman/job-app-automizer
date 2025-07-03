import OpenAI from 'openai'
import logger from './logger'

// Configure OpenAI with proper error handling and timeouts
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    defaultQuery: { 'api-version': '2024-02-15-preview' },
    defaultHeaders: { 'x-ms-useragent': 'job-app-automizer/1.0.0' },
    // Disable worker threads
    fetch: (url, options) => {
        return fetch(url, {
            ...options,
            headers: {
                ...options?.headers,
                'x-ms-useragent': 'job-app-automizer/1.0.0',
            },
        })
    },
})

interface GenerateCoverLetterParams {
    resume: string
    jobDescription: string
    tone: string
    additionalParameters?: string[] // optional parameters to include in the cover letter
}

interface GenerateCoverLetterWithFileParams {
    resumeFile: File
    jobDescription: string
    tone: string
    additionalParameters?: string[]
}

export class OpenAIError extends Error {
    constructor(message: string, public originalError?: unknown, public statusCode?: number) {
        super(message)
        this.name = 'OpenAIError'
    }
}

export class ContentGenerationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ContentGenerationError'
    }
}

// Generate a cover letter using the OpenAI API
export const generateCoverLetter = async (params: GenerateCoverLetterParams) => {
    // Construct the system prompt
    const systemPrompt = `You are the Director of Recruiting at the company in question and an expert cover letter writer. 
    Generate a cover letter that matches the specified tone: ${params.tone}.
    Focus on highlighting relevant experience and skills from the resume that match the job description. 
    Ignore the outline and just write the cover letter. Also do not include placeholders for the cover letter.
    Do not include any other text than the cover letter. Do not add subheadings or other text.
    ${params.additionalParameters?.join('\n')}`

    try {
        // Generate the cover letter with the following parameters
        const response = await openai.chat.completions.create(
            {
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: `Resume: ${params.resume}\nJob Description: ${params.jobDescription}`,
                    },
                ],
                temperature: 0.7,
                max_tokens: 3000,
            },
            {
                timeout: 15000, // 15 second timeout
                retries: 3, // 3 retriesq
            }
        )
        const content = response.choices[0].message.content
        if (!content) {
            logger.error('OpenAI returned empty content')
            throw new ContentGenerationError('No content received from OpenAI')
        }

        return content
    } catch (error) {
        // Check if it's a 502 error or other retryable error
        const isRetryable =
            error instanceof OpenAI.APIError && (error.status === 502 || error.status === 503)

        // Enhanced error logging
        logger.error({
            msg: 'Error in generateCoverLetter',
            error:
                error instanceof Error
                    ? {
                          name: error.name,
                          message: error.message,
                          stack: error.stack,
                      }
                    : error,
            params: {
                resumeLength: params.resume.length,
                jobDescriptionLength: params.jobDescription.length,
                tone: params.tone,
            },
        })

        // Handle OpenAI API errors
        if (error instanceof OpenAI.APIError) {
            logger.error({
                msg: 'OpenAI API Error',
                status: error.status,
                message: error.message,
                type: error.type,
                code: error.code,
            })
            throw new OpenAIError(`OpenAI API Error: ${error.message}`, error, error.status)
        }

        // Handle network errors
        if (error instanceof Error) {
            logger.error({
                msg: 'Network or other error',
                name: error.name,
                message: error.message,
                stack: error.stack,
            })
            throw new OpenAIError(
                `Failed to generate cover letter calling OpenAI: ${error.message}`,
                error
            )
        }

        // Handle unknown errors
        logger.error({
            msg: 'Unknown error',
            error,
        })
        throw new OpenAIError(
            'An unexpected error occurred while generating the cover letter calling OpenAI...',
            error
        )
    }
}

// Generate a cover letter using the OpenAI API with file input
export const generateCoverLetterWithFile = async (params: GenerateCoverLetterWithFileParams) => {
    // Construct the system prompt
    const systemPrompt = `You are the Director of Recruiting at the company in question and an expert cover letter writer. 
    Generate a cover letter that matches the specified tone: ${params.tone}.
    Focus on highlighting relevant experience and skills from the resume that match the job description. 
    Ignore the outline and just write the cover letter. Also do not include placeholders for the cover letter.
    Do not include any other text than the cover letter. Do not add subheadings or other text.
    ${params.additionalParameters?.join('\n')}`

    try {
        // Convert file to base64 for OpenAI API
        const arrayBuffer = await params.resumeFile.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')

        // Generate the cover letter with file input
        const response = await openai.chat.completions.create(
            {
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Job Description: ${params.jobDescription}`,
                            },
                            {
                                type: 'file',
                                file: {
                                    file_data: `data:application/pdf;base64,${base64}`,
                                    filename: params.resumeFile.name,
                                },
                            },
                        ],
                    },
                ],
                temperature: 0.5,
                max_tokens: 3000,
            },
            {
                timeout: 30000, // 30 second timeout for file processing
                retries: 3,
            }
        )
        const content = response.choices[0].message.content
        if (!content) {
            logger.error('OpenAI returned empty content')
            throw new ContentGenerationError('No content received from OpenAI')
        }

        return content
    } catch (error) {
        // Check if it's a 502 error or other retryable error
        const isRetryable =
            error instanceof OpenAI.APIError && (error.status === 502 || error.status === 503)

        // Enhanced error logging
        logger.error({
            msg: 'Error in generateCoverLetter',
            error:
                error instanceof Error
                    ? {
                          name: error.name,
                          message: error.message,
                          stack: error.stack,
                      }
                    : error,
            params: {
                resumeLength: params.resumeFile.size,
                jobDescriptionLength: params.jobDescription.length,
                tone: params.tone,
            },
        })

        // Handle OpenAI API errors
        if (error instanceof OpenAI.APIError) {
            logger.error({
                msg: 'OpenAI API Error',
                status: error.status,
                message: error.message,
                type: error.type,
                code: error.code,
            })
            throw new OpenAIError(`OpenAI API Error: ${error.message}`, error, error.status)
        }

        // Handle network errors
        if (error instanceof Error) {
            logger.error({
                msg: 'Network or other error',
                name: error.name,
                message: error.message,
                stack: error.stack,
            })
            throw new OpenAIError(
                `Failed to generate cover letter calling OpenAI: ${error.message}`,
                error
            )
        }

        // Handle unknown errors
        logger.error({
            msg: 'Unknown error',
            error,
        })
        throw new OpenAIError(
            'An unexpected error occurred while generating the cover letter calling OpenAI...',
            error
        )
    }
}
