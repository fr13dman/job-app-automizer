import { generateCoverLetter } from '../chatgpt'

jest.mock('openai', () => {
    const mockOpenAI = {
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'test cover letter' } }],
                }),
            },
        },
    }
    return { OpenAI: jest.fn(() => mockOpenAI) }
})

describe('Successfully generate a cover letter', () => {
    const mockParams = {
        resume: 'test resume',
        jobDescription: 'test job description',
        tone: 'casual',
        additionalParameters: ['test additional instructions'],
    }

    it('should generate a cover letter', async () => {
        const coverLetter = await generateCoverLetter(mockParams)
        expect(coverLetter).toBe('test cover letter')
    })

    it('should generate a cover letter without additional parameters', async () => {
        const coverLetter = await generateCoverLetter({
            resume: 'test resume',
            jobDescription: 'test job description',
            tone: 'formal',
        })
        expect(coverLetter).toBe('test cover letter')
    })
})
