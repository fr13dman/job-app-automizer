import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    serverExternalPackages: ['openai', 'pdf2json'],
    webpack: (config, { isServer }) => {
        // Handle pdf2json
        config.module.rules.push({
            test: /pdf2json/,
            use: {
                loader: 'null-loader',
            },
        })

        if (isServer) {
            // Handle server-side worker files
            config.module.rules.push({
                test: /\.worker\.(js|ts)$/,
                use: {
                    loader: 'null-loader',
                },
            })
        }

        // Handle client-side worker files
        if (!isServer) {
            config.module.rules.push({
                test: /\.worker\.(js|ts)$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        filename: 'static/[hash].worker.js',
                        publicPath: '/_next/',
                    },
                },
            })
        }

        return config
    },
    /* config options here */
    distDir: '.next',
    basePath: '',
}

export default nextConfig
