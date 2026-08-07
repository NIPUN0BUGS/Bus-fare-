/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@buslanka/ui', '@buslanka/shared-types'],
};
