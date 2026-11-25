import type { Metadata, Viewport } from 'next';
import './globals.css';
import './site-themes.css';
import {brand} from '@/lib/brand.mjs';
export const metadata: Metadata = {
  title: `${brand.name}｜初等統計練習`,
  description: brand.description,
  applicationName: brand.name,
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      {url:`${brand.iconPrefix}-favicon-32.png`,type:'image/png',sizes:'32x32'},
      {url:`${brand.iconPrefix}-favicon-16.png`,type:'image/png',sizes:'16x16'},
      {url:'/favicon.ico',sizes:'16x16 32x32 48x48'},
    ],
    apple: [{url:`${brand.iconPrefix}-apple-touch-icon.png`,sizes:'180x180',type:'image/png'}],
  },
  appleWebApp: {capable:true,title:brand.name,statusBarStyle:'default'},
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: brand.themeColor };
const RootLayout = ({ children }: Readonly<{children: React.ReactNode}>) => (
  <html lang="zh-Hant" data-app-version={process.env.NEXT_PUBLIC_APP_VERSION}><body>{children}</body></html>
);
export default RootLayout;
