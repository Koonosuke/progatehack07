import "./globals.css";
export const metadata = {
  title: "Sign Chat",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}

