import { extractJobDataFromPage } from '../extractJobDataFromPage'
import * as cheerio from 'cheerio'
// import util from 'util'

// Mock fetch globally
global.fetch = jest.fn()

// jest.mock('../extractJobDataFromPage', () => {
//     const originalModule = jest.requireActual('../extractJobDataFromPage')
//     return {
//         ...originalModule,
//         isJobPage: jest.fn().mockReturnValue(true),
//     }
// })

describe('extractJobDataFromPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return error for invalid URL', async () => {
        const result = await extractJobDataFromPage('invalid-url')

        expect(result).toEqual({
            title: null,
            company: null,
            location: null,
            description: null,
            requirements: null,
            responsibilities: null,
            sections: [],
            url: 'invalid-url',
            isJobPage: false,
            error: 'Invalid URL format',
        })
    })

    it('should handle 404 responses', async () => {
        // Mock fetch to return a 404 response
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ message: 'Not Found' }),
        })

        const result = await extractJobDataFromPage('https://example.com/job')

        expect(result).toEqual({
            title: null,
            company: null,
            location: null,
            description: null,
            requirements: null,
            responsibilities: null,
            sections: [],
            url: 'https://example.com/job',
            isJobPage: false,
            error: 'Failed to extract job data. Check the URL and try again. Job page not found (404)',
        })
    })

    it('should handle network errors', async () => {
        // Mock fetch to throw a network error
        ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

        const result = await extractJobDataFromPage('https://example.com/job')

        expect(result).toEqual({
            title: null,
            company: null,
            location: null,
            description: null,
            requirements: null,
            responsibilities: null,
            sections: [],
            url: 'https://example.com/job',
            isJobPage: false,
            error: 'Failed to extract job data: Network error',
        })
    })

    it('should handle HTML that is too long', async () => {
        const mockHtml = 'a'.repeat(500001) // HTML that's too long

        // Mock fetch to return successful response
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ html: mockHtml }),
        })

        // Mock cheerio.load at the test level
        const cheerioLoadSpy = jest.spyOn(cheerio, 'load').mockImplementation(() => {
            // Create base methods that will be shared by all returned objects
            const baseMethods = {
                remove: jest.fn().mockReturnThis(),
                text: jest.fn().mockReturnValue(''),
                html: jest.fn().mockReturnValue(''),
                find: jest.fn().mockReturnThis(),
                first: jest.fn().mockReturnThis(),
                length: 1,
            }

            // Create the $ function
            const $ = Object.assign(
                (selector: string) => {
                    if (selector === 'body') {
                        return {
                            ...baseMethods,
                            text: jest
                                .fn()
                                .mockReturnValue(
                                    'job description job details career position employment apply now qualifications responsibilities about the job'
                                ),
                            html: jest.fn().mockReturnValue('a'.repeat(500001)),
                        }
                    }
                    if (selector === 'script') {
                        return {
                            ...baseMethods,
                            remove: jest.fn().mockReturnThis(),
                        }
                    }
                    return {
                        ...baseMethods,
                    }
                },
                {
                    remove: jest.fn().mockReturnThis(),
                    text: jest.fn().mockReturnValue(''),
                    html: jest.fn().mockReturnValue(''),
                    find: jest.fn().mockReturnThis(),
                    first: jest.fn().mockReturnThis(),
                }
            )

            return $
        })

        const result = await extractJobDataFromPage('https://example.com/job')

        expect(result).toEqual({
            title: null,
            company: null,
            location: null,
            description: null,
            requirements: null,
            responsibilities: null,
            sections: [],
            url: 'https://example.com/job',
            isJobPage: false,
            error: 'HTML is too long',
        })

        // Clean up the spy
        cheerioLoadSpy.mockRestore()
    })

    it('should handle successful responses', async () => {
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
                        <p>Career Level: Senior</p>
                        <p>We are looking for a Senior Software Engineer...</p>
                    </div>
                </body>
            </html>
        `

        // Mock fetch to return successful response
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ html: mockHtml }),
        })

        // Mock cheerio.load at the test level
        const cheerioLoadSpy = jest.spyOn(cheerio, 'load').mockImplementation(() => {
            // Create base methods that will be shared by all returned objects
            const baseMethods = {
                remove: jest.fn().mockReturnThis(),
                text: jest.fn().mockReturnValue(''),
                html: jest.fn().mockReturnValue(''),
                find: jest.fn().mockReturnThis(),
                first: jest.fn().mockReturnThis(),
                length: 1,
                each: jest.fn().mockImplementation((callback) => {
                    callback(0, { text: jest.fn().mockReturnValue('Senior Software Engineer') })
                    return this
                }),
                next: jest.fn().mockReturnThis(),
                is: jest.fn().mockReturnValue(false),
            }

            // Create the $ function
            const $ = Object.assign(
                (selector: string) => {
                    if (selector === 'body') {
                        return {
                            ...baseMethods,
                            text: jest
                                .fn()
                                .mockReturnValue(
                                    'job description job details career position employment apply now qualifications responsibilities about the job'
                                ),
                            html: jest.fn().mockReturnValue(mockHtml),
                        }
                    }
                    if (selector === 'script') {
                        return {
                            ...baseMethods,
                            remove: jest.fn().mockReturnThis(),
                        }
                    }
                    // Handle all title selectors
                    if (
                        [
                            'h1',
                            '[data-testid="job-title"]',
                            '.job-title',
                            '.position-title',
                            'title',
                            '[class*="job-title"]',
                            '[class*="position-title"]',
                        ].includes(selector)
                    ) {
                        return {
                            ...baseMethods,
                            length: 1,
                            first: jest.fn().mockReturnValue({
                                text: jest.fn().mockReturnValue('Senior Software Engineer'),
                            }),
                        }
                    }
                    if (selector === '.company-name') {
                        return {
                            ...baseMethods,
                            length: 1,
                            first: jest.fn().mockReturnValue({
                                text: jest.fn().mockReturnValue('Example Corp'),
                            }),
                        }
                    }
                    if (selector === '.location') {
                        return {
                            ...baseMethods,
                            length: 1,
                            first: jest.fn().mockReturnValue({
                                text: jest.fn().mockReturnValue('San Francisco, CA'),
                            }),
                        }
                    }
                    if (selector === '.job-description') {
                        return {
                            ...baseMethods,
                            length: 1,
                            first: jest.fn().mockReturnValue({
                                text: jest
                                    .fn()
                                    .mockReturnValue(
                                        'Career Level: Senior\nWe are looking for a Senior Software Engineer...'
                                    ),
                            }),
                        }
                    }
                    if (selector === 'h1, h2, h3, h4, h5, h6, [role="heading"]') {
                        return {
                            ...baseMethods,
                            each: jest.fn().mockImplementation((callback) => {
                                const headings = [
                                    {
                                        title: 'Job Description',
                                        content:
                                            'Career Level: Senior\nWe are looking for a Senior Software Engineer...',
                                    },
                                ]

                                headings.forEach((heading, index) => {
                                    callback(index, {
                                        text: jest.fn().mockReturnValue(heading.title),
                                        next: jest.fn().mockReturnValue({
                                            text: jest.fn().mockReturnValue(heading.content),
                                            next: jest.fn().mockReturnValue({
                                                is: jest.fn().mockReturnValue(true),
                                            }),
                                        }),
                                    })
                                })
                                return this
                            }),
                        }
                    }
                    return {
                        ...baseMethods,
                    }
                },
                {
                    remove: jest.fn().mockReturnThis(),
                    text: jest.fn().mockReturnValue(''),
                    html: jest.fn().mockReturnValue(''),
                    find: jest.fn().mockReturnThis(),
                    first: jest.fn().mockReturnThis(),
                    length: 1,
                }
            )

            return $
        })

        const result = await extractJobDataFromPage('https://example.com/job')

        expect(result.isJobPage).toBe(true)
        expect(result.title).toBe('Senior Software Engineer')
        expect(result.company).toBe('Example Corp')
        expect(result.location).toBe('San Francisco, CA')
        expect(result.description).toBe(
            'Career Level: Senior\nWe are looking for a Senior Software Engineer...'
        )

        // Clean up the spy
        cheerioLoadSpy.mockRestore()
    })

    // it('should handle non-200 responses', async () => {
    //     // Mock fetch to return a 404 response
    //     ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    //         ok: false,
    //         status: 404,
    //         statusText: 'Not Found',
    //         json: () => Promise.resolve({ message: 'Failed to extract job data' }),
    //     })

    //     const result = await extractJobDataFromPage('https://example.com/job')

    //     expect(result).toEqual({
    //         title: null,
    //         company: null,
    //         location: null,
    //         description: null,
    //         url: 'https://example.com/job',
    //         isJobPage: false,
    //         error: 'Failed to extract job data. Check the URL and try again. Job page not found (404)',
    //         requirements: null,
    //         responsibilities: null,
    //         sections: [],
    //     })
    // })

    // it('should identify and extract data from a valid job page', async () => {
    //     // Mock HTML content for a job page
    //     const mockHtml = `
    //         <html>
    //             <head>
    //                 <title>Senior Software Engineer - Example Corp</title>
    //             </head>
    //             <body>
    //                 <h1>Senior Software Engineer</h1>
    //                 <div class="company-name">Example Corp</div>
    //                 <div class="location">San Francisco, CA</div>
    //                 <div class="job-description">
    //                     <h2>Job Description</h2>
    //                     <p>We are looking for a Senior Software Engineer...</p>
    //                 </div>
    //             </body>
    //         </html>
    //     `

    //     ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    //         ok: true,
    //         json: () => Promise.resolve({ html: mockHtml }),
    //     })

    //     const result = await extractJobDataFromPage('https://example.com/job')

    //     expect(result).toEqual({
    //         title: 'Senior Software Engineer',
    //         company: 'Example Corp',
    //         location: 'San Francisco, CA',
    //         description: expect.stringContaining('We are looking for a Senior Software Engineer'),
    //         url: 'https://example.com/job',
    //         isJobPage: true,
    //     })
    // })

    // it('should identify non-job pages correctly', async () => {
    //     // Mock HTML content for a non-job page
    //     const mockHtml = `
    //         <html>
    //             <head>
    //                 <title>Example Corp - Home</title>
    //             </head>
    //             <body>
    //                 <h1>Welcome to Example Corp</h1>
    //                 <p>We are a leading technology company...</p>
    //             </body>
    //         </html>
    //     `

    //     ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    //         ok: true,
    //         json: () => Promise.resolve({ html: mockHtml }),
    //     })

    //     const result = await extractJobDataFromPage('https://example.com')

    //     expect(result).toEqual({
    //         title: null,
    //         company: null,
    //         location: null,
    //         description: null,
    //         url: 'https://example.com',
    //         isJobPage: false,
    //         error: 'This does not appear to be a job listing page',
    //     })
    // })

    // it('should handle missing job data gracefully', async () => {
    //     // Mock HTML content with missing job data
    //     const mockHtml = `
    //         <html>
    //             <head>
    //                 <title>Job Page</title>
    //             </head>
    //             <body>
    //                 <p>Some content</p>
    //             </body>
    //         </html>
    //     `

    //     ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    //         ok: true,
    //         json: () => Promise.resolve({ html: mockHtml }),
    //     })

    //     const result = await extractJobDataFromPage('https://example.com/job')

    //     expect(result).toEqual({
    //         title: null,
    //         company: null,
    //         location: null,
    //         description: null,
    //         url: 'https://example.com/job',
    //         isJobPage: false,
    //         error: 'This does not appear to be a job listing page',
    //     })
    // })

    // it('should make fetch request with correct parameters', async () => {
    //     const url = 'https://example.com/job'
    //     ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    //         ok: true,
    //         json: () => Promise.resolve({ html: '<html><body>Job content</body></html>' }),
    //     })

    //     await extractJobDataFromPage(url)

    //     // Verify fetch was called with correct parameters
    //     expect(global.fetch).toHaveBeenCalledWith('/api/fetch-job', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({ url }),
    //     })
    // })
})
