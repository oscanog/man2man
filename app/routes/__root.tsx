import { useEffect } from 'react'
import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { PWAMeta } from '../components/PWAMeta'
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
})

function RootDocument() {
  // Register service worker on mount
  const { register } = useServiceWorker()

  useEffect(() => {
    register()
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
