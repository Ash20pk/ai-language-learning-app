/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'microphone=(), camera=()',
          },
        ],
        images: {
          domains: ['oaidalleapiprodscus.blob.core.windows.net'],
        },
      },
    ];
  },
};

export default nextConfig;
