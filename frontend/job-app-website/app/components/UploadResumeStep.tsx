import React from 'react'

export default function UploadResumeStep({
    resume,
    error,
    onUpload,
    onNext,
}: {
    resume: File | null
    error: string
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    onNext: () => void
}) {
    return (
        <div className="flex flex-col gap-4">
            <label className="font-medium">Upload your resume</label>
            <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={onUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {resume && <div className="text-green-700 text-sm mt-1">Selected: {resume.name}</div>}
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition mt-2"
                onClick={onNext}
            >
                Next
            </button>
        </div>
    )
}
