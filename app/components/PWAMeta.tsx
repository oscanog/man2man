import { HeadContent } from '@tanstack/react-router';

interface PWAMetaProps {
  title?: string;
  description?: string;
  themeColor?: string;
  statusBarStyle?: 'default' | 'black' | 'black-translucent';
}

export function PWAMeta({
  title = 'Man2Man Location Sharing',
  description = 'Real-time location sharing app for staying connected with friends and family',
  themeColor = '#FF035B',
  statusBarStyle = 'black-translucent',
}: PWAMetaProps) {
  const meta = [
    // Basic meta tags
    {
      charSet: 'utf-8',
    },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover',
    },
    {
      title: title,
    },
    {
      name: 'description',
      content: description,
    },
    
    // Theme colors
    {
      name: 'theme-color',
      content: themeColor,
    },
    {
      name: 'msapplication-TileColor',
      content: themeColor,
    },
    
    // Apple iOS PWA meta tags
    {
      name: 'apple-mobile-web-app-capable',
      content: 'yes',
    },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      content: statusBarStyle,
    },
    {
      name: 'apple-mobile-web-app-title',
      content: title,
    },
    
    // Microsoft Windows PWA meta tags
    {
      name: 'msapplication-TileImage',
      content: '/icons/icon-144x144.png',
    },
    {
      name: 'msapplication-config',
      content: '/browserconfig.xml',
    },
    
    // Open Graph / Social sharing
    {
      property: 'og:type',
      content: 'website',
    },
    {
      property: 'og:title',
      content: title,
    },
    {
      property: 'og:description',
      content: description,
    },
    {
      property: 'og:image',
      content: '/icons/icon-512x512.png',
    },
    {
      property: 'og:site_name',
      content: 'Man2Man',
    },
    
    // Twitter Card
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: title,
    },
    {
      name: 'twitter:description',
      content: description,
    },
    {
      name: 'twitter:image',
      content: '/icons/icon-512x512.png',
    },
  ];

  const links = [
    // PWA manifest
    {
      rel: 'manifest',
      href: '/manifest.json',
    },
    
    // Favicon
    {
      rel: 'icon',
      type: 'image/x-icon',
      href: '/favicon.ico',
    },
    {
      rel: 'shortcut icon',
      type: 'image/x-icon',
      href: '/favicon.ico',
    },
    
    // Apple touch icons
    {
      rel: 'apple-touch-icon',
      sizes: '57x57',
      href: '/icons/icon-72x72.png',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '60x60',
      href: '/icons/icon-72x72.png',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '72x72',
      href: '/icons/icon-72x72.png',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '76x76',
      href: '/icons/icon-96x96.png',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '114x114',
      href: '/icons/icon-128x128.png',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '120x120',
      href: '/icons/icon-128x128.png',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '144x144',
      href: '/icons/icon-144x144.png',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '152x152',
      href: '/icons/icon-152x152.png',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/icons/icon-192x192.png',
    },
    
    // Mask icon for Safari pinned tabs
    {
      rel: 'mask-icon',
      href: '/icons/safari-pinned-tab.svg',
      color: themeColor,
    },
  ];

  return (
    <>
      {/* @ts-expect-error - HeadContent accepts meta and links arrays */}
      <HeadContent meta={meta} links={links} />
    </>
  );
}

// Alternative: Hook-based approach for use in route head configuration
export function createPWAMeta({
  title = 'Man2Man Location Sharing',
  description = 'Real-time location sharing app for staying connected with friends and family',
  themeColor = '#FF035B',
  statusBarStyle = 'black-translucent',
}: PWAMetaProps = {}) {
  return {
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover',
      },
      {
        title: title,
      },
      {
        name: 'description',
        content: description,
      },
      {
        name: 'theme-color',
        content: themeColor,
      },
      {
        name: 'msapplication-TileColor',
        content: themeColor,
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: statusBarStyle,
      },
      {
        name: 'apple-mobile-web-app-title',
        content: title,
      },
      {
        name: 'msapplication-TileImage',
        content: '/icons/icon-144x144.png',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:title',
        content: title,
      },
      {
        property: 'og:description',
        content: description,
      },
    ],
    links: [
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/icons/icon-192x192.png',
      },
    ],
  };
}

export default PWAMeta;
