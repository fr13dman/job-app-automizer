import { NextResponse } from 'next/server'
import { resilientFetch } from '../../lib/fetchRetry'
import logger from '../../lib/logger'

interface FetchJobResponse {
    success: boolean
    html: string
    error?: string
    statusCode?: number
}

export async function POST(request: Request) {
    try {
        const { url } = await request.json()
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        const response = await resilientFetch<FetchJobResponse>(
            url,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0;)',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                responseType: 'json',
            },
            {
                maxRetries: 3,
                initialDelay: 1000,
                maxDelay: 5000,
                timeout: 30000,
            }
        )

        return NextResponse.json({ html: response, statusCode: 200 })
    } catch (error) {
        logger.error({
            msg: 'Error fetching job data',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
    }
}
