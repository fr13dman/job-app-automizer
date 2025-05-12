import React from 'react'

export default function ErrorStep({
    error,
    onStartOver,
}: {
    error: string
    onStartOver: () => void
}) {
    return (
        <div className="flex flex-col gap-4 items-center">
            <div className="text-red-600 font-semibold">{error}</div>
            <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition"
                onClick={onStartOver}
            >
                Start Over
            </button>
        </div>
    )
}
