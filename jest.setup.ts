import '@testing-library/jest-dom'

// Mock fetch globally
global.fetch = jest.fn()

// Mock cheerio
jest.mock('cheerio', () => ({
    load: jest.fn(() => ({
        remove: jest.fn(),
        text: jest.fn(),
        html: jest.fn(),
        find: jest.fn(),
        first: jest.fn(),
        length: 0,
    })),
}))
