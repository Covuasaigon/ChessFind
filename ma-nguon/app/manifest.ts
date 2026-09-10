import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ChessFind',
    short_name: 'ChessFind',
    description: 'Nền tảng tra cứu giải đấu cờ vua',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f8fd',
    theme_color: '#173e6d',
    icons: [
      {
        src: '/company-logo.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}
