// app/lib/pdfParser.ts
import PDFParser from 'pdf2json'
import logger from './logger'

interface PDFData {
    Pages: Array<{
        Texts: Array<{
            R: Array<{
                T: string
            }>
            y: number
        }>
    }>
}

interface PDFParserError {
    parserError: Error
}

export function validatePDF(file: File): { isValid: boolean; error?: string } {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        logger.debug({
            msg: 'File size: ',
            fileSize: file.size,
        })
        return {
            isValid: false,
            error: 'File size must be less than 5MB Actual size: ' + file.size,
        }
    }

    // Check file type
    if (file.type !== 'application/pdf') {
        return {
            isValid: false,
            error: 'File must be a PDF',
        }
    }

    return { isValid: true }
}

export async function parsePDF(file: File): Promise<{
    text: string
    sections: Array<{
        title: string
        content: string
        type: 'heading' | 'bullet' | 'paragraph'
    }>
}> {
    // Validate file
    const validation = validatePDF(file)
    if (!validation.isValid) {
        throw new Error(validation.error)
    }
    logger.info({
        msg: 'PDF validated',
        file: file,
    })

    try {
        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        // Parse PDF
        const pdfParser = new (PDFParser as unknown as typeof PDFParser)(null, true)

        return new Promise((resolve, reject) => {
            pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
                try {
                    // Extract text from PDF
                    const text = pdfParser
                        .getRawTextContent()
                        .replace(/\r\n/g, '\n')
                        .replace(/\n{3,}/g, '\n\n')
                        .replace(/\_/g, '')
                        .trim()

                    logger.debug({
                        msg: 'Text extracted',
                        text: text,
                    })

                    // Validate extracted text
                    if (!text || text.length < 10) {
                        logger.error({
                            msg: 'PDF appears to be empty or contains no readable text',
                            pdfData,
                        })
                        reject(new Error('PDF appears to be empty or contains no readable text'))
                        return
                    }

                    // Initialize sections array
                    const sections: Array<{
                        title: string
                        content: string
                        type: 'heading' | 'bullet' | 'paragraph'
                    }> = []

                    // Process each page in the PDF
                    pdfData.Pages.forEach((page) => {
                        // Group text elements by their y-position (line)
                        const lines = new Map<number, string>()

                        page.Texts.forEach((text) => {
                            const content = decodeURIComponent(text.R[0].T)
                            const y = text.y

                            // Combine text elements on the same line
                            lines.set(y, (lines.get(y) || '') + content)
                        })

                        // Sort lines by y-position (top to bottom)
                        const sortedLines = Array.from(lines.entries()).map(([, text]) =>
                            text.trim()
                        )

                        // Process lines to create sections
                        let currentSection: {
                            title: string
                            content: string
                            type: 'heading' | 'bullet' | 'paragraph'
                        } | null = null
                        let isInBulletPoint = false
                        let bulletPointLines: string[] = []

                        sortedLines.forEach((line) => {
                            if (!line) return
                            line = line.replace(/\r\n|\r|\n|\_/g, '')

                            // Detect section type
                            if (line.length < 50 && line.toUpperCase() === line) {
                                // Likely a heading (short, all caps)
                                if (currentSection) {
                                    if (isInBulletPoint) {
                                        currentSection.content = bulletPointLines.join(' ')
                                        bulletPointLines = []
                                    }
                                    sections.push(currentSection)
                                }
                                currentSection = {
                                    title: line,
                                    content: '',
                                    type: 'heading',
                                }
                                isInBulletPoint = false
                            } else if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                                // New bullet point
                                if (currentSection) {
                                    if (isInBulletPoint) {
                                        currentSection.content = bulletPointLines.join(' ')
                                        bulletPointLines = []
                                    }
                                    sections.push(currentSection)
                                }
                                // Start new bullet point
                                const bulletContent = line.trim().substring(1).trim()
                                currentSection = {
                                    title: bulletContent,
                                    content: bulletContent,
                                    type: 'bullet',
                                }
                                bulletPointLines = [bulletContent]
                                isInBulletPoint = true
                            } else if (isInBulletPoint && currentSection) {
                                // Collect bullet point lines
                                bulletPointLines.push(line.trim())
                            } else {
                                // Regular paragraph text
                                if (currentSection) {
                                    currentSection.content += ' ' + line
                                    currentSection.type = 'paragraph'
                                }
                                isInBulletPoint = false
                            }
                        })

                        // Handle the last section
                        if (currentSection) {
                            if (isInBulletPoint) {
                                currentSection.content = bulletPointLines.join(' ')
                            }
                            sections.push(currentSection)
                        }
                    })

                    logger.debug({
                        msg: 'Sections extracted',
                        sections: sections,
                    })

                    resolve({
                        text: text,
                        sections: sections.map((section) => ({
                            ...section,
                            content: section.content.trim(),
                        })),
                    })
                } catch (err) {
                    reject(new Error('Failed to extract text from PDF ' + err))
                }
            })

            pdfParser.on('pdfParser_dataError', (errMsg: PDFParserError) => {
                logger.error({
                    msg: 'Error parsing PDF',
                    error: errMsg.parserError,
                })
                reject(new Error('Failed to parse PDF. ' + errMsg.parserError.message))
            })

            // Parse the buffer
            pdfParser.parseBuffer(buffer)
        })
    } catch (err) {
        console.error('Error parsing PDF:', err instanceof Error ? err.message : 'Unknown error')
        throw new Error('Failed to parse PDF. ' + (err as Error).message)
    }
}
