import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import StartStep from '../StartStep'
import '@testing-library/jest-dom'

describe('StartStep', () => {
    it('renders and calls onStart when button is clicked', () => {
        const onStart = jest.fn()
        render(<StartStep onStart={onStart} />)
        expect(screen.getByText(/generate a personalized cover letter/i)).toBeInTheDocument()
        fireEvent.click(screen.getByText(/get started/i))
        expect(onStart).toHaveBeenCalledTimes(1)
    })
})
