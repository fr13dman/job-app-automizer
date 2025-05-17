import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'],
})

interface GenerateCoverLetterParams {
    resume: string
    jobDescription: string
    tone: string
    additionalParameters?: string[] // optional parameters to include in the cover letter
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
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
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
            temperature: 0.5,
            max_tokens: 3000,
        })
        const content = response.choices[0].message.content
        if (!content) {
            throw new ContentGenerationError('No content received from OpenAI')
        }

        return content
    } catch (error) {
        // Handle OpenAI API errors
        if (error instanceof OpenAI.APIError) {
            console.error('OpenAI API Error:', {
                status: error.status,
                message: error.message,
                type: error.type,
                code: error.code,
            })
            throw new OpenAIError(`OpenAI API Error: ${error.message}`, error, error.status)
        }

        // Handle network errors
        if (error instanceof Error) {
            console.error('Network or other error:', {
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
        console.error('Unknown error:', error)
        throw new OpenAIError(
            'An unexpected error occurred while generating the cover letter calling OpenAI...',
            error
        )
    }
}
