import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { url } = await request.json()

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0;)',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
        })

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch: ${response.statusText}` },
                { status: response.status }
            )
        }

        const html = await response.text()
        return NextResponse.json({ html })
    } catch (error) {
        console.error('Error fetching job data:', error)
        return NextResponse.json({ error: 'Failed to fetch job data' }, { status: 500 })
    }
}
