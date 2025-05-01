import type { Metadata } from 'next';
import './globals.css';
import { 
  blancoRegular, 
  blancoItalic, 
  triptychGrotesque, 
  manifoldSansRegular, 
  manifoldSansBold 
} from './fonts';

export const metadata: Metadata = {
  title: 'where everything is music',
  description: 'set sail',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${blancoRegular.variable} ${blancoItalic.variable} ${triptychGrotesque.variable} ${manifoldSansRegular.variable} ${manifoldSansBold.variable} bg-[#F6ECE1] text-[#444]`}>
      <body className="font-manifold-bold min-h-screen flex flex-col">
        <main className="flex-grow">
          {children}
        </main>
        <footer className="flex justify-between max-w-3xl mx-auto space-x-8 mt-auto py-8 text-center text-sm text-[#666]">
          <p>
          *<a className="hover:underline" href="https://www.newarab.com/features/how-islam-was-erased-rumis-poetry">poem by rumi</a>  
        </p>
          <p>made by dhruv</p>
        </footer>
      </body>
    </html>
  );
}
