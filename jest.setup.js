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
