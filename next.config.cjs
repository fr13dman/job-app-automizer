/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['openai'],
    },
    webpack: (config, { isServer }) => {
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
}

module.exports = nextConfig
