import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import '@testing-library/jest-dom'
import Home from '../page'

// Mock the generateCoverLetter function
// jest.mock('../lib/api', () => ({
//     generateCoverLetter: jest.fn(),
// }))

describe('Cover Letter Generator Page', () => {
    const mockCoverLetter = 'Generated cover letter content'

    beforeEach(() => {
        // Reset the fetch function
        global.fetch = jest.fn()
        render(<Home />)
    })

    afterEach(() => {
        jest.restoreAllMocks()
        jest.clearAllMocks()
    })

    it('should render all main components', () => {
        expect(screen.getByText('Cover Letter Generator')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Paste your resume content here...')).toBeInTheDocument()
        expect(
            screen.getByPlaceholderText('Paste the job link or description here...')
        ).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /generate cover letter/i })).toBeInTheDocument()
        expect(screen.getByRole('combobox')).toBeInTheDocument() // Tone selector
    })

    it('should switch between text and file input modes', async () => {
        const user = userEvent.setup()
        const fileButton = screen.getByText('Upload File')
        const textButton = screen.getByText('Paste Text')

        await user.click(fileButton)
        expect(screen.getByRole('button', { name: 'Upload File' })).toHaveClass('bg-blue-500')

        await user.click(textButton)
        expect(screen.getByRole('button', { name: 'Paste Text' })).toHaveClass('bg-blue-500')
    })

    it('should show error when submitting without required fields', async () => {
        const user = userEvent.setup()
        const generateButton = screen.getByRole('button', { name: /generate cover letter/i })

        await user.click(generateButton)

        expect(
            screen.getByText('Please provide all required information and select a tone.')
        ).toBeInTheDocument()
    })

    it('should generate a cover letter successfully', async () => {
        const user = userEvent.setup()

        // Mock successful API response
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, coverLetter: mockCoverLetter }),
        })

        // Fill in required fields
        const resumeInput = screen.getByPlaceholderText('Paste your resume content here...')
        const jobInput = screen.getByPlaceholderText('Paste the job link or description here...')
        const toneSelect = screen.getByRole('combobox')

        await user.type(resumeInput, 'Test resume')
        await user.type(jobInput, 'Test job description')
        await user.selectOptions(toneSelect, 'professional')

        // Click generate button
        const generateButton = screen.getByRole('button', { name: /generate cover letter/i })
        await user.click(generateButton)

        // Wait for the cover letter to appear
        await waitFor(() => {
            expect(screen.getByText(mockCoverLetter)).toBeInTheDocument()
        })
    })

    it('should show error message on API failure', async () => {
        const user = userEvent.setup()

        // Mock failed API response
        // global.fetch = jest.fn().mockResolvedValueOnce({
        //     ok: true,
        //     json: async () => ({
        //         success: false,
        //         error: 'API Error',
        //         message: 'Network response was not ok',
        //     }),
        // })

        // global.fetch = jest.fn().mockRejectedValueOnce({
        //     success: false,
        //     error: 'API Error',
        //     message: 'Network response was not ok',
        // })

        global.fetch = jest.fn().mockImplementation(() =>
            Promise.reject({
                success: false,
                error: 'API Error',
                message: 'Network response was not ok',
            })
        )

        // Fill in required fields
        const resumeInput = screen.getByPlaceholderText('Paste your resume content here...')
        const jobInput = screen.getByPlaceholderText('Paste the job link or description here...')
        const toneSelect = screen.getByRole('combobox')

        await user.type(resumeInput, 'Test resume')
        await user.type(jobInput, 'Test job description')
        await user.selectOptions(toneSelect, 'professional')

        // Click generate button
        const generateButton = screen.getByRole('button', { name: /generate cover letter/i })
        await user.click(generateButton)

        // Wait for error message
        await waitFor(() => {
            expect(screen.getByText('An unknown error occurred')).toBeInTheDocument()
        })
    })
})
