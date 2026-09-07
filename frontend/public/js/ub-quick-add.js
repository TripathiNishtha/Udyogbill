/**
 * UdyogBill grid quick menu — open/close + fixed positioning (no Bootstrap dropdown).
 */
(function ($) {
    'use strict';

    function placeMenu($btn, $menu) {
        if (!$btn.length || !$menu.length) {
            return;
        }

        var menuWidth = Math.min(420, window.innerWidth - 24);
        var rect = $btn[0].getBoundingClientRect();
        var left = rect.right - menuWidth;

        if (left < 12) {
            left = 12;
        }
        if (left + menuWidth > window.innerWidth - 12) {
            left = Math.max(12, window.innerWidth - menuWidth - 12);
        }

        $menu.css({
            position: 'fixed',
            top: (rect.bottom + 6) + 'px',
            left: left + 'px',
            right: 'auto',
            bottom: 'auto',
            width: menuWidth + 'px',
            maxHeight: 'min(75vh, 480px)',
            overflowY: 'auto',
            zIndex: 2147483000
        });
    }

    function closeMenu($wrap, $btn, $menu) {
        $wrap.removeClass('open');
        $btn.attr('aria-expanded', 'false');
        $menu.removeClass('ub-quick-add-menu-open open').hide().attr('hidden', 'hidden');
    }

    function openMenu($wrap, $btn, $menu) {
        $wrap.addClass('open');
        $btn.attr('aria-expanded', 'true');
        $menu.removeAttr('hidden').addClass('ub-quick-add-menu-open open').show();
        placeMenu($btn, $menu);
    }

    function init() {
        var $wrap = $('.ub-quick-add');
        var $btn = $('#ub-quick-add-btn');
        var $menu = $('#ub-quick-add-menu');

        if (!$btn.length || !$menu.length) {
            return;
        }

        if ($menu.parent()[0] !== document.body) {
            $menu.appendTo('body');
        }

        $menu.hide().attr('hidden', 'hidden');

        $btn.off('click.ubQuickAdd').on('click.ubQuickAdd', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if ($menu.hasClass('ub-quick-add-menu-open')) {
                closeMenu($wrap, $btn, $menu);
            } else {
                openMenu($wrap, $btn, $menu);
            }
        });

        $(document).off('click.ubQuickAddClose').on('click.ubQuickAddClose', function (e) {
            if ($(e.target).closest('#ub-quick-add-btn, #ub-quick-add-menu, .ub-quick-add').length) {
                return;
            }
            closeMenu($wrap, $btn, $menu);
        });

        $(document).off('keydown.ubQuickAdd').on('keydown.ubQuickAdd', function (e) {
            if (e.key === 'Escape') {
                closeMenu($wrap, $btn, $menu);
            }
        });

        $(window).off('resize.ubQuickAdd scroll.ubQuickAdd').on('resize.ubQuickAdd scroll.ubQuickAdd', function () {
            if ($menu.hasClass('ub-quick-add-menu-open')) {
                placeMenu($btn, $menu);
            }
        });
    }

    $(init);
})(window.jQuery);
