import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/tanstack-circle-logo.png"
            alt="TanStack Logo"
            className="w-8 h-8"
          />
          <span className="text-xl font-bold text-white">TanStack Start</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="text-gray-300 hover:text-white transition-colors"
            activeProps={{ className: 'text-cyan-400' }}
          >
            Home
          </Link>
          <a
            href="https://tanstack.com/start"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Docs
          </a>
        </nav>
      </div>
    </header>
  )
}
