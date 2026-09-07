/**
 * UdyogBill Instant Navigation & Hover-Intent Prefetcher
 * Provides zero-latency navigation for authenticated ERP links.
 */
(function () {
    'use strict';
    if (typeof window === 'undefined' || !window.fetch || !window.Set) return;

    var prefetched = new Set();
    var hoverTimer = null;
    var currentOrigin = window.location.origin;

    var unsafePatterns = [
        '/logout',
        '/delete',
        '/destroy',
        '/download',
        '/pdf',
        '/print',
        '/export',
        '/toggle',
        '/change-status',
        '/ajax',
        '/install',
        '/update',
        '/backup',
        '#',
        'javascript:'
    ];

    function isSafeUrl(url) {
        if (!url || typeof url !== 'string') return false;
        if (url.startsWith('#') || url.startsWith('javascript:')) return false;

        try {
            var parsed = new URL(url, currentOrigin);
            if (parsed.origin !== currentOrigin) return false;
            if (parsed.href === window.location.href) return false;

            var path = parsed.pathname.toLowerCase();
            for (var i = 0; i < unsafePatterns.length; i++) {
                if (path.indexOf(unsafePatterns[i]) !== -1) return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function prefetchUrl(url) {
        if (!isSafeUrl(url) || prefetched.has(url)) return;
        prefetched.add(url);

        try {
            var link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            link.as = 'document';
            document.head.appendChild(link);
        } catch (e) {
            try {
                fetch(url, { priority: 'low', credentials: 'same-origin' }).catch(function () {});
            } catch (err) {}
        }
    }

    function handleHover(e) {
        var anchor = e.target.closest('a');
        if (!anchor) return;

        if (
            anchor.classList.contains('btn-modal') ||
            anchor.classList.contains('print-invoice') ||
            anchor.hasAttribute('data-toggle') ||
            anchor.hasAttribute('data-target') ||
            anchor.hasAttribute('data-href')
        ) {
            return;
        }

        var href = anchor.getAttribute('href');
        if (isSafeUrl(href)) {
            hoverTimer = setTimeout(function () {
                prefetchUrl(href);
            }, 65);
        }
    }

    function cancelHover() {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    }

    document.addEventListener('mouseover', handleHover, { passive: true });
    document.addEventListener('mouseout', cancelHover, { passive: true });
    document.addEventListener('touchstart', function (e) {
        var anchor = e.target.closest('a');
        if (anchor && !anchor.classList.contains('btn-modal')) {
            var href = anchor.getAttribute('href');
            if (isSafeUrl(href)) prefetchUrl(href);
        }
    }, { passive: true });
})();
