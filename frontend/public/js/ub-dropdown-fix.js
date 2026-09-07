/**
 * UdyogBill — table / DataTables action dropdown fix
 * Moves dropdown menus to body with fixed positioning so overflow containers do not clip them.
 */
(function ($) {
    'use strict';

    var OPEN_CLASS = 'ub-dropdown-menu-floating';
    var SCROLL_SEL = '#scrollable-container, .ub-main-scroll, .dataTables_scrollBody, .dataTables_wrapper, .table-responsive, .ub-table-wrap';

    function getToggle($group) {
        return $group.find('[data-toggle="dropdown"]').first();
    }

    function getMenu($group) {
        return $group.find('.dropdown-menu').first();
    }

    function isTableDropdown($group) {
        return $group.closest('table, .dataTables_wrapper, .table-responsive, .ub-table-wrap, .ub-table-card').length > 0;
    }

    function placeMenu($toggle, $menu) {
        if (!$toggle.length || !$menu.length) {
            return;
        }

        $menu.css({ visibility: 'hidden', display: 'block' });

        var rect = $toggle[0].getBoundingClientRect();
        var menuWidth = $menu.outerWidth() || 200;
        var menuHeight = $menu.outerHeight() || 240;
        var gap = 4;
        var margin = 8;
        var left = rect.left;

        if ($menu.hasClass('dropdown-menu-right')) {
            left = rect.right - menuWidth;
        }

        var top = rect.bottom + gap;
        var spaceBelow = window.innerHeight - top - margin;
        var spaceAbove = rect.top - margin;

        if (menuHeight > spaceBelow && spaceAbove > spaceBelow) {
            top = Math.max(margin, rect.top - menuHeight - gap);
        }

        if (left + menuWidth > window.innerWidth - margin) {
            left = Math.max(margin, window.innerWidth - menuWidth - margin);
        }

        var maxHeight = Math.max(120, window.innerHeight - top - margin);

        $menu.css({
            position: 'fixed',
            top: top + 'px',
            left: left + 'px',
            right: 'auto',
            bottom: 'auto',
            width: menuWidth + 'px',
            maxHeight: maxHeight + 'px',
            overflowY: 'auto',
            overflowX: 'hidden',
            zIndex: 2147482000,
            visibility: 'visible',
            display: 'block'
        });
    }

    function restoreMenu($group, $menu) {
        if (!$menu || !$menu.length) {
            return;
        }

        $menu.removeClass(OPEN_CLASS).css({
            position: '',
            top: '',
            left: '',
            right: '',
            bottom: '',
            width: '',
            maxHeight: '',
            overflowY: '',
            overflowX: '',
            zIndex: '',
            visibility: '',
            display: ''
        });

        if ($group && $group.length) {
            $menu.appendTo($group);
        }

        $group.removeData('ub-floating-menu');
    }

    function repositionOpenMenus() {
        $('.' + OPEN_CLASS).each(function () {
            var $menu = $(this);
            var $group = $menu.data('ub-dropdown-origin');
            if (!$group || !$group.length) {
                return;
            }
            placeMenu(getToggle($group), $menu);
        });
    }

    $(document).on('shown.bs.dropdown', '.btn-group', function () {
        var $group = $(this);

        if (!isTableDropdown($group)) {
            return;
        }

        var $toggle = getToggle($group);
        var $menu = getMenu($group);

        if (!$toggle.length || !$menu.length) {
            return;
        }

        $menu.data('ub-dropdown-origin', $group);
        $group.data('ub-floating-menu', $menu);
        $menu.appendTo('body').addClass(OPEN_CLASS);
        if ($group.hasClass('ub-action-menu')) {
            $menu.addClass('ub-action-menu-dropdown');
        }
        placeMenu($toggle, $menu);
    });

    $(document).on('hide.bs.dropdown', '.btn-group', function () {
        var $group = $(this);
        var $menu = $group.data('ub-floating-menu');

        if ($menu && $menu.length) {
            restoreMenu($group, $menu);
        }
    });

    $(window).on('resize.ubDropdownFix', repositionOpenMenus);
    $(document).on('scroll.ubDropdownFix', SCROLL_SEL, repositionOpenMenus);

    $(document).on('click.ubDropdownFix', '.' + OPEN_CLASS + ' a', function () {
        var $menu = $(this).closest('.' + OPEN_CLASS);
        var $group = $menu.data('ub-dropdown-origin');
        if ($group && $group.length) {
            $group.removeClass('open');
            getToggle($group).attr('aria-expanded', 'false');
            restoreMenu($group, $menu);
        }
    });

    /* Select2 — keep open menus above scroll containers / cards */
    function bumpSelect2ZIndex() {
        $('.select2-container--open').each(function () {
            this.style.zIndex = '2147482000';
        });
        $('.select2-dropdown').css('z-index', '2147482001');
    }

    $(document).on('select2:open.ubSelect2Fix', function () {
        requestAnimationFrame(bumpSelect2ZIndex);
        setTimeout(bumpSelect2ZIndex, 0);
    });

    $(document).on('select2:close.ubSelect2Fix', function () {
        $('.select2-container').each(function () {
            if (!$(this).hasClass('select2-container--open')) {
                this.style.zIndex = '';
            }
        });
    });

    function ensureSelect2($select) {
        if (!$select.length || !$select.hasClass('select2')) {
            return null;
        }

        if (!$select.hasClass('select2-hidden-accessible')) {
            if (typeof __select2 === 'function') {
                __select2($select);
            } else {
                $select.select2({ width: '100%', dropdownParent: $(document.body) });
            }
        }

        return $select;
    }

    $(document).on('mousedown.ubSelect2Fix', '.select2-container .select2-selection', function () {
        var $select = $(this).closest('.select2-container').prev('select.select2');

        if (!$select.length || !$select.hasClass('select2')) {
            return;
        }

        // Multi-select + forced re-open caused dropdown/selection blink (toggle closed).
        if ($select.prop('multiple')) {
            ensureSelect2($select);
            return;
        }

        var $ready = ensureSelect2($select);

        if (!$ready || $ready.prop('disabled')) {
            return;
        }
    });
})(window.jQuery);
