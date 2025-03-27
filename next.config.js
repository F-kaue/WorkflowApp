/** @type {import('next').NextConfig} */
const nextConfig = {
  // Otimizações experimentais
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', '@radix-ui/react-dialog'],
    serverActions: {
      bodySizeLimit: '2mb',
    }
  },
  // Otimizações de imagens
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Otimizações de compilação
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Otimizações de cache
  poweredByHeader: false,
  reactStrictMode: true,
  // Configuração do webpack para lidar com módulos Node.js
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Configuração para módulos Node.js no lado do cliente
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        http: false,
        https: false,
        http2: false,
        stream: false,
        crypto: false,
        os: false,
        path: false,
        zlib: false,
        child_process: false,
        events: require.resolve('events')
      };
      
      // Adiciona tratamento específico para módulos com prefixo 'node:'
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:events': 'events',
        'node:fs': false,
        'node:path': false,
        'node:crypto': false,
        'node:stream': false,
        'node:util': false,
        'node:url': false,
        'node:http': false,
        'node:https': false,
        'node:http2': false,
        'node:zlib': false,
        'node:os': false,
        'node:buffer': false
      };
    }
    return config;
  },

}

module.exports = nextConfig