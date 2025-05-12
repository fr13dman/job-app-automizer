import React from 'react'

export default function ImprovementsStep({
    improvements,
    onNext,
}: {
    improvements: string[]
    onNext: () => void
}) {
    return (
        <div className="flex flex-col gap-4">
            <div className="font-medium">Suggested Resume Improvements</div>
            <ul className="list-disc pl-5 text-zinc-700 dark:text-zinc-200">
                {improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                ))}
            </ul>
            <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition mt-2"
                onClick={onNext}
            >
                Continue
            </button>
        </div>
    )
}
