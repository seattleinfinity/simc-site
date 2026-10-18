import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { EMAIL } from '../data/site';

type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

let turnstileScript: Promise<Turnstile> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!turnstileScript) {
    turnstileScript = new Promise<Turnstile>((resolve, reject) => {
      const script = document.createElement('script');
      const timer = window.setTimeout(() => fail(), 15000);
      const fail = () => {
        window.clearTimeout(timer);
        script.remove();
        reject(new Error('Security check could not load. Please refresh and try again.'));
      };
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => {
        window.clearTimeout(timer);
        if (window.turnstile) resolve(window.turnstile);
        else fail();
      };
      script.onerror = fail;
      document.head.append(script);
    }).catch((error) => { turnstileScript = undefined; throw error; });
  }
  return turnstileScript;
}

export function MailingListForm() {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const submitting = useRef(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [joined, setJoined] = useState(false);
  const [signupUnavailable, setSignupUnavailable] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    async function initialize() {
      try {
        const response = await fetch('/api/mailing-list/config', {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        if (!response.ok) {
          if (!disposed) setSignupUnavailable(true);
          return;
        }
        const config = await response.json();
        if (typeof config.siteKey !== 'string' || !config.siteKey) {
          if (!disposed) setSignupUnavailable(true);
          return;
        }
        const turnstile = await loadTurnstile();
        if (disposed || !container.current) return;
        widget.current = turnstile.render(container.current, {
          sitekey: config.siteKey,
          action: 'mailing_list',
          appearance: 'interaction-only',
          size: window.matchMedia('(max-width: 339px)').matches ? 'compact' : 'normal',
          callback: (value: string) => { setToken(value); },
          'expired-callback': () => { setToken(''); },
          'error-callback': () => { setToken(''); },
          'timeout-callback': () => { setToken(''); },
        });
      } catch {
        if (!disposed) setSignupUnavailable(true);
      }
    }
    void initialize();
    return () => {
      disposed = true;
      controller.abort();
      if (widget.current !== undefined) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !token) return;
    submitting.current = true;
    setPending(true);
    setMessage('Saving your address…');
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (response.status === 503) {
        setSignupUnavailable(true);
        setMessage('');
        return;
      }
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'Signup failed. Please try again.');
      setEmail('');
      setJoined(true);
      setMessage('');
    } catch (error) {
      setJoined(false);
      setMessage(error instanceof Error && error.name !== 'TimeoutError'
        ? error.message : 'Could not confirm signup. Please try again.');
    } finally {
      submitting.current = false;
      setPending(false);
      setToken('');
      if (widget.current !== undefined) window.turnstile?.reset(widget.current);
    }
  }

  return (
    <form className="mailing-list-form" onSubmit={submit} aria-busy={pending}>
      <div className="contact-form-row">
        <label className="sr-only" htmlFor={`${id}-email`}>Email address</label>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} placeholder="your@email.com" value={email} onChange={(event) => { setEmail(event.target.value); setJoined(false); setMessage(''); }} disabled={pending || signupUnavailable} required aria-describedby={`${id}-notice ${id}-status`} />
        <button className="button button-primary" type="submit" disabled={pending || !token || signupUnavailable}>{pending ? 'Joining…' : joined ? "You're on the list" : 'Join mailing list'}</button>
      </div>
      <div ref={container} />
      <p id={`${id}-status`} className="mailing-list-status sr-only" role="status" aria-live="polite" aria-atomic="true">{message}</p>
      <p id={`${id}-notice`} className="mailing-list-notice">By joining, you agree to receive SIMC emails. To leave, <a href={`mailto:${EMAIL}?subject=Unsubscribe`}>email us</a>.</p>
      <noscript>Please enable JavaScript to join the mailing list.</noscript>
    </form>
  );
}
