// app/components/StructuredResume.tsx
import React, { useState } from 'react'

interface Section {
    title: string
    content: string
    type: 'heading' | 'bullet' | 'paragraph'
}

interface StructuredResumeProps {
    sections: Section[]
    onChange?: (sections: Section[]) => void
}

export function StructuredResume({ sections: initialSections, onChange }: StructuredResumeProps) {
    // Add state to track which section is being edited
    const [activeSection, setActiveSection] = useState<number | null>(null)

    // Add state to manage sections
    const [sections, setSections] = useState<Section[]>(initialSections)

    // Add state to track which section's add menu is open
    const [showAddMenu, setShowAddMenu] = useState<number | null>(null)

    // Function to handle content changes
    const handleContentChange = (index: number, newContent: string) => {
        const updatedSections = [...sections]
        updatedSections[index] = {
            ...updatedSections[index],
            content: newContent,
        }
        setSections(updatedSections)
        onChange?.(updatedSections)
    }

    // Add bullet point handling
    const handleBulletKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const updatedSections = [...sections]
            updatedSections[index].content += '\n• '
            setSections(updatedSections)
            onChange?.(updatedSections)
        }
    }

    // Add new section after the current one
    const addSection = (index: number, type: Section['type']) => {
        const newSection: Section = {
            title: type === 'heading' ? 'New Heading' : '',
            content: type === 'bullet' ? '• ' : '',
            type,
        }

        const updatedSections = [...sections]
        updatedSections.splice(index + 1, 0, newSection)
        setSections(updatedSections)
        onChange?.(updatedSections)
        setShowAddMenu(null)
    }

    // Delete section
    const deleteSection = (index: number) => {
        const updatedSections = [...sections]
        updatedSections.splice(index, 1)
        setSections(updatedSections)
        onChange?.(updatedSections)
    }

    // Add formatting toolbar component
    const FormattingToolbar = () => {
        const applyFormat = (format: 'bold' | 'italic') => {
            const selection = window.getSelection()
            if (!selection?.rangeCount) return

            const range = selection.getRangeAt(0)
            const span = document.createElement('span')
            span.style.fontWeight = format === 'bold' ? 'bold' : 'normal'
            span.style.fontStyle = format === 'italic' ? 'italic' : 'normal'

            range.surroundContents(span)
        }

        return (
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                    onClick={() => applyFormat('bold')}
                    className="text-gray-500 hover:text-gray-700"
                >
                    B
                </button>
                <button
                    onClick={() => applyFormat('italic')}
                    className="text-gray-500 hover:text-gray-700"
                >
                    I
                </button>
            </div>
        )
    }

    const AddSectionMenu = ({ index }: { index: number }) => (
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button
                onClick={() => setShowAddMenu(showAddMenu === index ? null : index)}
                className="text-blue-500 hover:text-blue-700"
            >
                Add Section
            </button>
            {showAddMenu === index && (
                <div className="absolute right-0 top-8 bg-white shadow-lg rounded-lg p-2 z-10">
                    <button
                        onClick={() => addSection(index, 'heading')}
                        className="block w-full text-left px-1 py-1 hover:bg-blue-50 rounded"
                    >
                        Add Heading
                    </button>
                    <button
                        onClick={() => addSection(index, 'bullet')}
                        className="block w-full text-left px-1 py-1 hover:bg-blue-50 rounded"
                    >
                        Add Bullet List
                    </button>
                    <button
                        onClick={() => addSection(index, 'paragraph')}
                        className="block w-full text-left px-1 py-1 hover:bg-blue-50 rounded"
                    >
                        Add Paragraph
                    </button>
                </div>
            )}
        </div>
    )

    return (
        <div className="space-y-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            {sections.map((section, index) => (
                <div key={index} className="resume-section group relative">
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button
                            onClick={() => deleteSection(index)}
                            className="text-red-500 hover:text-red-700"
                        >
                            Delete
                        </button>
                        <AddSectionMenu index={index} />
                    </div>

                    {section.type === 'heading' && (
                        <div
                            contentEditable
                            suppressContentEditableWarning
                            className={`text-smfont-bold text-blue-700 mb-2 outline-none 
                                ${activeSection === index ? 'ring-2 ring-blue-500' : ''} 
                                hover:bg-blue-50 rounded px-1 py-1`}
                            onBlur={(e) =>
                                handleContentChange(index, e.currentTarget.textContent || '')
                            }
                            onFocus={() => setActiveSection(index)}
                        >
                            {section.title}
                        </div>
                    )}

                    {section.type === 'bullet' && (
                        <div className="relative">
                            <div
                                contentEditable
                                suppressContentEditableWarning
                                className={`list-disc pl-5 space-y-1 min-h-[24px] outline-none 
                                    ${activeSection === index ? 'ring-2 ring-blue-500' : ''} 
                                    hover:bg-blue-50 rounded px-1 py-1`}
                                onBlur={(e) =>
                                    handleContentChange(index, e.currentTarget.textContent || '')
                                }
                                onFocus={() => setActiveSection(index)}
                                onKeyDown={(e) => handleBulletKeyDown(e, index)}
                                onPaste={(e) => {
                                    e.preventDefault()
                                    const text = e.clipboardData.getData('text/plain')
                                    const selection = window.getSelection()
                                    if (selection?.rangeCount) {
                                        const range = selection.getRangeAt(0)
                                        range.deleteContents()
                                        range.insertNode(document.createTextNode(text))
                                    }
                                }}
                            >
                                {section.content.split('\n').map((bullet, i) => (
                                    <div key={i} className="text-gray-700">
                                        {bullet.trim()}
                                    </div>
                                ))}
                            </div>
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={() => {
                                        const updatedSections = [...sections]
                                        updatedSections[index].content += '\n• '
                                        setSections(updatedSections)
                                        onChange?.(updatedSections)
                                    }}
                                    className="text-blue-500 hover:text-blue-700"
                                >
                                    Add Bullet
                                </button>
                                <FormattingToolbar />
                            </div>
                        </div>
                    )}

                    {section.type === 'paragraph' && (
                        <div className="relative">
                            <div
                                contentEditable
                                suppressContentEditableWarning
                                className={`text-gray-700 whitespace-pre-wrap min-h-[24px] outline-none 
                                    ${activeSection === index ? 'ring-2 ring-blue-500' : ''} 
                                    hover:bg-blue-50 rounded px-1 py-1`}
                                onBlur={(e) =>
                                    handleContentChange(index, e.currentTarget.textContent || '')
                                }
                                onFocus={() => setActiveSection(index)}
                                onPaste={(e) => {
                                    e.preventDefault()
                                    const text = e.clipboardData.getData('text/plain')
                                    const selection = window.getSelection()
                                    if (selection?.rangeCount) {
                                        const range = selection.getRangeAt(0)
                                        range.deleteContents()
                                        range.insertNode(document.createTextNode(text))
                                    }
                                }}
                            >
                                {section.content}
                            </div>
                            <FormattingToolbar />
                        </div>
                    )}
                </div>
            ))}

            {/* Add section button at the bottom */}
            <button
                onClick={() => {
                    const newSection: Section = {
                        title: '',
                        content: '',
                        type: 'paragraph',
                    }
                    setSections([...sections, newSection])
                    onChange?.([...sections, newSection])
                }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
                Add Section
            </button>
        </div>
    )
}
