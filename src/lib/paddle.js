// Paddle Billing checkout (client side).
//
// These values are PUBLIC (safe in the frontend). The secret API key lives only
// as a Supabase Edge Function secret — never here.
// Live subscription prices (immutable in Paddle — to change, create a new price
// and swap the id here). Monthly $7 / yearly $75, product
// pro_01kz3ny7dkw824qx0avys73jwd "Sake Control — subskrypcja Pro".
export const PADDLE_PRICES = {
  monthly: 'pri_01kz3nydet3rch2wp9zdh29n2y',
  yearly: 'pri_01kz3nydvs2667ywz1zstxr8j2',
}
export const PRICE_LABELS = { monthly: '$7', yearly: '$75' }
export const PRICE_LABEL = PRICE_LABELS.monthly // default for compact displays
// Same seller account as Ticket Flow — the client-side token is account-wide.
// sakecontrol.pl must be approved in Paddle → Checkout settings → Website approval.
export const PADDLE_CLIENT_TOKEN = 'live_5b9187cbde834f372cdad73e9d0'
export const PADDLE_ENV = 'production' // 'sandbox' | 'production'

let paddlePromise = null

function loadPaddle() {
  if (window.Paddle) return Promise.resolve(window.Paddle)
  if (paddlePromise) return paddlePromise
  paddlePromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    s.async = true
    s.onload = () => resolve(window.Paddle)
    s.onerror = () => reject(new Error('paddle.js failed to load'))
    document.head.appendChild(s)
  })
  return paddlePromise
}

export function isPaddleConfigured() {
  return Boolean(PADDLE_CLIENT_TOKEN)
}

// The link that opens a ready-to-pay checkout for one specific account, without
// signing in on the website again. The mobile apps build this same URL and open
// it in the browser; /#/checkout turns it into the overlay. Nothing secret
// travels here: the profile id only tells the webhook which account to credit,
// so a tampered link would just pay for someone else.
export function checkoutUrl({ email, profileId, plan = 'monthly', base = 'https://sakecontrol.pl' } = {}) {
  const q = new URLSearchParams({ plan })
  if (profileId) q.set('pid', profileId)
  if (email) q.set('email', email)
  return `${base}/#/checkout?${q.toString()}`
}

// Opens the Paddle checkout overlay. `plan` = 'monthly' | 'yearly'. customData
// carries the profile id so the webhook can map the subscription back to the user.
export async function openCheckout({ email, profileId, plan = 'monthly', onClose, onEvent } = {}) {
  if (!isPaddleConfigured()) {
    return { ok: false, reason: 'not_configured' }
  }
  try {
    const priceId = PADDLE_PRICES[plan] || PADDLE_PRICES.monthly
    const Paddle = await loadPaddle()
    if (PADDLE_ENV === 'sandbox') Paddle.Environment.set('sandbox')
    Paddle.Setup({
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (e) => {
        onEvent?.(e)
        if (e?.name === 'checkout.closed' || e?.name === 'checkout.completed') onClose?.(e)
      },
    })
    Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: email ? { email } : undefined,
      customData: profileId ? { profile_id: profileId } : undefined,
      settings: { displayMode: 'overlay', theme: 'dark', locale: 'pl' },
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}
