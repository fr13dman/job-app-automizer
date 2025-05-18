// Mock next/server
jest.mock('next/server', () => ({
    NextRequest: jest.fn().mockImplementation((url, init) => ({
        url,
        method: init?.method || 'GET',
        json: async () => JSON.parse(init?.body || '{}'),
    })),
    NextResponse: {
        json: jest.fn().mockImplementation((body, init) => ({
            status: init?.status || 200,
            json: async () => body,
        })),
    },
}))

import { POST } from '../route'
import { generateCoverLetter } from '../../../lib/chatgpt'
import { NextRequest } from 'next/server'

// Mock the chatgpt module
jest.mock('../../../lib/chatgpt', () => ({
    generateCoverLetter: jest.fn(),
    OpenAIError: class OpenAIError extends Error {
        constructor(message: string) {
            super(message)
            this.name = 'OpenAIError'
        }
    },
    ContentGenerationError: class ContentGenerationError extends Error {
        constructor(message: string) {
            super(message)
            this.name = 'ContentGenerationError'
        }
    },
}))

describe('Generate API Route', () => {
    const mockGenerateCoverLetter = generateCoverLetter as jest.MockedFunction<
        typeof generateCoverLetter
    >

    beforeEach(() => {
        mockGenerateCoverLetter.mockReset()
    })

    // TODO: Add tests for successful generation
    describe('Successful Generation', () => {
        it('should generate a cover letter with valid input', async () => {
            const mockRequest = new NextRequest('http://localhost:3000/api/generate', {
                method: 'POST',
                body: JSON.stringify({
                    resume: 'Valid resume content',
                    jobDescription: 'Valid job description',
                    tone: 'professional',
                }),
            })

            mockGenerateCoverLetter.mockResolvedValueOnce('Generated cover letter')

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toEqual({
                success: true,
                coverLetter: 'Generated cover letter',
            })
        })
    })

    // TODO: Add tests for input validation
    describe('Input Validation', () => {
        it('should reject missing required fields', async () => {
            const mockRequest = new NextRequest('http://localhost:3000/api/generate', {
                method: 'POST',
                body: JSON.stringify({
                    resume: 'Valid resume',
                    // Missing jobDescription and tone
                }),
            })

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toContain('API Error')
            expect(data.message).toContain('Missing required fields')
        })

        it('should reject invalid resume content', async () => {
            const mockRequest = new NextRequest('http://localhost:3000/api/generate', {
                method: 'POST',
                body: JSON.stringify({
                    resume: '<script>alert("malicious")</script>',
                    jobDescription: 'Valid job description',
                    tone: 'professional',
                }),
            })

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toContain('API Error')
            expect(data.message).toContain('Resume validation failed')
        })
    })

    describe('Error Handling', () => {
        it('should handle OpenAI API errors', async () => {
            const mockRequest = new NextRequest('http://localhost:3000/api/generate', {
                method: 'POST',
                body: JSON.stringify({
                    resume: 'Valid resume',
                    jobDescription: 'Valid description',
                    tone: 'professional',
                }),
            })

            mockGenerateCoverLetter.mockRejectedValueOnce(new Error('OpenAI API Error'))

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBeDefined()
            expect(data.message).toBeDefined()
        })

        it('should handle content generation errors', async () => {
            const mockRequest = new NextRequest('http://localhost:3000/api/generate', {
                method: 'POST',
                body: JSON.stringify({
                    resume: 'Valid resume',
                    jobDescription: 'Valid description',
                    tone: 'professional',
                }),
            })

            mockGenerateCoverLetter.mockRejectedValueOnce(new Error('Content generation failed'))

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBeDefined()
            expect(data.message).toBeDefined()
        })
    })
})
