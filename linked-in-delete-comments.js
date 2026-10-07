// Delete all your LinkedIn comments.
// Run on: https://www.linkedin.com/in/<you>/recent-activity/comments/
// Paste into DevTools Console (F12 → Console). Stop anytime with: window.stopDeleting = true
(async () => {
    const MY_NAME = 'Your Name Here';   // only touches comments with this name in the options label
    const MAX = Infinity;               // set to e.g. 3 for a test run
    const DELAY = 1500;                 // pause between deletions; keep it slow to avoid rate limits
    const TIMEOUT = 10000;              // max wait for a menu/dialog to appear

    const sleep = ms => new Promise(r => setTimeout(r, ms + Math.random() * 500));
    // Poll until fn() returns something truthy (or time out -> null)
    const waitFor = async (fn, timeout = TIMEOUT, every = 150) => {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            const el = fn();
            if (el) return el;
            await new Promise(r => setTimeout(r, every));
        }
        return null;
    };
    const isVisible = el => !!el && el.isConnected && (el.checkVisibility
    ? el.checkVisibility()
    : el.getClientRects().length > 0);
    const byText = (root, sel, re) =>
    [...root.querySelectorAll(sel)].find(e => isVisible(e) && re.test(e.textContent.trim()));
    const escape = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    if (!confirm(`Permanently delete ${MAX === Infinity ? 'ALL' : MAX} of your comments? This cannot be undone.`)) return;
    window.stopDeleting = false;
    let deleted = 0, emptyPasses = 0;

    while (deleted < MAX && !window.stopDeleting) {
        const opt = document.querySelector(`button[aria-label^="View more options for ${MY_NAME}"]:not([data-done])`);
        if (!opt) {
            window.scrollTo(0, document.body.scrollHeight);
            byText(document, 'button', /^show more results$/i)?.click();
            await sleep(DELAY * 2);
            if (++emptyPasses > 5) break;
            continue;
        }
        emptyPasses = 0;
        opt.dataset.done = '1';
        opt.scrollIntoView({ block: 'center' });
        await sleep(300);
        opt.click();

        // Wait for the "Delete" item in the options menu
        const del = await waitFor(() => byText(document, '[role="menuitem"]', /^delete$/i));
        if (!del) { console.warn('Menu never showed a Delete item; skipping.'); escape(); await sleep(500); continue; }
        del.click();

        // Wait for the confirmation dialog's Delete button
        const confirmBtn = await waitFor(() => {
            const dlg = [...document.querySelectorAll('dialog[open], [role="alertdialog"], [role="dialog"]')].find(isVisible);
            return dlg && byText(dlg, 'button', /^delete$/i);
        });
        if (!confirmBtn) { console.warn('No confirm button found; stopping.'); break; }
        confirmBtn.click();

        // Wait for the dialog to close before moving on
        await waitFor(() => !isVisible(confirmBtn));
        deleted++;

        // Handle any extra pop-up (toast, "are you sure", rate-limit notice, etc.)
        await sleep(600);
        for (let i = 0; i < 3; i++) {
            const extra = [...document.querySelectorAll('dialog[open], [role="alertdialog"], [role="dialog"], .artdeco-modal, [role="alert"]')]
            .find(isVisible);
            if (!extra) break;
            const txt = extra.textContent.replace(/\s+/g, ' ').trim();
            console.log('Extra pop-up:', txt.slice(0, 200));
            if (/too many|slow down|try again later|unusual activity|restricted|limit/i.test(txt)) {
                console.warn('LinkedIn looks like it is rate-limiting you. Stopping — wait a while before running again.');
                window.stopDeleting = true;
                break;
            }
            const again = byText(extra, 'button', /^delete$/i);
            const close = again ||
            byText(extra, 'button', /^(got it|ok|okay|done|close|dismiss|not now|no thanks)$/i) ||
            extra.querySelector('button[aria-label*="Dismiss" i], button[aria-label*="Close" i]');
            if (close && isVisible(close)) close.click(); else escape();
            await waitFor(() => !isVisible(extra), 3000);
        }
        console.log(`Deleted ${deleted}`);
        await sleep(DELAY);
    }
    console.log(`Done. Deleted ${deleted} comment(s).`);
})();
