/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'microphone=self',
          },
        ],
      },
    ];
  },
  images: {
    domains: ['oaidalleapiprodscus.blob.core.windows.net'],
  },
};

module.exports = nextConfig;
