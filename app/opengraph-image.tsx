import { ImageResponse } from 'next/og'

export const alt = 'Operator — Learn AI by talking to it'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#080808',
          color: '#f0f0f0',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#c9973a',
            marginBottom: 40,
          }}
        >
          Operator
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.15, display: 'flex', flexDirection: 'column' }}>
          <span>You don&apos;t watch AI.</span>
          <span style={{ color: '#c9973a' }}>You talk to it.</span>
        </div>
        <div style={{ fontSize: 30, color: '#888', marginTop: 40 }}>
          The free AI course taught entirely through conversation.
        </div>
        <div style={{ fontSize: 24, color: '#c9973a', marginTop: 24 }}>
          Six lessons · Zero videos · buildyouroperator.com
        </div>
      </div>
    ),
    size
  )
}
