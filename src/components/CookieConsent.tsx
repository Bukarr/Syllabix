import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getConsent, setConsent } from '@/lib/consent';

/**
 * Explicit, non-dark-pattern consent banner.
 * "Reject" is as prominent as "Accept" and nothing optional runs before a choice.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay slightly so it never competes with the first paint / install prompt.
    const t = window.setTimeout(() => setVisible(getConsent() === null), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const choose = (value: 'accepted' | 'rejected') => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-label="Cookie and privacy choices"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-heading font-semibold">Your privacy choices</p>
              <p className="text-muted-foreground leading-relaxed">
                Syllabix stores your lesson data on your own device so it works offline. We use{' '}
                <strong>no third-party trackers or advertising cookies</strong>. May we also collect
                anonymous page-speed measurements to improve the app?
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 touch-target" onClick={() => choose('accepted')}>
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 touch-target"
                  onClick={() => choose('rejected')}
                >
                  Reject
                </Button>
              </div>
              <Link to="/privacy" className="block pt-1 text-xs text-primary underline">
                Read our Privacy Policy
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
