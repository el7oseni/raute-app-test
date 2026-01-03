import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enabled for Capacitor mobile build
  // output: 'export',
};

export default withNextIntl(nextConfig);
