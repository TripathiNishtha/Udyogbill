(function () {
    'use strict';

    var cfg = window.ubMarketingAnalytics || {};
    if (!cfg.pageviewUrl || !cfg.durationUrl) {
        return;
    }

    var viewId = null;
    var startedAt = Date.now();
    var lastSentDuration = 0;
    var heartbeatTimer = null;

    function csrfToken() {
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function utmParams() {
        var params = new URLSearchParams(window.location.search);
        return {
            utm_source: params.get('utm_source') || '',
            utm_medium: params.get('utm_medium') || '',
            utm_campaign: params.get('utm_campaign') || ''
        };
    }

    function postJson(url, payload) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload),
            credentials: 'same-origin',
            keepalive: true
        });
    }

    function sendDuration(force) {
        if (!viewId) return;
        var seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
        if (!force && seconds <= lastSentDuration) return;
        if (!force && seconds - lastSentDuration < 3) return;

        lastSentDuration = seconds;
        postJson(cfg.durationUrl, { view_id: viewId, duration_seconds: seconds });
    }

    function startHeartbeat() {
        if (heartbeatTimer) return;
        heartbeatTimer = window.setInterval(function () {
            sendDuration(false);
        }, 30000);
    }

    function stopHeartbeat() {
        if (!heartbeatTimer) return;
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }

    function initPageView() {
        var utm = utmParams();
        postJson(cfg.pageviewUrl, {
            page_path: window.location.pathname + window.location.search,
            page_title: document.title || '',
            referrer_url: document.referrer || '',
            utm_source: utm.utm_source,
            utm_medium: utm.utm_medium,
            utm_campaign: utm.utm_campaign
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data && data.tracked && data.view_id) {
                    viewId = data.view_id;
                    startedAt = Date.now();
                    startHeartbeat();
                }
            })
            .catch(function () {});
    }

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            sendDuration(true);
            stopHeartbeat();
        } else if (viewId) {
            startHeartbeat();
        }
    });

    window.addEventListener('pagehide', function () {
        sendDuration(true);
        stopHeartbeat();
    });

    window.addEventListener('beforeunload', function () {
        sendDuration(true);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageView);
    } else {
        initPageView();
    }
})();
