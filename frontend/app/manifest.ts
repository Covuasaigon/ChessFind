import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChessFind",
    short_name: "ChessFind",
    description: "Tra cứu kết quả giải đấu cờ vua",
    start_url: "/",
    display: "standalone"
  };
}
