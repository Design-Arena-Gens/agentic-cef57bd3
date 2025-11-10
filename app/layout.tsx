export const metadata = {
  title: "Organizator dnia ? Agent",
  description: "Inteligentny planer dnia (offline-first)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <div className="container">
          <header className="header">
            <div className="title">Organizator dnia ? Agent</div>
            <div className="badge">Lokalny, prywatny, bez chmury</div>
          </header>
          {children}
          <div className="footer">? {new Date().getFullYear()} Tw?j agent dnia</div>
        </div>
      </body>
    </html>
  );
}

import "./globals.css";
