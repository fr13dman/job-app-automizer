import React from 'react'

export default function StartStep({ onStart }: { onStart: () => void }) {
    return (
        <div className="flex flex-col items-center gap-6">
            <p className="text-center text-zinc-600 dark:text-zinc-300">
                Instantly generate a personalized cover letter tailored to your resume and a job
                posting.
            </p>
            <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                onClick={onStart}
            >
                Get Started
            </button>
        </div>
    )
}
