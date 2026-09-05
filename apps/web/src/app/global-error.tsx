'use client'

/**
 * Global error boundary — root fallback when the entire app fails.
 *
 * Because this is the outermost boundary, it must render its own
 * <html> and <body> tags so the browser always receives valid markup.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap"
          rel="stylesheet"
        />
        <style>{`
          body {
            margin: 0;
            background: #0d0d2b;
            color: #e8d5b7;
            font-family: 'Press Start 2P', monospace;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
          }
          .container { padding: 2rem; max-width: 480px; }
          h1 { font-size: 1rem; margin-bottom: 1rem; color: #ffd700; }
          p { font-family: 'VT323', monospace; font-size: 1.25rem; color: #e8d5b7aa; margin-bottom: 1.5rem; }
          button {
            background: #7b5ea733;
            border: 2px solid #ffd70066;
            color: #e8d5b7;
            font-family: 'Press Start 2P', monospace;
            font-size: 0.6rem;
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
          }
          button:hover { background: #7b5ea755; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>Critical Failure</h1>
          <p>The game engine encountered a fatal error and could not recover.</p>
          {error.digest && (
            <p style={{ fontSize: '1rem', color: '#6b7280' }}>Ref: {error.digest}</p>
          )}
          <button onClick={reset}>Reload Universe</button>
        </div>
      </body>
    </html>
  )
}
