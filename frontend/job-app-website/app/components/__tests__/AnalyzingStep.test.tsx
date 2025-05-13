import React from 'react'
import { render, screen } from '@testing-library/react'
import AnalyzingStep from '../AnalyzingStep'
import '@testing-library/jest-dom'

describe('AnalyzingStep', () => {
    // This test verifies that the AnalyzingStep component renders the expected analyzing message.
    it('renders the component', () => {
        render(<AnalyzingStep />)
        expect(screen.getAllByText(/analyzing your resume and job requirements/i)).toHaveLength(1)
    })
})
