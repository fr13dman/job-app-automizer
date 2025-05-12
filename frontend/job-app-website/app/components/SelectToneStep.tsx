import React from 'react'

export default function SelectToneStep({
    tones,
    tone,
    error,
    onSelect,
    onNext,
}: {
    tones: string[]
    tone: string
    error: string
    onSelect: (tone: string) => void
    onNext: () => void
}) {
    return (
        <div className="flex flex-col gap-4">
            <label className="font-medium">Select personality tone for your cover letter</label>
            <div className="flex flex-col gap-2">
                {tones.map((t) => (
                    <label key={t} className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="tone"
                            value={t}
                            checked={tone === t}
                            onChange={() => onSelect(t)}
                        />
                        {t}
                    </label>
                ))}
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                onClick={onNext}
            >
                Generate Cover Letter
            </button>
        </div>
    )
}
