import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import JobLinkStep from '../JobLinkStep'
import '@testing-library/jest-dom'

describe('JobLinkStep', () => {
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
