interface JobData {
    title: string | null
    company: string | null
    location: string | null
    description: string | null
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
        url: url,
        isJobPage: false,
    }

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
        })

        if (!response.ok) {
            const error = await response.json()
            return {
                ...jobDataResult,
                error: error.message || 'Failed to fetch job data',
            }
        }

        const { html } = await response.json()

        // Check if the HTML is too long
        if (!checkLength(html)) {
            return {
                ...jobDataResult,
                error: 'HTML is too long',
            }
        }

        // Check if it's a job page
        if (!isJobPage(html)) {
            return {
                ...jobDataResult,
                error: 'This does not appear to be a job listing page',
            }
        }

        // Extract job data
        const extractedData = extractJobContent(html)

        return {
            ...jobDataResult,
            ...extractedData,
            isJobPage: true,
        }
    } catch (error) {
        // console.error(`Error extracting job data from ${url}:`, error)
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

function checkLength(html: string): boolean {
    const MAX_LENGTH = 10000 // Adjust based on your needs
    if (html.length > MAX_LENGTH) {
        console.log('HTML is too long')
        return false
    }
    return true
}

function isJobPage(html: string): boolean {
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

    const lowerHtml = html.toLowerCase()
    return jobIndicators.some((term) => lowerHtml.includes(term))
}

function extractJobContent(html: string): Partial<JobData> {
    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    return {
        title: extractJobTitle(doc),
        company: extractCompanyName(doc),
        location: extractLocation(doc),
        description: extractDescription(doc),
    }
}

function extractJobTitle(doc: Document): string | null {
    const titleSelectors = [
        'h1',
        '[data-testid="job-title"]',
        '.job-title',
        '.position-title',
        'title',
    ]

    for (const selector of titleSelectors) {
        const element = doc.querySelector(selector)
        if (element?.textContent) {
            return element.textContent.trim()
        }
    }
    return null
}

function extractCompanyName(doc: Document): string | null {
    const companySelectors = [
        '[data-testid="company-name"]',
        '.company-name',
        '.organization',
        'meta[property="og:site_name"]',
    ]

    for (const selector of companySelectors) {
        const element = doc.querySelector(selector)
        if (element?.textContent) {
            return element.textContent.trim()
        }
    }
    return null
}

function extractLocation(doc: Document): string | null {
    const locationSelectors = ['[data-testid="location"]', '.job-location', '.location']

    for (const selector of locationSelectors) {
        const element = doc.querySelector(selector)
        if (element?.textContent) {
            return element.textContent.trim()
        }
    }
    return null
}

function extractDescription(doc: Document): string | null {
    const descriptionSelectors = [
        '[data-testid="job-description"]',
        '.job-description',
        '.description',
        'article',
    ]

    for (const selector of descriptionSelectors) {
        const element = doc.querySelector(selector)
        if (element?.textContent) {
            return element.textContent.trim()
        }
    }
    return null
}
