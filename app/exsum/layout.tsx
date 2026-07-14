import { Barlow_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./exsum.css";

// Font persis sama dengan exsum-framework-wege.html (sumber desain), tapi
// lewat next/font/google (self-hosted, di-preload) - bukan <link> Google
// Fonts runtime seperti file sumbernya, pola sama dengan app/layout.tsx.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-disp",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export default function ExsumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${barlowCondensed.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      {children}
    </div>
  );
}
