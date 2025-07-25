'use client'
import React, { useState, useEffect } from 'react'
import { generateCoverLetter, generateCoverLetterWithFile } from './lib/generateCoverLetter'
import { generateCuratedResume } from './lib/generateCuratedResume'
import { extractJobDataFromPage } from './lib/extractJobDataFromPage'
import { ErrorHeader } from './components/ErrorHeader'
import { SuccessHeader } from './components/SuccessHeader'
import { validatePDF } from './lib/pdfParser'
import { StructuredResume } from './components/StructuredResume'
import logger from './lib/logger'

export default function Home() {
    const [resumeInputMode, setResumeInputMode] = useState<'text' | 'file'>('text')
    const [resumeText, setResumeText] = useState('')
    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [jobText, setJobText] = useState('')
    const [isParsingPDF, setIsParsingPDF] = useState(false)
    const [tone, setTone] = useState('professional')
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [loadingResume, setLoadingResume] = useState(false)
    const [coverLetter, setCoverLetter] = useState('')
    const [curatedResume, setCuratedResume] = useState('')
    const [autoExtract, setAutoExtract] = useState(false)
    const [isExtracting, setIsExtracting] = useState(false)
    const [showManualCopyGuidance, setShowManualCopyGuidance] = useState(false)
    const [pdfProcessingMode, setPdfProcessingMode] = useState<'extract' | 'direct'>('extract')

    const toneOptions = [
        { value: 'casual', label: 'Casual' },
        { value: 'semi-professional', label: 'Semi-professional' },
        { value: 'professional', label: 'Professional' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'confident', label: 'Confident' },
    ]

    const [resumeSections, setResumeSections] = useState<
        Array<{
            title: string
            content: string
            type: 'heading' | 'bullet' | 'paragraph'
        }>
    >([])
    const [viewMode, setViewMode] = useState<'raw' | 'structured'>('structured')

    useEffect(() => {
        const extractJobData = async () => {
            if (
                !autoExtract &&
                (!jobText.trim().startsWith('https://') || !jobText.trim().startsWith('http://'))
            ) {
                logger.debug({
                    msg: 'Skipping job data extraction....',
                    autoExtract,
                    jobText,
                })
                return
            }

            setIsExtracting(true)
            setError('')
            setSuccessMessage('')

            try {
                const jobData = await extractJobDataFromPage(jobText)
                if (jobData.isJobPage) {
                    if (!jobData.description || jobData.description.trim().length < 500) {
                        setError(
                            'Failed to extract job data. Please paste the job description manually. Reason: ' +
                                'Unable to extract job description due issues parsing the page.'
                        )
                        setIsExtracting(false)
                        return
                    }

                    logger.debug(
                        'Job Description length: ' +
                            (jobData.description ? jobData.description.trim().length : 'invalid??')
                    )
                    setJobText(
                        jobData.description ||
                            jobData.sections.map((section) => section.content).join(' \n')
                    )
                    logger.debug({
                        msg: 'Extracted job data: ',
                        jobData,
                        isJobPage: jobData.isJobPage,
                        description: jobData.description,
                        sections: jobData.sections,
                    })
                } else {
                    if (jobData.error && jobData.error.includes('JavaScript')) {
                        setShowManualCopyGuidance(true)
                        setError(
                            'This job page requires JavaScript to be enabled. Please paste the job description manually.'
                        )
                        setIsExtracting(false)
                        return
                    }
                }
            } catch (error) {
                logger.error({
                    msg: 'Failed to extract job data',
                    error: error instanceof Error ? error.message : 'Unknown error',
                })
                setError(
                    'Failed to extract job data. Please paste the job description manually. Reason: ' +
                        (error instanceof Error ? error.message : 'Unknown error')
                )
            } finally {
                setIsExtracting(false)
            }
        }
        const timeoutId = setTimeout(extractJobData, 500)
        return () => clearTimeout(timeoutId)
    }, [autoExtract, jobText])

    // Handle file upload and parse PDF
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null
        setResumeFile(file)
        setResumeText('')
        setResumeSections([])
        setError(null)
        setSuccessMessage(null)

        if (file) {
            // Validate file first
            const validation = validatePDF(file)
            if (!validation.isValid) {
                setError(validation.error || 'Invalid file')
                return
            }

            // Only parse PDF if we're in extract mode
            if (pdfProcessingMode === 'extract') {
                setIsParsingPDF(true)
                setError(null)

                try {
                    const formData = new FormData()
                    formData.append('file', file)

                    const response = await fetch('/api/parse-pdf', {
                        method: 'POST',
                        body: formData,
                    })

                    if (!response.ok) {
                        const data = await response.json()
                        throw new Error(data.error || 'Failed to parse PDF')
                    }

                    const { text, sections } = await response.json()
                    setResumeText(text)
                    setResumeSections(sections)
                    setSuccessMessage('PDF parsed successfully')
                } catch (error) {
                    console.error('Error parsing PDF:', error)
                    setError(error instanceof Error ? error.message : 'Failed to parse PDF')
                } finally {
                    setIsParsingPDF(false)
                }
            } else {
                // In direct mode, just set success message
                setSuccessMessage('PDF file ready for direct processing')
            }
        }
    }

    // Add handler for section changes
    const handleSectionsChange = (
        newSections: Array<{
            title: string
            content: string
            type: 'heading' | 'bullet' | 'paragraph'
        }>
    ) => {
        setResumeSections(newSections)
        // Update the raw text as well
        const rawText = newSections
            .map((section) => {
                if (section.type === 'heading') {
                    return `\n${section.title}\n${section.content}`
                }
                return section.content
            })
            .join('\n\n')
        setResumeText(rawText)
    }

    const handleGenerateResume = async () => {
        setError(null)
        setSuccessMessage(null)
        setLoadingResume(true)
        setCoverLetter('') // Reset cover letter text area

        // Validate inputs
        if ((resumeInputMode === 'file' && !resumeFile) || !jobText.trim()) {
            setError('Please upload resume and provide job description to curate your resume.')
            setLoadingResume(false)
            return
        }

        let jobDescription = jobText

        // Validate jobLink or check if it's a valid career page
        if (
            !autoExtract &&
            (jobDescription.trim().startsWith('https://') ||
                jobDescription.trim().startsWith('http://'))
        ) {
            try {
                logger.debug({
                    msg: `Found job link ${jobDescription} now extracting job data...`,
                    isUrl: jobDescription.startsWith('http'),
                })
                // Validate jobLink is a valid career page by fetching the page
                const jobData = await extractJobDataFromPage(jobDescription)
                if (!jobData.isJobPage) {
                    setError(
                        `Please provide a valid job link or description: Reason: ${jobData.error}`
                    )
                    setLoadingResume(false)
                    return
                }

                jobDescription =
                    jobData.description ||
                    jobData.sections.map((section) => section.content).join('\n')
            } catch (error) {
                setError(
                    `Please provide a valid job link or description: Reason: ${
                        error instanceof Error ? error.message : 'Unknown error'
                    }`
                )
                setLoadingResume(false)
                return
            }
        } else {
            // If it's not a link, check if it's a valid job description
            if (!jobDescription.trim()) {
                setError('Please provide a valid job link or description.')
                setLoadingResume(false)
                return
            }
        }

        logger.debug({
            msg: 'Processing job description',
            isUrl: jobDescription.startsWith('http'),
            length: jobDescription.length,
        })

        try {
            let result
            if (resumeInputMode === 'file' && resumeFile && pdfProcessingMode === 'direct') {
                // Send file directly to API
                const formData = new FormData()
                formData.append('resumeFile', resumeFile)
                formData.append('jobDescription', jobDescription)
                formData.append('tone', tone)
                formData.append('processingMode', 'direct')

                result = await generateCuratedResume(formData)
            } else {
                setError('Please upload resume and provide job description to curate your resume.')
                setLoadingResume(false)
                return
            }

            logger.debug({
                msg: 'Generated curated resume',
                success: result.success,
                hasCuratedResume: !!result.curatedResume,
            })

            if (result.success && result.curatedResume) {
                setCuratedResume(result.curatedResume)
                setSuccessMessage('Curated resume generated successfully')
            } else {
                setError(result.error || 'An unknown error occurred')
            }

            setLoadingResume(false)
        } catch (error) {
            logger.error({
                msg: 'Error generating curated resume',
                error: error instanceof Error ? error.message : 'Unknown error',
            })
            setError(error instanceof Error ? error.message : 'An unknown error occurred')
            setLoadingResume(false)
            return
        }
    }

    const handleGenerate = async () => {
        setError(null)
        setSuccessMessage(null)
        setLoading(true)
        setCoverLetter('') // Reset cover letter text area

        // Validate inputs
        if (
            (resumeInputMode === 'text' && !resumeText.trim()) ||
            (resumeInputMode === 'file' && !resumeFile) ||
            !jobText.trim() ||
            !tone
        ) {
            setError('Please provide all required information and select a tone.')
            setLoading(false)
            return
        }

        let jobDescription = jobText

        // Validate jobLink or check if it's a valid career page
        if (
            !autoExtract &&
            (jobDescription.trim().startsWith('https://') ||
                jobDescription.trim().startsWith('http://'))
        ) {
            try {
                logger.debug({
                    msg: `Found job link ${jobDescription} now extracting job data...`,
                    isUrl: jobDescription.startsWith('http'),
                })
                // Validate jobLink is a valid career page by fetching the page
                const jobData = await extractJobDataFromPage(jobDescription)
                if (!jobData.isJobPage) {
                    setError(
                        `Please provide a valid job link or description: Reason: ${jobData.error}`
                    )
                    setLoading(false)
                    return
                }

                jobDescription =
                    jobData.description ||
                    jobData.sections.map((section) => section.content).join('\n')
            } catch (error) {
                setError(
                    `Please provide a valid job link or description: Reason: ${
                        error instanceof Error ? error.message : 'Unknown error'
                    }`
                )
                setLoading(false)
                return
            }
        } else {
            // If it's not a link, check if it's a valid job description
            if (!jobDescription.trim()) {
                setError('Please provide a valid job link or description.')
                setLoading(false)
                return
            }
        }

        logger.debug({
            msg: 'Processing job description',
            isUrl: jobDescription.startsWith('http'),
            length: jobDescription.length,
        })

        try {
            let result
            if (resumeInputMode === 'file' && resumeFile && pdfProcessingMode === 'direct') {
                // Send file directly to API
                const formData = new FormData()
                formData.append('resumeFile', resumeFile)
                formData.append('jobDescription', jobDescription)
                formData.append('tone', tone)
                formData.append('processingMode', 'direct')

                result = await generateCoverLetterWithFile(formData)
            } else {
                // Use existing text-based approach
                result = await generateCoverLetter(resumeText, jobDescription, tone)
            }

            logger.debug({
                msg: 'Generated cover letter',
                success: result.success,
                hasCoverLetter: !!result.coverLetter,
            })

            if (result.success && result.coverLetter) {
                setCoverLetter(result.coverLetter)
                setSuccessMessage('Cover letter generated successfully')
            } else {
                setError(result.error || 'An unknown error occurred')
            }

            setLoading(false)
        } catch (error) {
            logger.error({
                msg: 'Error generating cover letter',
                error: error instanceof Error ? error.message : 'Unknown error',
            })
            setError(error instanceof Error ? error.message : 'An unknown error occurred')
            setLoading(false)
            return
        }
    }

    const ResponseDisplay = ({ content }: { content: string }) => {
        const [copied, setCopied] = useState(false)

        const handleCopy = async () => {
            try {
                await navigator.clipboard.writeText(content)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
            } catch (err) {
                console.error('Failed to copy text:', err)
            }
        }

        return (
            <div className="mt-4 relative">
                <label className="font-medium text-gray-500">Generated Cover Letter</label>
                <div className="relative">
                    <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-2 text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Copy to clipboard"
                    >
                        {copied ? (
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                />
                            </svg>
                        )}
                    </button>
                    <div
                        className="w-full min-h-[200px] p-4 bg-white border border-gray-300 rounded-md whitespace-pre-wrap font-mono text-sm text-gray-900"
                        style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {content}
                    </div>
                </div>
            </div>
        )
    }

    // Add this function to handle PDF processing mode changes
    const handlePdfProcessingModeChange = (mode: 'extract' | 'direct') => {
        setPdfProcessingMode(mode)

        // If switching to direct mode, clear the extracted text and sections
        if (mode === 'direct') {
            // setResumeText('')
            // setResumeSections([])
            setError(null)
            setSuccessMessage(null)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
            <ErrorHeader error={error} onClose={() => setError(null)} />
            <SuccessHeader message={successMessage} onClose={() => setSuccessMessage(null)} />
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl mt-8 mb-8">
                <h1 className="text-3xl font-extrabold text-center mb-2 text-blue-700 drop-shadow">
                    Personalize Your Job Applications!
                </h1>
                <p className="text-center text-gray-500 mb-6">
                    Upload your resume and job description to generate a personalized cover letter
                    or curate your resume
                </p>

                {/* Resume Input Mode */}
                <div className="mb-4">
                    <div className="flex gap-2 mb-2">
                        <button
                            className={`px-4 py-2 rounded-tl-lg rounded-bl-lg border font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                resumeInputMode === 'text'
                                    ? 'bg-blue-500 text-white shadow'
                                    : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                            }`}
                            onClick={() => setResumeInputMode('text')}
                        >
                            Paste Text
                        </button>
                        <button
                            className={`px-4 py-2 rounded-tr-lg rounded-br-lg border font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                resumeInputMode === 'file'
                                    ? 'bg-blue-500 text-white shadow'
                                    : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                            }`}
                            onClick={() => setResumeInputMode('file')}
                        >
                            Upload File
                        </button>
                    </div>
                </div>

                {/* PDF Processing Mode (only show when file mode is selected) */}
                {resumeInputMode === 'file' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            PDF Processing Mode
                        </label>
                        <div className="flex gap-2">
                            <button
                                className={`px-4 py-2 rounded-lg border font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                    pdfProcessingMode === 'extract'
                                        ? 'bg-green-500 text-white shadow'
                                        : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                                }`}
                                onClick={() => handlePdfProcessingModeChange('extract')}
                            >
                                Extract Text
                            </button>
                            <button
                                className={`px-4 py-2 rounded-lg border font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                    pdfProcessingMode === 'direct'
                                        ? 'bg-purple-500 text-white shadow'
                                        : 'bg-gray-100 text-gray-700 hover:bg-purple-100'
                                }`}
                                onClick={() => handlePdfProcessingModeChange('direct')}
                            >
                                Send PDF Directly
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {pdfProcessingMode === 'extract'
                                ? 'Extract text from PDF for processing (faster, but may lose formatting)'
                                : 'Send PDF directly to AI (preserves formatting, but may be slower)'}
                        </p>
                    </div>
                )}

                {/* Resume Input Mode */}
                <div className="mb-4">
                    {resumeInputMode === 'text' ? (
                        <div></div>
                    ) : (
                        <div className="relative">
                            <label className="font-medium text-gray-500 mb-2 block">
                                Upload Resume (PDF)
                            </label>
                            <input
                                type="file"
                                accept=".pdf"
                                className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-300 transition cursor-pointer"
                                onChange={handleFileChange}
                                disabled={isParsingPDF}
                                onInput={handleFileChange}
                            />
                            {isParsingPDF && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded">
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <svg
                                            className="animate-spin h-5 w-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        <span>Parsing PDF...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Resume Content Display */}
                <div className="mb-4">
                    {resumeInputMode === 'text' ? (
                        // Text input mode - always show textarea
                        <textarea
                            className="w-full border rounded p-2 min-h-[120px] focus:ring-2 focus:ring-blue-300 transition text-blue-700"
                            placeholder="Paste your resume content here..."
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                        />
                    ) : resumeInputMode === 'file' && pdfProcessingMode === 'direct' ? (
                        // File input mode with direct processing - show status message
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                            {resumeFile ? (
                                <div>
                                    <svg
                                        className="mx-auto h-12 w-12 text-green-500 mb-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <p className="text-sm font-medium text-green-600 mb-2">
                                        PDF file ready for direct processing
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {resumeFile.name} (
                                        {(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <svg
                                        className="mx-auto h-12 w-12 text-gray-400 mb-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                    <p className="text-sm text-gray-600">
                                        Upload a PDF file to send directly to the AI
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        No text extraction needed - the AI will read the PDF
                                        directly
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : resumeInputMode === 'file' &&
                      pdfProcessingMode === 'extract' &&
                      resumeSections.length > 0 ? (
                        // File input mode with extract processing and sections available
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold text-gray-700">
                                    Resume Content
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        className={`px-3 py-1 rounded ${
                                            viewMode === 'structured'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                                        }`}
                                        onClick={() => setViewMode('structured')}
                                    >
                                        Structured
                                    </button>
                                    <button
                                        className={`px-3 py-1 rounded ${
                                            viewMode === 'raw'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                                        }`}
                                        onClick={() => setViewMode('raw')}
                                    >
                                        Raw Text
                                    </button>
                                </div>
                            </div>

                            {viewMode === 'structured' ? (
                                <StructuredResume
                                    sections={resumeSections}
                                    onChange={handleSectionsChange}
                                />
                            ) : (
                                <textarea
                                    className="w-full border rounded p-2 min-h-[200px] focus:ring-2 focus:ring-blue-300 transition text-blue-700"
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                />
                            )}
                        </div>
                    ) : resumeInputMode === 'file' && pdfProcessingMode === 'extract' ? (
                        // File input mode with extract processing but no sections yet
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                            <svg
                                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <p className="text-sm text-gray-600">
                                Upload a PDF file to extract text content
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                The PDF will be parsed and text will be extracted for processing
                            </p>
                        </div>
                    ) : null}
                </div>
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <label className="font-medium text-gray-500">Job Link or Description</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="autoExtract"
                                checked={autoExtract}
                                onChange={(e) => setAutoExtract(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="autoExtract" className="text-sm text-gray-600">
                                Auto-extract from URL
                            </label>
                        </div>
                    </div>
                    <div className="relative">
                        <textarea
                            className="w-full border rounded p-2 min-h-[80px] mt-1 focus:ring-2 focus:ring-blue-300 transition text-blue-700"
                            placeholder="Paste the job link or description here..."
                            value={jobText}
                            onChange={(e) => setJobText(e.target.value)}
                        />
                        {isExtracting && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <svg
                                        className="animate-spin h-5 w-5"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    <span>Extracting...</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {showManualCopyGuidance && (
                        <div className="mt-2 p-4 bg-blue-50 rounded-md border border-blue-200">
                            <h3 className="text-sm font-medium text-blue-800 mb-2">
                                How to copy the job description manually:
                            </h3>
                            <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                                <li>Open the job posting in a new tab</li>
                                <li>Wait for the page to load completely</li>
                                <li>Select and copy the job description text</li>
                                <li>Paste it directly into the text area above</li>
                            </ol>
                            <button
                                onClick={() => setShowManualCopyGuidance(false)}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                    <select
                        className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300 transition w-full sm:w-auto opacity-70 text-gray-700"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                    >
                        <option value="">Select Tone</option>
                        {toneOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <button
                        className={`w-full sm:w-auto bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all duration-150 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                            loading ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                        onClick={handleGenerate}
                        disabled={loading}
                        style={{ minWidth: 180 }}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8z"
                                    ></path>
                                </svg>
                                Generating...
                            </span>
                        ) : (
                            'Generate Cover Letter'
                        )}
                    </button>
                    <button
                        className={`w-full sm:w-auto bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all duration-150 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                            loadingResume ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                        onClick={handleGenerateResume}
                        disabled={loadingResume}
                        style={{ minWidth: 180 }}
                    >
                        {loadingResume ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8z"
                                    ></path>
                                </svg>
                                Generating Curated Resume...
                            </span>
                        ) : (
                            'Curate Your Resume'
                        )}
                    </button>
                </div>
                {coverLetter && <ResponseDisplay content={coverLetter} />}
                {curatedResume && <ResponseDisplay content={curatedResume} />}
            </div>
        </div>
    )
}
