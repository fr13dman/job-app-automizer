'use client'
import React, { useState } from 'react'
import Image from 'next/image'

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
    // State
    const [step, setStep] = useState<Step>('start')
    const [resume, setResume] = useState<File | null>(null)
    const [jobLink, setJobLink] = useState('')
    const [tone, setTone] = useState('')
    const [error, setError] = useState('')
    const [improvements] = useState([
        'Add more quantifiable achievements.',
        'Tailor your summary to the job description.',
        'Highlight relevant technical skills.',
    ])
    const [coverLetter, setCoverLetter] = useState('')

    // Handlers
    const handleStart = () => setStep('uploadResume')

    const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError('')
        if (e.target.files && e.target.files[0]) {
            setResume(e.target.files[0])
        }
    }

    const handleResumeNext = () => {
        if (!resume) {
            setError('Resume required')
            return
        }
        setError('')
        setStep('jobLink')
    }

    const handleJobLinkNext = () => {
        if (!jobLink) {
            setError('Job link required')
            return
        }
        // Simulate link validation
        if (!/^https?:\/\/.+\..+/.test(jobLink)) {
            setError('Invalid job link')
            return
        }
        setError('')
        setStep('analyzing')
        setTimeout(() => {
            // Simulate analysis success/failure
            if (resume?.name.toLowerCase().includes('fail')) {
                setStep('error')
                setError('Unable to analyze resume')
            } else {
                setStep('improvements')
            }
        }, 1200)
    }

    const handleImprovementsNext = () => setStep('selectTone')

    const handleToneNext = () => {
        if (!tone) {
            setError('Personality tone required')
            return
        }
        setError('')
        setStep('coverLetter')
        setTimeout(() => {
            setCoverLetter(
                `Dear Hiring Manager,\n\nI am excited to apply for this position. My experience and skills align well with your requirements. I look forward to contributing to your team with a ${tone.toLowerCase()} approach.\n\nSincerely,\n[Your Name]`
            )
        }, 800)
    }

    const handleStartOver = () => {
        setStep('start')
        setResume(null)
        setJobLink('')
        setTone('')
        setError('')
        setCoverLetter('')
    }

    // UI for each step
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 dark:from-[#18181b] dark:to-[#23272f] px-4">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 flex flex-col gap-8">
                <div className="flex flex-col items-center gap-2">
                    <Image
                        src="/next.svg"
                        alt="Logo"
                        width={120}
                        height={30}
                        className="dark:invert"
                    />
                    <h1 className="text-2xl font-bold tracking-tight text-center">
                        Job Application Automizer
                    </h1>
                </div>
                {step === 'start' && (
                    <div className="flex flex-col items-center gap-6">
                        <p className="text-center text-zinc-600 dark:text-zinc-300">
                            Instantly generate a personalized cover letter tailored to your resume
                            and a job posting.
                        </p>
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                            onClick={handleStart}
                        >
                            Get Started
                        </button>
                    </div>
                )}

                {step === 'uploadResume' && (
                    <div className="flex flex-col gap-4">
                        <label className="font-medium">Upload your resume</label>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleResumeUpload}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {resume && (
                            <div className="text-green-700 text-sm mt-1">
                                Selected: {resume.name}
                            </div>
                        )}
                        {error && <div className="text-red-600 text-sm">{error}</div>}
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition mt-2"
                            onClick={handleResumeNext}
                        >
                            Next
                        </button>
                    </div>
                )}

                {step === 'jobLink' && (
                    <div className="flex flex-col gap-4">
                        <label className="font-medium">Paste the job posting link</label>
                        <input
                            type="url"
                            placeholder="https://company.com/job/123"
                            value={jobLink}
                            onChange={(e) => setJobLink(e.target.value)}
                            className="border rounded-lg px-3 py-2"
                        />
                        {error && <div className="text-red-600 text-sm">{error}</div>}
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                            onClick={handleJobLinkNext}
                        >
                            Next
                        </button>
                    </div>
                )}

                {step === 'analyzing' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div className="text-zinc-700 dark:text-zinc-200">
                            Analyzing your resume and job requirements...
                        </div>
                    </div>
                )}

                {step === 'improvements' && (
                    <div className="flex flex-col gap-4">
                        <div className="font-medium">Suggested Resume Improvements</div>
                        <ul className="list-disc pl-5 text-zinc-700 dark:text-zinc-200">
                            {improvements.map((imp, i) => (
                                <li key={i}>{imp}</li>
                            ))}
                        </ul>
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition mt-2"
                            onClick={handleImprovementsNext}
                        >
                            Continue
                        </button>
                    </div>
                )}

                {step === 'selectTone' && (
                    <div className="flex flex-col gap-4">
                        <label className="font-medium">
                            Select personality tone for your cover letter
                        </label>
                        <div className="flex flex-col gap-2">
                            {TONES.map((t) => (
                                <label key={t} className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="tone"
                                        value={t}
                                        checked={tone === t}
                                        onChange={() => setTone(t)}
                                    />
                                    {t}
                                </label>
                            ))}
                        </div>
                        {error && <div className="text-red-600 text-sm">{error}</div>}
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                            onClick={handleToneNext}
                        >
                            Generate Cover Letter
                        </button>
                    </div>
                )}

                {step === 'coverLetter' && (
                    <div className="flex flex-col gap-4">
                        <div className="font-medium">Your Personalized Cover Letter</div>
                        <textarea
                            className="w-full h-40 border rounded-lg p-3 text-zinc-800 dark:text-zinc-100 dark:bg-zinc-800"
                            value={coverLetter}
                            readOnly
                        />
                        <button
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition"
                            onClick={handleStartOver}
                        >
                            Start Over
                        </button>
                    </div>
                )}

                {step === 'error' && (
                    <div className="flex flex-col gap-4 items-center">
                        <div className="text-red-600 font-semibold">{error}</div>
                        <button
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition"
                            onClick={handleStartOver}
                        >
                            Start Over
                        </button>
                    </div>
                )}
            </div>
            <footer className="mt-8 text-zinc-400 text-xs text-center">
                &copy; {new Date().getFullYear()} Job App Automizer. All rights reserved.
            </footer>
        </div>
    )
}
