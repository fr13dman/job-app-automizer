import * as cheerio from 'cheerio'

interface JobSection {
    title: string
    content: string
}

interface JobData {
    title: string | null
    company: string | null
    location: string | null
    description: string | null
    requirements: string | null
    responsibilities: string | null
    sections: JobSection[]
    url: string | null
    isJobPage: boolean
    error?: string
}

export async function extractJobDataFromPage(url: string): Promise<JobData> {
    const jobDataResult: JobData = {
        title: null,
        company: null,
        location: null,
        description: null,
        requirements: null,
        responsibilities: null,
        sections: [],
        url: url,
        isJobPage: false,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
        // Validate URL
        if (!isValidUrl(url)) {
            return {
                ...jobDataResult,
                error: 'Invalid URL format',
            }
        }

        // Use our backend proxy to fetch the page
        const response = await fetch('/api/fetch-job', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
            signal: controller.signal,
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
            let errorMessage = 'Failed to extract job data. Check the URL and try again. '

            // Handle specific HTTP status codes
            switch (response.status) {
                case 404:
                    errorMessage += 'Job page not found (404)'
                    break
                case 403:
                    errorMessage += 'Access to job page forbidden (403)'
                    break
                case 401:
                    errorMessage += 'Unauthorized access to job page (401)'
                    break
                case 500:
                    errorMessage += 'Server error while fetching job page (500)'
                    break
                default:
                    errorMessage =
                        errorData.message || `Failed to fetch job data (${response.status})`
            }
            return {
                ...jobDataResult,
                error: errorMessage,
            }
        }

        const { html } = await response.json()

        // Load HTML into Cheerio
        const $ = cheerio.load(html)

        // Remove scripts to avoid errors
        $('script').remove()

        // Check if the HTML is too long
        const MAX_LENGTH = 500000
        if (!checkLength($('body').html() || '', MAX_LENGTH)) {
            return {
                ...jobDataResult,
                error: 'HTML is too long',
            }
        }

        // Check if it's a job page
        console.log('called isJobPage.... ', $('body').text())
        if (!isJobPage($)) {
            return {
                ...jobDataResult,
                error: 'This does not appear to be a job listing page',
            }
        } else {
            jobDataResult.isJobPage = true
        }

        // Extract job data
        const extractedData = extractJobContent($)

        // console.log('Extracted job data: ', extractedData)

        return {
            ...jobDataResult,
            ...extractedData,
        }
    } catch (error) {
        clearTimeout(timeoutId)
        controller.abort()

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    ...jobDataResult,
                    error: 'Request timed out after 15 seconds',
                }
            }
            return {
                ...jobDataResult,
                error: `Failed to extract job data: ${error.message}`,
            }
        }

        return {
            ...jobDataResult,
            error: `Failed to extract job data: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`,
        }
    }
}

