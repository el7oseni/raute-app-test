import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for Capacitor/mobile builds
  ...(process.env.NEXT_PUBLIC_CAPACITOR_BUILD === 'true' && { output: 'export' }),
  images: { unoptimized: true },
  trailingSlash: true, // Required for reliable Capacitor routing (login/index.html)
};

export default withNextIntl(nextConfig);
