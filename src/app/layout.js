import "./globals.css"; // ✅ Ensures Tailwind loads in all pages

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">{children}</body>
    </html>
  );
}
