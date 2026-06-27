import { Turnstile } from '@marsidev/react-turnstile'
import { TURNSTILE_SITE_KEY } from '../lib/turnstile'

// The app's Turnstile widget with its standard wiring: a passed challenge
// publishes the token via onToken; expiry and errors clear it. Pair with
// useTurnstile, passing its `ref` as innerRef and `setToken` as onToken.
export default function TurnstileWidget({ innerRef, onToken, className }) {
  return (
    <Turnstile
      ref={innerRef}
      className={className}
      siteKey={TURNSTILE_SITE_KEY}
      onSuccess={onToken}
      onExpire={() => onToken(null)}
      onError={() => onToken(null)}
    />
  )
}
