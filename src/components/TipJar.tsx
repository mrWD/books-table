import { useEffect, useState } from 'react'
import { buyTip, loadTips, onTipCompleted, type Tip } from '../lib/tip-jar'
import { IconHeart } from './Icons'

const NOTES = {
  thanks: 'Thank you — that means a lot.',
  pending: 'Waiting for approval. The tip goes through once it is approved.',
  failed: 'The tip did not go through. Please try again later.',
} as const

/**
 * The Support section of the iOS app: tips through In-App Purchase instead of the web
 * build's donation links (see lib/tip-jar). Renders nothing until StoreKit has tips to
 * sell, so an app whose products are not live yet shows no empty section.
 */
export function TipJar() {
  const [tips, setTips] = useState<Tip[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<keyof typeof NOTES | null>(null)

  useEffect(() => {
    let alive = true
    void loadTips().then((list) => {
      if (alive) setTips(list)
    })
    const off = onTipCompleted(() => {
      if (alive) setNote('thanks')
    })
    return () => {
      alive = false
      off()
    }
  }, [])

  if (tips.length === 0) return null

  const buy = async (id: string) => {
    setBusy(id)
    setNote(null)
    const outcome = await buyTip(id)
    setBusy(null)
    if (outcome === 'purchased') setNote('thanks')
    else if (outcome === 'pending' || outcome === 'failed') setNote(outcome)
  }

  return (
    <section>
      <h2 className="h2">Support</h2>
      <div className="support">
        <p className="support-text">
          BooksTable is free and has no ads. If it is useful to you, you can leave a tip. It
          unlocks nothing: every feature is already yours.
        </p>
        <div className="support-links">
          {tips.map((tip) => (
            <button
              key={tip.id}
              type="button"
              className="support-link"
              disabled={busy !== null}
              aria-label={`${tip.title}, ${tip.price}`}
              onClick={() => void buy(tip.id)}
            >
              <IconHeart size={17} strokeWidth={2} />
              <span>
                {tip.title} · {tip.price}
              </span>
            </button>
          ))}
        </div>
        {note && (
          <p className="support-text support-note" role="status">
            {NOTES[note]}
          </p>
        )}
      </div>
    </section>
  )
}
