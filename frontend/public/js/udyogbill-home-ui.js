(function () {
    'use strict';

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initNavScroll() {
        var nav = document.querySelector('.ub-mh-navbar');
        if (!nav) return;

        var onScroll = function () {
            nav.classList.toggle('is-scrolled', window.scrollY > 12);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    function initSmoothAnchors() {
        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                var id = link.getAttribute('href');
                if (!id || id === '#') return;
                var target = document.querySelector(id);
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
            });
        });
    }

    function initReveal() {
        if (prefersReduced) {
            document.querySelectorAll('.ub-reveal, .ub-reveal-section, .feature-card, .faq-item, .benefit-card, .step-card').forEach(function (el) {
                el.classList.add('is-visible');
            });
            return;
        }

        var targets = document.querySelectorAll('.ub-reveal-section, .feature-card, .faq-item, .benefit-card, .step-card, .ub-reveal');
        if (!targets.length) return;

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            });
        }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

        targets.forEach(function (el, i) {
            el.style.setProperty('--ub-reveal-delay', (i % 6) * 70 + 'ms');
            io.observe(el);
        });
    }

    function parseCounterValue(text) {
        var raw = (text || '').trim();
        if (!raw) return null;

        if (raw.indexOf('<') === 0) {
            var n = parseFloat(raw.replace(/[^\d.]/g, ''));
            return isNaN(n) ? null : { type: 'lt', value: n, suffix: raw.replace(/[\d.<]/g, '') };
        }

        var match = raw.match(/^([\d,.]+)(.*)$/);
        if (!match) return null;

        var num = parseFloat(match[1].replace(/,/g, ''));
        if (isNaN(num)) return null;

        return { type: 'num', value: num, suffix: match[2] || '' };
    }

    function animateCounter(el, spec, duration) {
        var start = performance.now();
        var from = 0;
        var to = spec.value;
        var suffix = spec.suffix || '';
        var prefix = spec.type === 'lt' ? '<' : '';

        function frame(now) {
            var t = Math.min(1, (now - start) / duration);
            var eased = 1 - Math.pow(1 - t, 3);
            var current = from + (to - from) * eased;
            var display = suffix.indexOf('%') !== -1 ? current.toFixed(1) : Math.round(current).toString();
            el.textContent = prefix + display + suffix;
            if (t < 1) requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    function initCounters() {
        var items = document.querySelectorAll('.hero-meta-number');
        if (!items.length) return;

        if (prefersReduced) return;

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                if (el.dataset.ubCounted === '1') return;
                el.dataset.ubCounted = '1';
                var spec = parseCounterValue(el.textContent);
                if (spec) animateCounter(el, spec, 1200);
                io.unobserve(el);
            });
        }, { threshold: 0.5 });

        items.forEach(function (el) { io.observe(el); });
    }

    function boot() {
        initNavScroll();
        initSmoothAnchors();
        initReveal();
        initCounters();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
