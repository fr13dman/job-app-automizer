import React from 'react'

export default function JobLinkStep({
    jobLink,
    error,
    onChange,
    onNext,
}: {
    jobLink: string
    error: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onNext: () => void
}) {
    return (
        <div className="flex flex-col gap-4">
            <label className="font-medium">Paste the job posting link</label>
            <input
                type="url"
                placeholder="https://company.com/job/123"
                value={jobLink}
                onChange={onChange}
                className="border rounded-lg px-3 py-2"
            />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                onClick={onNext}
            >
                Next
            </button>
        </div>
    )
}
