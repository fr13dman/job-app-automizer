import { NextRequest, NextResponse } from 'next/server'
import { generateCoverLetter } from '@/app/lib/chatgpt'
import { validateInput } from '@/app/lib/validation'

// const API_URL = process.env.API_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
    try {
        // Get resume, job description, and tone from request body
        const { resume, jobDescription, tone } = await request.json()

        // TODO: validate input
        if (!resume || !jobDescription || !tone) {
            return NextResponse.json(
                { error: 'Missing required fields (resume, jobDescription, tone)' },
                { status: 400 }
            )
        }

        // Backend validation for security
        const resumeValidation = validateInput(resume)
        if (!resumeValidation.isValid) {
            console.error('resume validation failed: ', resumeValidation.error)
            return NextResponse.json({ error: resumeValidation.error }, { status: 400 })
        }

        const jobDescriptionValidation = validateInput(jobDescription)
        if (!jobDescriptionValidation.isValid) {
            console.error('job description validation failed: ', jobDescriptionValidation.error)
            return NextResponse.json({ error: jobDescriptionValidation.error }, { status: 400 })
        }

        const additionalParameters = [
            '# GOAL\nBased on my resume write a humanized cover letter that is personalized and emphasizes why I am the right fit for the job',
            '# REQUIREMENTS\n- Try to maintain a Flesch Reading Ease score of around 80\n- Use a conversational, engaging tone\n- Add natural digressions about related topics that matter\n- Mix professional jargon or work terms with casual explanations\n- Mix in subtle emotional cues and rhetorical questions\n- Use contractions, idioms, and colloquialisms to create an informal, engaging tone\n- Vary Sentence Length and Structure. Mix short, impactful sentences with longer, more complex ones.',
            '# STRUCTURAL ELEMENTS\n- Mix paragraph lengths (1 to 7 sentences) \n- Use bulleted lists sparingly and naturally\n- Include conversational subheadings\n- Ensure logical coherence with dynamic rhythm across paragraphs\n- Use varied punctuation naturally (dashes, semicolons, parentheses)\n- Mix formal and casual language naturally\n- Use a mix of active and passive voice, but lean towards active\n- Include mild contradictions that you later explain\n- Before drafting, create a brief outline or skeleton to ensure logical structure and flow.',
            '# NATURAL LANGUAGE ELEMENTS\n- Where appropriate, include casual phrases like "You know what?" or "Honestly"\n- Where appropriate, use transitional phrases like “Let me explain” or “Here’s the thing” to guide the reader smoothly through the content.\n- Regional expressions or cultural references\n- Analogies that relate to everyday life\n- Mimic human imperfections like slightly informal phrasing or unexpected transitions\n- Introduce mild repetition of ideas or phrases, as humans naturally do when emphasizing a point or when writing spontaneously\n- Add a small amount of redundancy in sentence structure or wording, but keep it minimal to avoid affecting readability\n- Include subtle, natural digressions or tangents, but ensure they connect back to the main point to maintain focus.',
            '# ADDITIONAL INSTRUCTIONS\n- Include a call to action to apply to the job',
        ]

        // Generate cover letter
        console.log('generating cover letter...')
        const response = await generateCoverLetter({
            resume,
            jobDescription,
            tone,
            additionalParameters,
        })

        console.log('cover letter generated successfully: ', response)

        // Return cover letter
        // Return with coverLetter field to match frontend expectation
        return NextResponse.json({
            success: true,
            coverLetter: response,
        })
    } catch (error) {
        console.error('Error generating cover letter', error)
        return NextResponse.json({ error: 'Failed to generate cover letter' }, { status: 500 })
    }
}
