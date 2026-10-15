/**
 * Minimal layout for embeddable pages (calculators & visuals inside blog posts).
 * No navbar, no footer — just the tool, so iframes stay clean.
 */
export default function EmbedsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600;700;800;900&family=Public+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; font-family: 'Public Sans', Arial, sans-serif; color: #0e1728; background: #fff; }
          h1, h2, h3 { font-family: 'Libre Franklin', Arial, sans-serif; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
