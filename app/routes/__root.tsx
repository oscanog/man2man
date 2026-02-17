import { useEffect } from 'react'
import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ConvexProvider } from 'convex/react'

import Header from '../components/Header'
import { PWAMeta } from '../components/PWAMeta'
import { useServiceWorker } from '../hooks/useServiceWorker'
import convex from '../lib/convex'
import appCss from '../styles/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
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
})

function RootDocument() {
  // Register service worker on mount
  const { register } = useServiceWorker()

  useEffect(() => {
    // Register service worker
    register()
  }, [register])

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <PWAMeta />
      </head>
      <body>
        <ConvexProvider client={convex}>
          <Header />
          <Outlet />
        </ConvexProvider>
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
        <Scripts />
      </body>
    </html>
  )
}
