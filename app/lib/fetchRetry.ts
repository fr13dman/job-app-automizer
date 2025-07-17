import logger from './logger'

interface RetryConfig {
    maxRetries: number
    initialDelay: number
    maxDelay: number
    timeout: number
}

interface ApiError extends Error {
    status?: number
    code?: string
    isRetryable?: boolean
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    timeout: 30000, // 30 seconds
}

const isRetryableError = (error: ApiError): boolean => {
    logger.debug({
        msg: 'Checking if error is retryable',
        error: error,
    })

    // Network errors are retryable
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        return true
    }

    // 5xx errors are retryable
    if (error.status && error.status >= 500) {
        logger.debug({
            msg: '5xx error, retrying',
            error: error,
        })
        return true
    }

    // Specific error codes that are retryable
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED']
    if (error.code && retryableCodes.includes(error.code)) {
        return true
    }

    return false
}

type ResponseType = 'json' | 'text' | 'html'

interface FetchOptions extends RequestInit {
    responseType?: ResponseType
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const calculateBackoff = (retryCount: number, initialDelay: number, maxDelay: number): number => {
    const backoff = Math.min(initialDelay * Math.pow(2, retryCount), maxDelay)
    logger.info('Retry backoff: ' + backoff)
    // Add some jitter to prevent thundering herd
    return backoff + Math.random() * 1000
}

export async function resilientFetch<T>(
    url: string,
    options: FetchOptions = {},
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
    let lastError: ApiError
    let retryCount = 0

    while (retryCount <= finalConfig.maxRetries) {
        logger.debug({
            msg: 'Retrying fetch',
            url: url,
            options: options,
            config: finalConfig,
            retryCount: retryCount,
        })
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout)

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                const error = new Error(
                    `HTTP error! Try again later. status: ${response.status} ${response.statusText}`
                ) as ApiError
                error.status = response.status
                error.isRetryable = response.status >= 500
                error.message = `HTTP error! Try again later. status: ${response.status} ${response.statusText}`
                logger.error('HTTP error! Try again later. status: ' + response.status)
                throw error
            }

            // Get the content type
            const contentType = response.headers.get('content-type') || ''

            // Determine how to parse the response based on content type and options
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let data: any

            if (options.responseType === 'text' || contentType.includes('text/plain')) {
                data = await response.text()
            } else if (options.responseType === 'html' || contentType.includes('text/html')) {
                data = await response.text()
            } else if (contentType.includes('application/json')) {
                try {
                    data = await response.json()
                } catch (e) {
                    // If JSON parsing fails, try to get the text content
                    data = await response.text()
                    logger.warn({
                        msg: 'Failed to parse JSON response, returning text instead',
                        error: e instanceof Error ? e.message : 'Unknown error',
                    })
                }
            } else {
                // Default to text if content type is unknown
                data = await response.text()
            }

            return data as T
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                logger.error('Fetch request aborted due to timeout')
                throw new Error('Fetch request aborted due to timeout')
            }

            lastError = error as ApiError

            // Don't retry if it's not a retryable error
            if (!isRetryableError(lastError)) {
                logger.error('Non-retryable error: ' + lastError.message)
                throw lastError
            }

            // Don't retry if we've hit the max retries
            if (retryCount === finalConfig.maxRetries) {
                logger.error('Max retries reached. Throwing error: ' + lastError.message)
                throw lastError
            }

            // Calculate backoff delay
            const backoffDelay = calculateBackoff(
                retryCount,
                finalConfig.initialDelay,
                finalConfig.maxDelay
            )

            // Log retry attempt
            logger.warn({
                msg: `Retry attempt ${retryCount + 1}/${
                    finalConfig.maxRetries
                } after ${backoffDelay}ms`,
                error: lastError.message,
            })

            // Wait before retrying
            logger.info('Waiting for ' + backoffDelay + 'ms before retrying')
            await delay(backoffDelay)
            retryCount++
        }
    }

    throw lastError!
}
