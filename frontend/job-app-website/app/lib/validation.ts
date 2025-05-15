// lib/validation.ts
export const validateInput = (input: string): { isValid: boolean; error?: string } => {
    // 1. Check for empty or whitespace-only input
    if (!input || input.trim().length === 0) {
        return { isValid: false, error: 'Input cannot be empty' }
    }

    // 2. Check maximum length
    const MAX_LENGTH = 15000 // Adjust based on your needs
    if (input.length > MAX_LENGTH) {
        return {
            isValid: false,
            error: `Input exceeds maximum length of ${MAX_LENGTH} characters`,
        }
    }

    // 3. Check for malicious patterns
    const maliciousPatterns = [
        /<script.*?>.*?<\/script>/i, // Script tags
        /javascript:/i, // JavaScript protocol
        /on\w+\s*=/i, // Event handlers
        /data:/i, // Data URLs
        /vbscript:/i, // VBScript
        /expression\s*\(/i, // CSS expressions
        /eval\s*\(/i, // Eval function
        /document\./i, // Document object
        /window\./i, // Window object
        /localStorage/i, // Local storage
        /sessionStorage/i, // Session storage
        /cookie/i, // Cookies
        /fetch\s*\(/i, // Fetch API
        /XMLHttpRequest/i, // XHR
        /\.innerHTML/i, // InnerHTML
        /\.outerHTML/i, // OuterHTML
        /\.insertAdjacentHTML/i, // InsertAdjacentHTML
    ]

    for (const pattern of maliciousPatterns) {
        if (pattern.test(input)) {
            return {
                isValid: false,
                error: 'Input contains potentially malicious content',
            }
        }
    }

    // 4. Check for excessive special characters
    const specialCharRatio = (input.match(/[^a-zA-Z0-9\s.,!?-]/g) || []).length / input.length
    if (specialCharRatio > 0.3) {
        // 30% threshold
        return {
            isValid: false,
            error: 'Input contains too many special characters',
        }
    }

    // 5. Check for repeated characters (potential spam)
    const repeatedChars = input.match(/(.)\1{10,}/g) // 10+ repeated characters
    if (repeatedChars) {
        return {
            isValid: false,
            error: 'Input contains suspicious patterns',
        }
    }

    return { isValid: true }
}
