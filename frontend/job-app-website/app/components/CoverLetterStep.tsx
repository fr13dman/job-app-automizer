import React from 'react'

export default function CoverLetterStep({
    coverLetter,
    onStartOver,
}: {
    coverLetter: string
    onStartOver: () => void
}) {
    return (
        <div className="flex flex-col gap-4">
            <div className="font-medium">Your Personalized Cover Letter</div>
            <textarea
                className="w-full h-40 border rounded-lg p-3 text-zinc-800 dark:text-zinc-100 dark:bg-zinc-800"
                value={coverLetter}
                readOnly
            />
            <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition"
                onClick={onStartOver}
            >
                Start Over
            </button>
        </div>
    )
}
