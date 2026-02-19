import { useEffect } from 'react'
import { HeadContent, Link, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { PWAMeta } from '../components/PWAMeta'
import { usePresenceHeartbeat } from '../hooks/usePresenceHeartbeat'
import { useServiceWorker } from '../hooks/useServiceWorker'
import appCss from '../styles/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      },
      {
        name: 'theme-color',
        content: '#0A1628',
      },
      {
        title: 'Man2Man Location Sharing',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootDocument() {
  // Register service worker on mount
  const { register } = useServiceWorker()
  usePresenceHeartbeat()

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    if (import.meta.env.PROD) {
      void register()
      return
    }

    // In development, remove any old SW to avoid stale cached UI/assets.
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    })
  }, [register])

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <PWAMeta />
      </head>
      <body className="bg-navy-900 text-white antialiased">
        <div className="max-w-[430px] mx-auto min-h-screen bg-[#0A1628]">
          <Outlet />
        </div>
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}

function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-[#FF035B]">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-white">Page not found</h1>
      <p className="mt-2 max-w-sm text-white/70">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex rounded-lg bg-[#FF035B] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Go to home
      </Link>
    </main>
  )
}
