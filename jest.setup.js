// import '@testing-library/jest-dom'

global.Request = class Request {
    constructor(url, init = {}) {
        this.url = url
        this.method = init.method || 'GET'
        this.body = init.body
    }

    async json() {
        return JSON.parse(this.body)
    }
}

global.Response = class Response {
    constructor(body, init = {}) {
        this.body = body
        this.status = init.status || 200
    }

    async json() {
        return JSON.parse(this.body)
    }
}

// Add any global test setup here
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
