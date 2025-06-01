import * as cheerio from 'cheerio'
import logger from './logger'

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

function isJavaScriptRequired(html: string): boolean {
    const jsRequiredPatterns = [
        'You need to enable JavaScript to run this app',
        'Please enable JavaScript',
        'JavaScript is required',
        'This application requires JavaScript',
        'enable JavaScript',
        'requires JavaScript',
        'noscript',
        'script disabled',
    ]

    return jsRequiredPatterns.some((pattern) => html.toLowerCase().includes(pattern.toLowerCase()))
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
            let errorMessage =
                'Failed to extract job data. Check the URL and try again. If the problem persists, paste the site contents and try again.\n'

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

        if (isJavaScriptRequired(html)) {
            logger.warn({
                msg: 'This job page requires JavaScript to be enabled.',
                html,
            })
            return {
                ...jobDataResult,
                error: 'This job page requires JavaScript to be enabled. Please paste the job description manually.',
            }
        }

        // Check if it's a job page
        logger.debug({
            msg: 'Checking if page is a job listing',
            bodyText: $('body').text(),
        })
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
        logger.debug({
            msg: 'Extracted job data',
            data: extractedData,
        })

        return {
            ...jobDataResult,
            ...extractedData,
        }
    } catch (error) {
        clearTimeout(timeoutId)
        controller.abort()

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                logger.error({
                    msg: 'Request timed out',
                    timeout: 15000,
                })
                return {
                    ...jobDataResult,
                    error: 'Request timed out after 15 seconds',
                }
            }
            logger.error({
                msg: 'Failed to extract job data',
                error: error.message,
            })
            return {
                ...jobDataResult,
                error: `Failed to extract job data: ${error.message}`,
            }
        }

        logger.error({
            msg: 'Failed to extract job data',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
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
        logger.warn({
            msg: 'HTML content exceeds maximum length',
            length: html.length,
            maxLength,
        })
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
    logger.debug({
        msg: 'Checking if page is a job listing',
        pageText,
    })
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
                '[id^="job-details"]',
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
                '[id^="requirements"]',
            ],
        },
        {
            title: 'Responsibilities',
            selectors: [
                '[data-testid="responsibilities"]',
                '.responsibilities',
                '#responsibilities',
                '[class*="responsibilities"]',
                '[id^="responsibilities"]',
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
                '[id^="benefits"]',
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
                '[id^="about-company"]',
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
                    logger.debug({
                        msg: 'Found section',
                        title: pattern.title,
                        content,
                    })
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
                logger.debug({
                    msg: 'Found section',
                    title,
                    content: content.trim(),
                })
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
    logger.debug({
        msg: 'Extracted job data',
        title,
        company,
        location,
        description,
        requirements,
        responsibilities,
        sections,
    })

    if (!description || description.trim().length < 500) {
        logger.warn({
            msg:
                'Unable to extract job description due to parsing issues. Extracted description length: ' +
                description.trim().length,
            description,
        })
        return {
            title,
            company,
            location,
            description,
            requirements,
            responsibilities,
            sections,
            error: 'Unable to extract job description due to parsing issues. Please paste the job description manually.',
        }
    }

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
            logger.debug({
                msg: 'Found job title',
                title,
                selector,
            })
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
        '[class*="job-details-preferences-and-skills"]',
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