function isValidUrl(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

function checkLength(html: string, maxLength: number): boolean {
    if (html.length > maxLength) {
        console.log('HTML is too long ', html.length)
        return false
    }
    return true
}

function isJobPage($: cheerio.CheerioAPI): boolean {
    const jobIndicators = [
        'job description',
        'job details',
        'career',
        'position',
        'employment',
        'apply now',
        'qualifications',
        'responsibilities',
        'about the job',
    ]

    const pageText = $('body').text().toLowerCase()
    return jobIndicators.some((term) => pageText.includes(term))
}

function extractJobContent($: cheerio.CheerioAPI): Partial<JobData> {
    // Common job section patterns
    const sectionPatterns = [
        {
            title: 'Job Description',
            selectors: [
                '[data-testid="job-description"]',
                '.job-description',
                '.description',
                'article',
                '#job-description',
                '[class*="job-description"]',
                '[class*="description"]',
            ],
        },
        {
            title: 'Requirements',
            selectors: [
                '[data-testid="requirements"]',
                '.requirements',
                '.qualifications',
                '#requirements',
                '[class*="requirements"]',
                '[class*="qualifications"]',
            ],
        },
        {
            title: 'Responsibilities',
            selectors: [
                '[data-testid="responsibilities"]',
                '.responsibilities',
                '#responsibilities',
                '[class*="responsibilities"]',
            ],
        },
        {
            title: 'Benefits',
            selectors: [
                '[data-testid="benefits"]',
                '.benefits',
                '.perks',
                '#benefits',
                '[class*="benefits"]',
                '[class*="perks"]',
            ],
        },
        {
            title: 'About the Company',
            selectors: [
                '[data-testid="about-company"]',
                '.about-company',
                '.company-description',
                '#about-company',
                '[class*="about-company"]',
                '[class*="company-description"]',
            ],
        },
    ]

    // Extract all sections
    const sections: JobSection[] = []

    // Try to find sections based on patterns
    for (const pattern of sectionPatterns) {
        for (const selector of pattern.selectors) {
            const element = $(selector)
            if (element.length > 0) {
                // Get the text content, removing extra whitespace
                const content = element.text().trim().replace(/\s+/g, ' ')
                if (content) {
                    sections.push({
                        title: pattern.title,
                        content,
                    })
                    break // Found this section, move to next pattern
                }
            }
        }
    }

    // Look for any remaining headers and their content
    $('h1, h2, h3, h4, h5, h6, [role="heading"]').each((_, element) => {
        const $element = $(element)
        const title = $element.text().trim()

        // Skip if we already have this section
        if (!sections.some((section) => section.title === title)) {
            // Get the content that follows this header
            let content = ''
            let $next = $element.next()

            // Collect content until we hit another header
            while ($next.length > 0 && !$next.is('h1, h2, h3, h4, h5, h6, [role="heading"]')) {
                content += $next.text().trim() + ' '
                $next = $next.next()
            }

            if (content.trim()) {
                sections.push({
                    title,
                    content: content.trim(),
                })
            }
        }
    })

    // Extract specific fields
    const title = extractJobTitle($)
    const company = extractCompanyName($)
    const location = extractLocation($)
    const description =
        sections.find((section) => section.title.toLowerCase().includes('description'))?.content ||
        ''
    const requirements =
        sections.find(
            (section) =>
                section.title.toLowerCase().includes('requirement') ||
                section.title.toLowerCase().includes('qualification')
        )?.content || ''
    const responsibilities =
        sections.find((section) => section.title.toLowerCase().includes('responsibilit'))
            ?.content || ''

    return {
        title,
        company,
        location,
        description,
        requirements,
        responsibilities,
        sections,
    }
}

function extractJobTitle($: cheerio.CheerioAPI): string | null {
    const titleSelectors = [
        'h1',
        '[data-testid="job-title"]',
        '.job-title',
        '.position-title',
        'title',
        '[class*="job-title"]',
        '[class*="position-title"]',
    ]

    for (const selector of titleSelectors) {
        const element = $(selector)
        if (element.length > 0) {
            const title = element.first().text().trim()
            console.log('called extractJobTitle.... ', title)
            if (title) return title
        }
    }
    return null
}

function extractCompanyName($: cheerio.CheerioAPI): string | null {
    const companySelectors = [
        '[data-testid="company-name"]',
        '.company-name',
        '.organization',
        'meta[property="og:site_name"]',
        '[class*="company-name"]',
        '[class*="organization"]',
    ]

    for (const selector of companySelectors) {
        const element = $(selector)
        if (element.length > 0) {
            const company = element.first().text().trim()
            if (company) return company
        }
    }
    return null
}

function extractLocation($: cheerio.CheerioAPI): string | null {
    const locationSelectors = [
        '[data-testid="location"]',
        '.job-location',
        '.location',
        '[class*="location"]',
        '[class*="job-location"]',
    ]

    for (const selector of locationSelectors) {
        const element = $(selector)
        if (element.length > 0) {
            const location = element.first().text().trim()
            if (location) return location
        }
    }
    return null
}
