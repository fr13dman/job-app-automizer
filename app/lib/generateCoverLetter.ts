// Function to generate a cover letter calling route.ts
export async function generateCoverLetter(resume: string, jobDescription: string, tone: string) {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resume, jobDescription, tone }),
    })

    // If the response is not ok, throw an error
    if (!response.ok) {
        const errorData = await response.json()
        throw new Error('Failed to generate cover letter. Error: ' + errorData.message)
    }

    // If the response is ok, return the response
    const result = await response.json()
    if (result.success) {
        return result
    } else {
        throw new Error('Failed to generate cover letter. Error: ' + result.message)
    }
}
