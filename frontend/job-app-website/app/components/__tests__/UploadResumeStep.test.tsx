import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import UploadResumeStep from '../UploadResumeStep'
import '@testing-library/jest-dom'

describe('UploadResumeStep', () => {
    // This test verifies that the error message is shown and the onNext handler is called when the Next button is clicked with no resume selected.
    it('shows error and calls handlers', () => {
        const onUpload = jest.fn()
        const onNext = jest.fn()
        render(
            <UploadResumeStep
                resume={null}
                error="Resume required"
                onUpload={onUpload}
                onNext={onNext}
            />
        )
        expect(screen.getByText(/resume required/i)).toBeInTheDocument()
        fireEvent.click(screen.getByText(/next/i))
        expect(onNext).toHaveBeenCalled()
    })
})
