import localFont from 'next/font/local';

export const blancoRegular = localFont({
  src: '../assets/fonts/Blanco-Regular.woff2',
  variable: '--font-blanco-regular',
});

export const blancoItalic = localFont({
  src: '../assets/fonts/Blanco-Italic.woff2',
  variable: '--font-blanco-italic',
});

export const triptychGrotesque = localFont({
  src: '../assets/fonts/Triptych-Grotesque.woff',
  variable: '--font-triptych',
});

export const manifoldSansRegular = localFont({
  src: '../assets/fonts/Manifold_Sans-Regular.woff2',
  variable: '--font-manifold-regular',
});

export const manifoldSansBold = localFont({
  src: '../assets/fonts/Manifold_Sans-Bold.woff2',
  variable: '--font-manifold-bold',
}); 