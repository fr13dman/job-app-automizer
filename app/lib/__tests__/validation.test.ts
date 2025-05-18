import { validateInput } from '../validation'

describe('validateInput', () => {
    it('should return true for a valid input', () => {
        expect(validateInput('test input').isValid).toBe(true)
    })

    it('should return false for an invalid input', () => {
        expect(validateInput('').isValid).toBe(false)
    })

    it('should return false for an input that is too long', () => {
        expect(validateInput('a'.repeat(15001)).isValid).toBe(false)
    })

    it('should return false for an input that contains malicious content', () => {
        expect(validateInput('<script>alert("XSS")</script>').isValid).toBe(false)
    })

    it('should return false for an input that contains too many special characters', () => {
        expect(validateInput('!@#$%^&*()_+-=[]{}|;:,.<>?~`').isValid).toBe(false)
    })

    it('should return false for an input that contains special characters but within a valid range', () => {
        expect(
            validateInput('test input with special characters: !@#$%^&*()_+-=[]{}|;:,.<>?~`')
                .isValid
        ).toBe(false)
    })
})
