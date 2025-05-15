import OpenAI from 'openai'

const openai = new OpenAI({
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env['OPENAI_API_KEY'],
})

interface GenerateCoverLetterParams {
    resume: string
    jobDescription: string
    tone: string
    additionalParameters?: string[] // optional parameters to include in the cover letter
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
            console.error('No content received from OpenAI')
            throw new Error('No content received from OpenAI')
        }

        try {
            // console.log('generated cover letter from openai: ', content)
            return content
        } catch (e) {
            console.error('Failed to parse OpenAI response:', content)
            throw new Error('Invalid response format from OpenAI')
        }
    } catch (error) {
        console.error('Error generating cover letter:', error)
        throw new Error('Failed to generate cover letter: ' + error)
    }
}
