// app/lib/pdfParser.ts
import PDFParser from 'pdf2json'
import logger from './logger'

// Use the actual types from pdf2json library
type PDFText = {
    R: Array<{
        T: string
        S?: number
        TS?: number[]
    }>
    x: number
    y: number
    w: number
    clr?: number
    A?: string
    S?: number
    TS?: number[]
}

type PDFPage = {
    Texts: PDFText[]
}

type PDFOutput = {
    Pages: PDFPage[]
}

interface PDFParserError {
    parserError: Error
}

interface LineInfo {
    text: string
    fontSize: number
    x: number
    y: number
    isBold?: boolean
    isItalic?: boolean
}

// Define the section type
type Section = {
    title: string
    content: string
    type: 'heading' | 'bullet' | 'paragraph'
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
    sections: Array<Section>
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
            pdfParser.on('pdfParser_dataReady', (pdfData: PDFOutput) => {
                try {
                    // Extract text from PDF and filter out page breaks
                    let text = pdfParser
                        .getRawTextContent()
                        .replace(/\r\n/g, '\n')
                        .replace(/\n{3,}/g, '\n\n')
                        .replace(/\_/g, '')
                        .trim()

                    // Filter out page break markers from the raw text
                    const pageBreakPatterns = [
                        /^-+Page\s*\(\d+\)\s*Break-+$/gm,
                        /^-+Page\s*Break-+$/gm,
                        /^-+Page\s*\d+-+$/gm,
                        /^Page\s*\d+$/gm,
                        /^-+$/gm,
                        /^Page\s*Break$/gm,
                    ]

                    pageBreakPatterns.forEach((pattern) => {
                        text = text.replace(pattern, '')
                    })

                    // Clean up any extra whitespace that might be left
                    text = text.replace(/\n\s*\n\s*\n/g, '\n\n').trim()

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
                    const sections: Section[] = []

                    // Process each page in the PDF
                    pdfData.Pages.forEach((page) => {
                        // Group text elements by their y-position (line) with font information
                        const lines = new Map<number, LineInfo[]>()

                        page.Texts.forEach((textElement) => {
                            const content = decodeURIComponent(textElement.R[0].T)
                            const y = textElement.y // Keep original y value without rounding
                            const x = textElement.x

                            // Try different ways to get font size
                            let fontSize = 12 // Default fallback

                            // Method 1: Check if font size is at the element level
                            if (textElement.S && textElement.S > 0) {
                                fontSize = textElement.S
                            }
                            // Method 2: Check if font size is in the R array
                            else if (textElement.R[0].S && textElement.R[0].S > 0) {
                                fontSize = textElement.R[0].S
                            }
                            // Method 3: Check if font size is in TS array at element level
                            else if (textElement.TS && textElement.TS[1] && textElement.TS[1] > 0) {
                                fontSize = textElement.TS[1]
                            }
                            // Method 4: Check if font size is in TS array in R
                            else if (
                                textElement.R[0].TS &&
                                textElement.R[0].TS[1] &&
                                textElement.R[0].TS[1] > 0
                            ) {
                                fontSize = textElement.R[0].TS[1]
                            }
                            // Method 5: Use width as a proxy for font size if available (since h is not available)
                            else if (textElement.w && textElement.w > 0) {
                                fontSize = textElement.w
                            }

                            // Ensure font size is positive
                            fontSize = Math.abs(fontSize)

                            // Check if text is bold or italic (you may need to adjust based on your PDF structure)
                            const isBold = textElement.R[0].TS?.[0] === 1 // Adjust based on your font mapping
                            const isItalic = textElement.R[0].TS?.[0] === 2 // Adjust based on your font mapping

                            const lineInfo: LineInfo = {
                                text: content,
                                fontSize,
                                x,
                                y,
                                isBold,
                                isItalic,
                            }

                            if (!lines.has(y)) {
                                lines.set(y, [])
                            }
                            lines.get(y)!.push(lineInfo)
                        })

                        // Sort lines by y-position (top to bottom) and combine text on same line
                        const sortedLines = Array.from(lines.entries())
                            .sort(([y1], [y2]) => y1 - y2) // Sort by y position (top to bottom) - no reversal
                            .map(([y, lineInfos]) => {
                                // Sort text elements by x position (left to right)
                                lineInfos.sort((a, b) => a.x - b.x)

                                // Combine text and get the dominant font size for the line
                                const combinedText = lineInfos.map((info) => info.text).join('')
                                const dominantFontSize = Math.max(
                                    ...lineInfos.map((info) => info.fontSize)
                                )
                                const isBold = lineInfos.some((info) => info.isBold)

                                return {
                                    text: combinedText.trim(),
                                    fontSize: dominantFontSize,
                                    isBold,
                                    y,
                                }
                            })
                            .filter((line) => {
                                // Filter out page break markers and other unwanted text
                                const pageBreakPatterns = [
                                    /^-+Page\s*\(\d+\)\s*Break-+$/,
                                    /^-+Page\s*Break-+$/,
                                    /^-+Page\s*\d+-+$/,
                                    /^Page\s*\d+$/,
                                    /^-+$/,
                                    /^Page\s*Break$/,
                                ]

                                return !pageBreakPatterns.some((pattern) =>
                                    pattern.test(line.text.trim())
                                )
                            })

                        // Calculate font size statistics to determine thresholds
                        const fontSizes = sortedLines.map((line) => line.fontSize)
                        const avgFontSize = fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length
                        const maxFontSize = Math.max(...fontSizes)
                        const minFontSize = Math.min(...fontSizes)

                        // Define thresholds for headings
                        const headingFontSizeThreshold = avgFontSize * 1.2 // 20% larger than average
                        const largeHeadingFontSizeThreshold = avgFontSize * 1.5 // 50% larger than average

                        logger.debug({
                            msg: 'Font size analysis',
                            avgFontSize,
                            maxFontSize,
                            minFontSize,
                            headingFontSizeThreshold,
                            largeHeadingFontSizeThreshold,
                        })

                        // Process lines to create sections
                        let currentSection: Section | null = null
                        let isInBulletPoint = false
                        let bulletPointLines: string[] = []

                        sortedLines.forEach((line) => {
                            if (!line.text) return
                            const cleanText = line.text.replace(/\r\n|\r|\n|\_/g, '')

                            // Detect headings based on font size and other characteristics
                            // PRIORITY: Bold text is ALWAYS a heading
                            const isHeading =
                                line.isBold ||
                                line.fontSize >= headingFontSizeThreshold ||
                                (cleanText.length < 100 &&
                                    cleanText.toUpperCase() === cleanText &&
                                    line.fontSize >= avgFontSize) ||
                                (cleanText.length < 50 && line.fontSize >= avgFontSize * 1.1)

                            // Detect bullet points (but not if it's bold)
                            const bulletPatterns = [
                                /^[•·▪▫◦‣⁃]/,
                                /^[-–—]/,
                                /^[a-zA-Z]\)/,
                                /^[0-9]+\./,
                                /^[a-zA-Z]\./,
                                /^→/,
                                /^▶/,
                                /^▸/,
                                /^▪/,
                                /^▫/,
                            ]

                            const isBulletPoint =
                                !line.isBold &&
                                bulletPatterns.some((pattern) => pattern.test(cleanText.trim()))

                            if (isHeading) {
                                // New heading detected - always create a new section
                                if (currentSection) {
                                    if (isInBulletPoint) {
                                        currentSection.content = bulletPointLines.join(' ')
                                        bulletPointLines = []
                                    }
                                    sections.push(currentSection)
                                }
                                currentSection = {
                                    title: cleanText,
                                    content: cleanText,
                                    type: 'heading',
                                }
                                isInBulletPoint = false
                            } else if (isBulletPoint) {
                                // New bullet point detected (only if not bold)
                                if (currentSection) {
                                    if (isInBulletPoint) {
                                        currentSection.content = bulletPointLines.join(' ')
                                        bulletPointLines = []
                                    }
                                    sections.push(currentSection)
                                }

                                // Extract bullet content (remove bullet symbol)
                                const bulletContent = cleanText
                                    .replace(/^[•·▪▫◦‣⁃\-\–—→▶▸▪▫]\s*/, '')
                                    .replace(/^[a-zA-Z0-9]+[\)\.]\s*/, '')

                                currentSection = {
                                    title: bulletContent,
                                    content: bulletContent,
                                    type: 'bullet',
                                }
                                bulletPointLines = [bulletContent]
                                isInBulletPoint = true
                            } else if (isInBulletPoint && currentSection && !line.isBold) {
                                // Continue bullet point content - this line is part of the current bullet point
                                // BUT only if it's not bold (bold text breaks out of bullet points)
                                bulletPointLines.push(cleanText)
                                // Update the current section content to include this line
                                if (currentSection) {
                                    currentSection.content = bulletPointLines.join(' ')
                                }
                            } else {
                                // Regular paragraph text (or bold text that's not a heading)
                                if (currentSection) {
                                    currentSection.content += ' ' + cleanText
                                    currentSection.type = 'paragraph'
                                } else {
                                    // Start a new paragraph section if none exists
                                    currentSection = {
                                        title:
                                            cleanText.substring(0, 50) +
                                            (cleanText.length > 50 ? '...' : ''),
                                        content: cleanText,
                                        type: 'paragraph',
                                    }
                                }
                                isInBulletPoint = false
                            }
                        })

                        // Handle the last section
                        // if (currentSection !== null) {
                        //     if (isInBulletPoint && currentSection.content) {
                        //         currentSection.content = bulletPointLines.join(' ')
                        //     }
                        //     sections.push(currentSection)
                        // }
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
                    reject(new Error('Failed to extract text from PDF Error: ' + err))
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
