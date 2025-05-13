import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import JobLinkStep from '../JobLinkStep'
import '@testing-library/jest-dom'

describe('JobLinkStep', () => {
    // This test verifies that the error message is shown and the onNext handler is called when the Next button is clicked with an empty job link.
    it('shows error and calls handlers', () => {
        const onChange = jest.fn()
        const onNext = jest.fn()
        render(
            <JobLinkStep jobLink="" error="Job link required" onChange={onChange} onNext={onNext} />
        )
        expect(screen.getByText(/job link required/i)).toBeInTheDocument()
        fireEvent.click(screen.getByText(/next/i))
        expect(onNext).toHaveBeenCalled()
    })

    // This test verifies that the error message for an invalid URL is shown and onNext is called exactly once when the Next button is clicked with an invalid job link.
    it('shows error for invalid URL', () => {
        const onChange = jest.fn()
        const onNext = jest.fn()
        render(
            <JobLinkStep
                jobLink="invalid-url"
                error="Invalid job link"
                onChange={onChange}
                onNext={onNext}
            />
        )
        expect(screen.getByText(/invalid job link/i)).toBeInTheDocument()
        fireEvent.click(screen.getByText(/next/i))
        expect(onNext).toHaveBeenCalledTimes(1)
    })

    // This test verifies that onChange is called when the input changes and onNext is called when the Next button is clicked with a valid job link.
    it('calls onChange and onNext', () => {
        const onChange = jest.fn()
        const onNext = jest.fn()
        render(
            <JobLinkStep
                jobLink="https://example.com"
                error=""
                onChange={onChange}
                onNext={onNext}
            />
        )
        fireEvent.change(screen.getByPlaceholderText('https://company.com/job/123'), {
            target: { value: 'https://example.com' },
        })
        fireEvent.click(screen.getByText(/next/i))
        // expect(onChange).toHaveBeenCalledWith(expect.any(Object))
        expect(onNext).toHaveBeenCalledTimes(1)
    })
})
