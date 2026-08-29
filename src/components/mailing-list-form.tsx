import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

type SubscriptionStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface MailingListSubscriptionState {
  email: string;
  onEmailChange: (value: string) => void;
  status: SubscriptionStatus;
  message: string;
  unsubscribeUrl: string | null;
  isSubmitting: boolean;
  turnstileContainerRef: RefObject<HTMLDivElement | null>;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

function useTurnstile(siteKey: string | undefined) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (!siteKey) return undefined;

    let cancelled = false;
    let pollId: number | undefined;
    let timeoutId: number | undefined;

    const renderWidget = () => {
      const turnstile = window.turnstile;
      if (cancelled || widgetIdRef.current !== null || !containerRef.current || !turnstile) {
        return widgetIdRef.current !== null;
      }

      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        appearance: 'interaction-only',
        callback: (nextToken) => {
          if (!cancelled) setToken(nextToken);
        },
        'expired-callback': () => {
          if (!cancelled) setToken('');
        },
        'error-callback': () => {
          if (!cancelled) setToken('');
        },
      });
      return true;
    };

    if (!renderWidget()) {
      pollId = window.setInterval(() => {
        if (renderWidget() && pollId !== undefined) window.clearInterval(pollId);
      }, 50);
      timeoutId = window.setTimeout(() => {
        if (pollId !== undefined) window.clearInterval(pollId);
      }, 10000);
    }

    return () => {
      cancelled = true;
      if (pollId !== undefined) window.clearInterval(pollId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (widgetIdRef.current !== null && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  const reset = useCallback(() => {
    setToken('');
    if (widgetIdRef.current !== null && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  }, []);

  return { containerRef, token, reset };
}

export function useMailingListSubscription(): MailingListSubscriptionState {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus>('idle');
  const [message, setMessage] = useState('');
  const [unsubscribeUrl, setUnsubscribeUrl] = useState<string | null>(null);
  const turnstile = useTurnstile(TURNSTILE_SITE_KEY);

  const onEmailChange = useCallback((value: string) => {
    setEmail(value);
    setStatus('idle');
    setMessage('');
    setUnsubscribeUrl(null);
  }, []);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    if (!TURNSTILE_SITE_KEY) {
      setStatus('error');
      setMessage('The mailing list is not configured yet.');
      return;
    }

    if (!turnstile.token) {
      setStatus('error');
      setMessage('Please complete the security check and try again.');
      return;
    }

    setStatus('submitting');
    setMessage('');
    setUnsubscribeUrl(null);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), turnstileToken: turnstile.token }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.ok !== true) {
        if (response.status === 503) throw new Error('The mailing list is temporarily unavailable. Please try again later.');
        throw new Error('We could not add you to the mailing list. Please try again.');
      }

      setEmail('');
      setStatus('success');
      setMessage("You're on the list.");
      setUnsubscribeUrl(typeof result.unsubscribeUrl === 'string' ? result.unsubscribeUrl : null);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'We could not add you to the mailing list. Please try again.');
    } finally {
      turnstile.reset();
    }
  }, [email, status, turnstile.reset, turnstile.token]);

  return {
    email,
    onEmailChange,
    status,
    message,
    unsubscribeUrl,
    isSubmitting: status === 'submitting',
    turnstileContainerRef: turnstile.containerRef,
    submit,
  };
}

export function MailingListFeedback({
  state,
  statusId,
}: {
  state: MailingListSubscriptionState;
  statusId: string;
}) {
  if (!state.message) return null;

  return (
    <p id={statusId} className={`mailing-list-status mailing-list-status-${state.status}`} role={state.status === 'error' ? 'alert' : 'status'}>
      {state.message}
      {state.unsubscribeUrl && <>{' '}<a href={state.unsubscribeUrl}>Unsubscribe</a></>}
    </p>
  );
}
