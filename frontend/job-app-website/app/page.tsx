'use client'
import React, { useState } from 'react'
import { generateCoverLetter } from './lib/api'

type Step =
    | 'start'
    | 'uploadResume'
    | 'jobLink'
    | 'analyzing'
    | 'improvements'
    | 'selectTone'
    | 'coverLetter'
    | 'error'

const TONES = ['Professional', 'Friendly', 'Creative', 'Confident', 'Formal']

export default function Home() {
    const [resumeInputMode, setResumeInputMode] = useState<'text' | 'file'>('text')
    const [resumeText, setResumeText] = useState('')
    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [jobText, setJobText] = useState('')
    const [tone, setTone] = useState('professional')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [coverLetter, setCoverLetter] = useState('')

    const toneOptions = [
        { value: 'casual', label: 'Casual' },
        { value: 'semi-professional', label: 'Semi-professional' },
        { value: 'professional', label: 'Professional' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'confident', label: 'Confident' },
    ]

    // Handle file upload and parse PDF if needed
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null
        setResumeFile(file)
        // Optionally, parse PDF here and setResumeText(parsedText)
    }

    const handleGenerate = async () => {
        setError('')
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

        const selectedToneLabel = toneOptions.find((opt) => opt.value === tone)?.label || tone

        try {
            const result = await generateCoverLetter(resumeText, jobText, tone)
            console.log('generated cover letter: ', result.coverLetter)
            setCoverLetter(result.coverLetter)
            setLoading(false)
        } catch (error) {
            console.error('Error generating cover letter', error)
            setError('Failed to generate cover letter')
            setLoading(false)
            return
        }
    }

    const CoverLetterDisplay = ({ content }: { content: string }) => {
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generated Cover Letter
                </label>
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl">
                <h1 className="text-3xl font-extrabold text-center mb-2 text-blue-700 drop-shadow">
                    Cover Letter Generator
                </h1>
                <p className="text-center text-gray-500 mb-6">
                    Upload your resume and job description to generate a personalized cover letter
                </p>
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
                    {resumeInputMode === 'text' ? (
                        <textarea
                            className="w-full border rounded p-2 min-h-[120px] focus:ring-2 focus:ring-blue-300 transition text-blue-700"
                            placeholder="Paste your resume content here..."
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                        />
                    ) : (
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-300 transition"
                            onChange={handleFileChange}
                        />
                    )}
                </div>
                <div className="mb-4">
                    <label className="font-medium text-gray-500">Job Link or Description</label>
                    <textarea
                        className="w-full border rounded p-2 min-h-[80px] mt-1 focus:ring-2 focus:ring-blue-300 transition text-blue-700"
                        placeholder="Paste the job link or description here..."
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                    />
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
                </div>
                {coverLetter && <CoverLetterDisplay content={coverLetter} />}
            </div>
        </div>
    )
}
