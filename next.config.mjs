const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://roast.owlchainlabs.xyz").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // send visitors of the default vercel address to the real domain,
  // so shared links and previews always use one address
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "wallet-roast-zeta.vercel.app" }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
