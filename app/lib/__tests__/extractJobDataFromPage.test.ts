import { extractJobDataFromPage } from '../extractJobDataFromPage'

// Mock fetch globally
global.fetch = jest.fn()

describe('extractJobDataFromPage', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks()
    })

    it('should return error for invalid URL', async () => {
        const result = await extractJobDataFromPage('invalid-url')

        expect(result).toEqual({
            title: null,
            company: null,
            location: null,
            description: null,
            url: 'invalid-url',
            isJobPage: false,
            error: 'Invalid URL format',
        })
    })

    it('should handle fetch errors gracefully', async () => {
        // Mock fetch to throw an error
        ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

        const result = await extractJobDataFromPage('https://example.com/job')

        expect(result).toEqual({
            title: null,
            company: null,
            location: null,
            description: null,
            url: 'https://example.com/job',
            isJobPage: false,
            error: 'Failed to extract job data: Network error',
        })
    })

    it('should handle non-200 responses', async () => {
        // Mock fetch to return a 404 response
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({ message: 'Failed to fetch job data' }),
        })

        const result = await extractJobDataFromPage('https://example.com/job')

        expect(result).toEqual({
            title: null,
            company: null,
            location: null,
            description: null,
            url: 'https://example.com/job',
            isJobPage: false,
            error: 'Failed to fetch job data',
        })
    })

    it('should identify and extract data from a valid job page', async () => {
        // Mock HTML content for a job page
        const mockHtml = `
            <html>
                <head>
                    <title>Senior Software Engineer - Example Corp</title>
                </head>
                <body>
                    <h1>Senior Software Engineer</h1>
                    <div class="company-name">Example Corp</div>
                    <div class="location">San Francisco, CA</div>
                    <div class="job-description">
                        <h2>Job Description</h2>
                        <p>We are looking for a Senior Software Engineer...</p>
                    </div>
                </body>
            </html>
        `

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ html: mockHtml }),
        })

        const result = await extractJobDataFromPage('https://example.com/job')

        expect(result).toEqual({
            title: 'Senior Software Engineer',
            company: 'Example Corp',
            location: 'San Francisco, CA',
            description: expect.stringContaining('We are looking for a Senior Software Engineer'),
            url: 'https://example.com/job',
            isJobPage: true,
        })
    })

    it('should identify non-job pages correctly', async () => {
        // Mock HTML content for a non-job page
        const mockHtml = `
            <html>
                <head>
                    <title>Example Corp - Home</title>
                </head>
                <body>
                    <h1>Welcome to Example Corp</h1>
                    <p>We are a leading technology company...</p>
                </body>
            </html>
        `

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ html: mockHtml }),
        })

        const result = await extractJobDataFromPage('https://example.com')

        expect(result).toEqual({
            title: null,
            company: null,
            location: null,
            description: null,
            url: 'https://example.com',
            isJobPage: false,
            error: 'This does not appear to be a job listing page',
        })
    })

    it('should handle HTML that is too long', async () => {
        // Mock HTML content for a job page
        const mockHtml = 'a'.repeat(10001)

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ html: mockHtml }),
        })

        const result = await extractJobDataFromPage('https://example.com/job')

        expect(result).toEqual({
            title: null,
            company: null,
            location: null,
            description: null,
            url: 'https://example.com/job',
            isJobPage: false,
            error: 'HTML is too long',
        })
    })

    it('should handle missing job data gracefully', async () => {
        // Mock HTML content with missing job data
        const mockHtml = `
            <html>
                <head>
                    <title>Job Page</title>
                </head>
                <body>
                    <p>Some content</p>
                </body>
            </html>
        `

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ html: mockHtml }),
        })

        const result = await extractJobDataFromPage('https://example.com/job')

        expect(result).toEqual({
            title: null,
            company: null,
            location: null,
            description: null,
            url: 'https://example.com/job',
            isJobPage: false,
            error: 'This does not appear to be a job listing page',
        })
    })

    it('should make fetch request with correct parameters', async () => {
        const url = 'https://example.com/job'
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ html: '<html><body>Job content</body></html>' }),
        })

        await extractJobDataFromPage(url)

        // Verify fetch was called with correct parameters
        expect(global.fetch).toHaveBeenCalledWith('/api/fetch-job', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        })
    })
})
