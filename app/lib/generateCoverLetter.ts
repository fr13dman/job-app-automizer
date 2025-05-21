// Function to generate a cover letter calling route.ts
export async function generateCoverLetter(resume: string, jobDescription: string, tone: string) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jobappautomizerz.netlify.app'
    const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resume, jobDescription, tone }),
    })

    // If the response is not ok, throw an error
    if (!response.ok) {
        const errorData = await response.json()
        const prettyJsonStringWithTabs = JSON.stringify(errorData, null, '\t')
        console.error('Failed to generate cover letter. Error: ' + prettyJsonStringWithTabs)
        throw new Error('Failed to generate cover letter. Error: ' + prettyJsonStringWithTabs)
    }

    // If the response is ok, return the response
    const result = await response.json()
    if (result.success) {
        return result
    } else {
        const prettyJsonStringWithTabs = JSON.stringify(result, null, '\t')
        console.error('Failed to generate cover letter. Error: ' + prettyJsonStringWithTabs)
        throw new Error('Failed to generate cover letter. Error: ' + prettyJsonStringWithTabs)
    }
}
