(function () {
    'use strict';

    var cfg = window.ubLeadCaptureConfig || {};
    if (!cfg.endpoint) return;

    var KEYS = {
        submitted: 'ub_lead_submitted',
        dayCount: 'ub_lead_day_count',
        dayDate: 'ub_lead_day_date',
        sessionCount: 'ub_lead_session_count',
        lastShown: 'ub_lead_last_shown'
    };
    var UTM_KEY = 'ub_marketing_utms';

    var pageAutoShown = false;
    var activeVariant = null;
    var modalEl = null;
    var scrollUpStart = 0;

    function todayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function lsGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function lsSet(key, val) {
        try { localStorage.setItem(key, val); } catch (e) {}
    }

    function ssGet(key) {
        try { return sessionStorage.getItem(key); } catch (e) { return null; }
    }

    function ssSet(key, val) {
        try { sessionStorage.setItem(key, val); } catch (e) {}
    }

    function isSubmitted() {
        return lsGet(KEYS.submitted) === '1';
    }

    function markSubmitted() {
        lsSet(KEYS.submitted, '1');
    }

    function getDayCount() {
        if (lsGet(KEYS.dayDate) !== todayKey()) {
            lsSet(KEYS.dayDate, todayKey());
            lsSet(KEYS.dayCount, '0');
        }
        return parseInt(lsGet(KEYS.dayCount) || '0', 10);
    }

    function incrementCounters() {
        lsSet(KEYS.dayDate, todayKey());
        lsSet(KEYS.dayCount, String(getDayCount() + 1));
        ssSet(KEYS.sessionCount, String(parseInt(ssGet(KEYS.sessionCount) || '0', 10) + 1));
        lsSet(KEYS.lastShown, String(Date.now()));
    }

    function canAutoShow() {
        if (!cfg.popupEnabled || isSubmitted()) return false;
        if (pageAutoShown) return false;

        var maxDay = cfg.maxPerDay || 3;
        var maxSession = cfg.maxPerSession || 2;
        var minGap = (cfg.minGapSeconds || 45) * 1000;

        if (getDayCount() >= maxDay) return false;
        if (parseInt(ssGet(KEYS.sessionCount) || '0', 10) >= maxSession) return false;

        var last = parseInt(lsGet(KEYS.lastShown) || '0', 10);
        if (last && (Date.now() - last) < minGap) return false;

        return true;
    }

    function parseUtms() {
        var params = new URLSearchParams(window.location.search);
        var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        var found = {};
        var has = false;
        keys.forEach(function (k) {
            var v = params.get(k);
            if (v) { found[k] = v; has = true; }
        });
        if (has) {
            try { sessionStorage.setItem(UTM_KEY, JSON.stringify(found)); } catch (e) {}
        }
        try {
            var stored = sessionStorage.getItem(UTM_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    }

    function detectDevice() {
        var ua = navigator.userAgent || '';
        if (/tablet|ipad/i.test(ua)) return 'tablet';
        if (/mobile|android|iphone/i.test(ua)) return 'mobile';
        return 'desktop';
    }

    function gtagEvent(name, params) {
        if (typeof window.gtag === 'function') {
            window.gtag('event', name, params || {});
        }
    }

    function getAttribution() {
        var utms = parseUtms();
        return {
            utm_source: utms.utm_source || '',
            utm_medium: utms.utm_medium || '',
            utm_campaign: utms.utm_campaign || '',
            utm_content: utms.utm_content || '',
            utm_term: utms.utm_term || '',
            referrer_url: document.referrer || '',
            landing_page: window.location.href,
            device_type: detectDevice(),
            user_agent: (navigator.userAgent || '').substring(0, 500)
        };
    }

    function scrollRatio() {
        var h = Math.max(document.documentElement.scrollHeight, 1);
        return (window.scrollY + window.innerHeight) / h;
    }

    function lockBody(lock) {
        document.body.style.overflow = lock ? 'hidden' : '';
    }

    function serializeForm(form) {
        var data = {};
        Array.prototype.forEach.call(form.elements, function (el) {
            if (!el.name || el.type === 'submit' || el.classList.contains('ub-lead-hp')) return;
            if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
            data[el.name] = el.value;
        });
        var attr = getAttribution();
        Object.keys(attr).forEach(function (k) { data[k] = attr[k]; });
        return data;
    }

    function msgBaseClass(form) {
        return form && form.id === 'ub-home-contact-form' ? 'cta-corp__msg' : 'ub-lead-form__msg';
    }

    function submitLead(form, msgEl, onSuccess) {
        var btn = form.querySelector('[type="submit"]');
        var payload = serializeForm(form);
        var msgCls = msgBaseClass(form);
        if (btn) btn.disabled = true;
        if (msgEl) {
            msgEl.textContent = 'Submitting...';
            msgEl.className = msgCls;
        }

        fetch(cfg.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': cfg.csrf,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload)
        })
        .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
        .then(function (result) {
            if (!result.ok || !result.body.success) {
                throw new Error((result.body && result.body.message) || 'Something went wrong.');
            }
            if (msgEl) {
                msgEl.textContent = result.body.message || 'Thank you!';
                msgEl.className = msgCls + ' is-success';
            }
            gtagEvent('lead_form_submit', { source: payload.source || 'unknown', variant: payload.popup_variant || '' });
            gtagEvent('lead_popup_submit', { variant: payload.popup_variant || payload.source || 'unknown' });
            markSubmitted();
            if (typeof onSuccess === 'function') onSuccess();
        })
        .catch(function (err) {
            if (msgEl) {
                msgEl.textContent = err.message || 'Please try again.';
                msgEl.className = msgCls + ' is-error';
            }
            if (btn) btn.disabled = false;
        });
    }

    function bindForm(form, msgEl, onSuccess) {
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var mobile = (form.querySelector('[name="mobile"]') || {}).value || '';
            mobile = mobile.replace(/\D/g, '');
            if (mobile.length !== 10) {
                if (msgEl) {
                    msgEl.textContent = 'Please enter a valid 10-digit mobile number.';
                    msgEl.className = msgBaseClass(form) + ' is-error';
                }
                return;
            }
            submitLead(form, msgEl, onSuccess);
        });
    }

    function showPanel(variant) {
        if (!modalEl) return;
        modalEl.querySelectorAll('[data-ub-panel]').forEach(function (p) {
            p.hidden = p.getAttribute('data-ub-panel') !== variant;
        });
        activeVariant = variant;
    }

    function openPopup(variant, isManual) {
        if (!modalEl) return;
        if (!isManual && !canAutoShow()) return;
        if (!isManual && pageAutoShown) return;
        if (isSubmitted()) return;

        showPanel(variant || 'welcome_demo');
        modalEl.hidden = false;
        modalEl.classList.add('is-visible');
        modalEl.setAttribute('aria-hidden', 'false');
        if (window.matchMedia('(max-width: 767px)').matches) lockBody(true);

        if (!isManual) {
            pageAutoShown = true;
            incrementCounters();
        }

        gtagEvent('lead_popup_view', { variant: variant || 'welcome_demo', manual: !!isManual });
    }

    function closePopup() {
        if (!modalEl) return;
        modalEl.classList.remove('is-visible');
        modalEl.hidden = true;
        modalEl.setAttribute('aria-hidden', 'true');
        lockBody(false);
        gtagEvent('lead_popup_dismiss', { variant: activeVariant || 'unknown' });
    }

    function tryAutoShow(variant) {
        if (pageAutoShown || !canAutoShow()) return false;
        openPopup(variant, false);
        return true;
    }

    function initPopups() {
        modalEl = document.getElementById('ub-lead-popup');
        if (!modalEl || !cfg.popupEnabled) return;

        var mobileBar = document.getElementById('ub-lead-mobile-bar');
        var delay = (cfg.popupDelay || 6) * 1000;
        var welcomeTriggered = false;
        var scrollOfferChecked = false;
        var exitBound = false;

        modalEl.querySelectorAll('[data-ub-lead-dismiss]').forEach(function (el) {
            el.addEventListener('click', closePopup);
        });

        document.querySelectorAll('[data-ub-lead-open]').forEach(function (el) {
            el.addEventListener('click', function () {
                openPopup('welcome_demo', true);
            });
        });

        modalEl.querySelectorAll('.ub-lead-panel-form').forEach(function (form) {
            var msgEl = form.querySelector('.ub-lead-form__msg');
            bindForm(form, msgEl, function () {
                setTimeout(closePopup, 2200);
            });
        });

        function triggerWelcome() {
            if (welcomeTriggered || pageAutoShown) return;
            welcomeTriggered = true;
            tryAutoShow('welcome_demo');
        }

        setTimeout(function () {
            if (!pageAutoShown) triggerWelcome();
        }, delay);

        window.addEventListener('scroll', function onScroll() {
            var ratio = scrollRatio();

            if (!welcomeTriggered && !pageAutoShown && ratio >= 0.25) {
                welcomeTriggered = true;
                tryAutoShow('welcome_demo');
            }

            if (!pageAutoShown && ratio >= 0.55) {
                if (!scrollOfferChecked) {
                    scrollOfferChecked = true;
                    tryAutoShow('scroll_offer');
                }
            }

            if (detectDevice() === 'mobile' && !exitBound && !pageAutoShown) {
                var y = window.scrollY;
                if (scrollUpStart && scrollUpStart - y > 120 && ratio < 0.35) {
                    exitBound = true;
                    if (!welcomeTriggered) {
                        welcomeTriggered = true;
                        tryAutoShow('exit_intent');
                    }
                }
                scrollUpStart = y;
            }
        }, { passive: true });

        if (detectDevice() !== 'mobile' && !exitBound) {
            document.addEventListener('mouseout', function (e) {
                if (exitBound || pageAutoShown || welcomeTriggered) return;
                if (e.clientY <= 8 && e.relatedTarget == null) {
                    exitBound = true;
                    welcomeTriggered = true;
                    tryAutoShow('exit_intent');
                }
            });
        }

        if (mobileBar && window.matchMedia('(max-width: 767px)').matches && !isSubmitted()) {
            mobileBar.hidden = false;
        }
    }

    function initContactForm() {
        var form = document.getElementById('ub-home-contact-form');
        var msgEl = document.getElementById('ub-home-contact-msg');
        bindForm(form, msgEl, function () {
            if (form) form.reset();
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        parseUtms();
        initPopups();
        initContactForm();
    });
})();
