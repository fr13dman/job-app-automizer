import React from 'react'

export default function AnalyzingStep() {
    return (
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="text-zinc-700 dark:text-zinc-200">
                Analyzing your resume and job requirements...
            </div>
        </div>
    )
}
