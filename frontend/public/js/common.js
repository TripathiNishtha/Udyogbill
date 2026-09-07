//This file contains all common functionality for the application
$(document).on('submit', 'form', function (e) {
    if (!__is_online()) {
        e.preventDefault();
        toastr.error(LANG.not_connected_to_a_network);
        return false;
    }

    $(this).find('button[type="submit"]').attr('disabled', true);
});
$(document).ready(function () {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    $.ajaxSetup({
        beforeSend: function (jqXHR, settings) {
            if (!__is_online()) {
                toastr.error(LANG.not_connected_to_a_network);
                return false;
            }
            if (settings.url.indexOf('http') === -1) {
                settings.url = base_path + settings.url;
            }
        },
    });

    update_font_size();
    if ($('#status_span').length) {
        var status = $('#status_span').attr('data-status');
        if (status === '1') {
            toastr.success($('#status_span').attr('data-msg'));
        } else if (status == '' || status === '0') {
            toastr.error($('#status_span').attr('data-msg'));
        }
    }

    //Default setting for select2
    $.fn.select2.defaults.set('minimumResultsForSearch', 6);
    if ($('html').attr('dir') == 'rtl') {
        $.fn.select2.defaults.set('dir', 'rtl');
    }
    $.fn.datepicker.defaults.todayHighlight = true;
    $.fn.datepicker.defaults.autoclose = true;
    $.fn.datepicker.defaults.format = datepicker_date_format;

    //Toastr setting
    toastr.options.preventDuplicates = true;
    toastr.options.timeOut = '3000';

    //Play notification sound on success, error and warning
    toastr.options.onShown = function () {
        if ($(this).hasClass('toast-success')) {
            var audio = $('#success-audio')[0];
            if (audio !== undefined) {
                audio.play();
            }
        } else if ($(this).hasClass('toast-error')) {
            var audio = $('#error-audio')[0];
            if (audio !== undefined) {
                audio.play();
            }
        } else if ($(this).hasClass('toast-warning')) {
            var audio = $('#warning-audio')[0];
            if (audio !== undefined) {
                audio.play();
            }
        }
    };

    //Default setting for jQuey validator
    jQuery.validator.setDefaults({
        errorPlacement: function (error, element) {
            if (element.hasClass('select2') && element.parent().hasClass('input-group')) {
                error.insertAfter(element.parent());
            } else if (element.hasClass('select2')) {
                error.insertAfter(element.next('span.select2-container'));
            } else if (element.parent().hasClass('input-group')) {
                error.insertAfter(element.parent());
            } else if (element.parent().hasClass('multi-input')) {
                error.insertAfter(element.closest('.multi-input'));
            } else if (element.parent().hasClass('input_inline')) {
                error.insertAfter(element.parent());
            } else if (element.hasClass('upload-element')) {
                error.insertAfter(element.closest('.input-group'));
            } else {
                error.insertAfter(element);
            }
        },

        invalidHandler: function () {
            toastr.error(LANG.some_error_in_input_field);
        },
    });

    jQuery.validator.addMethod(
        'max-value',
        function (value, element, param) {
            var is_draft = false;
            if (
                $(element).hasClass('pos_quantity') &&
                $('select#status').length &&
                $('select#status').val() !== 'final'
            ) {
                is_draft = true;
            }
            return is_draft || this.optional(element) || !(param < __number_uf(value));
        },
        function (params, element) {
            return $(element).data('msg-max-value');
        }
    );

    jQuery.validator.addMethod('abs_digit', function (value, element) {
        return this.optional(element) || Number.isInteger(Math.abs(__number_uf(value)));
    });

    //Set global currency to be used in the application
    __currency_symbol = $('input#__symbol').val();
    __currency_thousand_separator = $('input#__thousand').val();
    __currency_decimal_separator = $('input#__decimal').val();
    __currency_symbol_placement = $('input#__symbol_placement').val();
    if ($('input#__precision').length > 0) {
        __currency_precision = $('input#__precision').val();
    } else {
        __currency_precision = 2;
    }

    if ($('input#__quantity_precision').length > 0) {
        __quantity_precision = $('input#__quantity_precision').val();
    } else {
        __quantity_precision = 2;
    }

    //Set page level currency to be used for some pages. (Purchase page)
    if ($('input#p_symbol').length > 0) {
        __p_currency_symbol = $('input#p_symbol').val();
        __p_currency_thousand_separator = $('input#p_thousand').val();
        __p_currency_decimal_separator = $('input#p_decimal').val();
    }

    __currency_convert_recursively($(document), $('input#p_symbol').length);

    // Simple function to remove currency symbol and HTML tags from string
    function __remove_currency_symbol(str) {
        // DataTables can pass numbers, objects, null - convert all to string
        if (typeof str !== 'string') {
            str = String(str);
        }
        
        // HTML REMOVAL: Simple regex to remove HTML tags
        str = str.replace(/<[^>]*>/g, ''); 
        
        // Check 1: Variable exists, Check 2: Has value, Check 3: Symbol present in string
        if (typeof __currency_symbol !== 'undefined' && __currency_symbol && str.includes(__currency_symbol)) {
            // SIMPLE REPLACEMENT: Replace all occurrences of currency symbol with empty string
            str = str.split(__currency_symbol).join('');  
        }
        
        return str.trim();
    }

    var buttons = [
        // {
        //     extend: 'copy',
        //     text: '<i class="fa fa-files-o" aria-hidden="true"></i> ' + LANG.copy,
        //     className: 'btn-sm',
        //     exportOptions: {
        //         columns: ':visible',
        //     },
        //     footer: true,
        // },
        {
            extend: 'csv',
            text: '<i class="fa fa-file-csv" aria-hidden="true"></i> ' + LANG.export_to_csv,
            className: 'tw-dw-btn-xs  tw-dw-btn tw-dw-btn-outline tw-my-2',
            exportOptions: {
                columns: ':visible',
                format: {
                    body: function(data, row, column, node) {
                        // Check if the node or its children have data-is_quantity="true"
                        var $node = $(node);
                        var $quantityElement = $node.find('[data-is_quantity="true"]');
                        
                        if ($quantityElement.length > 0) {
                            return $quantityElement.attr('data-orig-value');
                        }
                        // Remove currency symbol from the cell data
                        return __remove_currency_symbol(data);
                    },
                    footer: function(data, row, column, node) {
                        // Remove currency symbol from the footer data
                        return __remove_currency_symbol(data);
                    }
                }
            },
            footer: true,
        },
        {
            extend: 'excel',
            text: '<i class="fa fa-file-excel" aria-hidden="true"></i> ' + LANG.export_to_excel,
            className: 'tw-dw-btn-xs  tw-dw-btn tw-dw-btn-outline tw-my-2',
            exportOptions: {
                columns: ':visible',
                format: {
                    body: function(data, row, column, node) {
                        // Check if the node or its children have data-is_quantity="true"
                        var $node = $(node);
                        var $quantityElement = $node.find('[data-is_quantity="true"]');
                        if ($quantityElement.length > 0) {
                            return $quantityElement.attr('data-orig-value');
                        }
                        // Remove currency symbol from the cell data
                        return __remove_currency_symbol(data);
                    },
                    footer: function(data, row, column, node) {
                        // Remove currency symbol from the footer data
                        return __remove_currency_symbol(data);
                    }
                }
            },
            footer: true,
        },
        {
            extend: 'print',
            text: '<i class="fa fa-print" aria-hidden="true"></i> ' + LANG.print,
            className: 'tw-dw-btn-xs  tw-dw-btn tw-dw-btn-outline tw-my-2',
            exportOptions: {
                columns: ':visible',
                stripHtml: true,
            },
            footer: true,
            customize: function (win) {
                if ($('.print_table_part').length > 0) {
                    $($('.print_table_part').html()).insertBefore(
                        $(win.document.body).find('table')
                    );
                }
                if ($(win.document.body).find('table.hide-footer').length) {
                    $(win.document.body).find('table.hide-footer tfoot').remove();
                }
                __currency_convert_recursively($(win.document.body).find('table'));
            },
        },
        {
            extend: 'colvis',
            text: '<i class="fa fa-columns" aria-hidden="true"></i> ' + LANG.col_vis,
            className: 'tw-dw-btn-xs  tw-dw-btn tw-dw-btn-outline tw-my-2',
        },
    ];

    var pdf_btn = {
        extend: 'pdf',
        text: '<i class="fa fa-file-pdf" aria-hidden="true"></i> ' + LANG.export_to_pdf,
        className: 'tw-dw-btn-xs  tw-dw-btn tw-dw-btn-outline tw-my-2',
        exportOptions: {
            columns: ':visible',
        },
        footer: true,
    };

    if (non_utf8_languages.indexOf(app_locale) == -1) {
        buttons.push(pdf_btn);
    }

    if ($('#view_export_buttons').length < 1) {
        buttons = [];
    }
    //Datables
    jQuery.extend($.fn.dataTable.defaults, {
        deferRender: true,
        //Uncomment below line to enable save state of datatable.
        //stateSave: true,
        fixedHeader: true,
        dom: '<"row margin-bottom-20"<"col-sm-2 col-md-2"l><"col-sm-7 col-md-7"B><"col-sm-3 col-md-3"f> r>tip',
        buttons: buttons,
        aLengthMenu: [
            [25, 50, 100, 200, 500, 1000, -1],
            [25, 50, 100, 200, 500, 1000, LANG.all],
        ],
        iDisplayLength: __default_datatable_page_entries,
        language: {
            searchPlaceholder: LANG.search + ' ...',
            search: '',
            lengthMenu: LANG.show + ' _MENU_ ' + LANG.entries,
            emptyTable: LANG.table_emptyTable,
            info: LANG.table_info,
            infoEmpty: LANG.table_infoEmpty,
            loadingRecords: LANG.table_loadingRecords,
            processing: LANG.table_processing,
            zeroRecords: LANG.table_zeroRecords,
            paginate: {
                first: LANG.first,
                last: LANG.last,
                next: LANG.next,
                previous: LANG.previous,
            },
        },
    });

   

    if ($('input#iraqi_selling_price_adjustment').length > 0) {
        iraqi_selling_price_adjustment = true;
    } else {
        iraqi_selling_price_adjustment = false;
    }

    //Input number
    $(document).on(
        'click',
        '.input-number .quantity-up, .input-number .quantity-down',
        function () {
            var input = $(this).closest('.input-number').find('input');
            var qty = __read_number(input);
            var step = 1;
            if (input.data('step')) {
                step = input.data('step');
            }
            var min = parseFloat(input.data('min'));
            var max = parseFloat(input.data('max'));

            if ($(this).hasClass('quantity-up')) {
                //if max reached return false
                if (typeof max != 'undefined' && qty + step > max) {
                    return false;
                }

                __write_number(input, qty + step);
                input.change();
            } else if ($(this).hasClass('quantity-down')) {
                //if max reached return false
                if (typeof min != 'undefined' && qty - step < min) {
                    return false;
                }

                __write_number(input, qty - step);
                input.change();
            }
        }
    );

    $('div.pos-tab-menu>div.list-group>a').click(function (e) {
        e.preventDefault();
        $(this).siblings('a.active').removeClass('active');
        $(this).addClass('active');
        var index = $(this).index();
        $('div.pos-tab>div.pos-tab-content').removeClass('active');
        $('div.pos-tab>div.pos-tab-content').eq(index).addClass('active');
    });

    $('.scroll-top-bottom').each(function () {
        $(this).topScrollbar();
    });

    $('.datetimepicker').datetimepicker({
        format: moment_date_format + ' ' + moment_time_format,
        ignoreReadonly: true,
    });
});

//Default settings for daterangePicker
var ranges = {};
ranges[LANG.today] = [moment(), moment()];
ranges[LANG.yesterday] = [moment().subtract(1, 'days'), moment().subtract(1, 'days')];
ranges[LANG.last_7_days] = [moment().subtract(6, 'days'), moment()];
ranges[LANG.last_30_days] = [moment().subtract(29, 'days'), moment()];
ranges[LANG.this_month] = [moment().startOf('month'), moment().endOf('month')];
ranges[LANG.last_month] = [
    moment().subtract(1, 'month').startOf('month'),
    moment().subtract(1, 'month').endOf('month'),
];
ranges[LANG.this_month_last_year] = [
    moment().subtract(1, 'year').startOf('month'),
    moment().subtract(1, 'year').endOf('month'),
];
ranges[LANG.this_year] = [moment().startOf('year'), moment().endOf('year')];
ranges[LANG.last_year] = [
    moment().startOf('year').subtract(1, 'year'),
    moment().endOf('year').subtract(1, 'year'),
];
ranges[LANG.this_financial_year] = [financial_year.start, financial_year.end];
ranges[LANG.last_financial_year] = [
    moment(financial_year.start._i).subtract(1, 'year'),
    moment(financial_year.end._i).subtract(1, 'year'),
];

var dateRangeSettings = {
    showDropdowns : true,
    linkedCalendars : false,
    ranges: ranges,
    startDate: financial_year.start,
    endDate: financial_year.end,
    locale: {
        cancelLabel: LANG.clear,
        applyLabel: LANG.apply,
        customRangeLabel: LANG.custom_range,
        format: moment_date_format,
        toLabel: '~',
    },
};

//Check for number string in input field, if data-decimal is 0 then don't allow decimal symbol and if no_neg then don't allow  negative value
$(document).on('keypress', 'input.input_number', function (event) {
    var is_decimal = $(this).data('decimal');

    if (is_decimal == 0) {
        if (__currency_decimal_separator == '.') {
            var regex = new RegExp(/^[0-9,-]+$/);
        } else {
            var regex = new RegExp(/^[0-9.-]+$/);
        }
    } else {
        var regex = new RegExp(/^[0-9.,-]+$/);
    }

    // Check for no negative values
    if(is_decimal == 'no_neg'){
        var regex = new RegExp(/^[0-9.,]+$/);
    }

    var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
    if (!regex.test(key)) {
        event.preventDefault();
        return false;
    }
});

//Select all input values on click
$(document).on('click', 'input', function (event) {
    $(this).select();
});

$(document).on('click', '.toggle-font-size', function (event) {
    localStorage.setItem('upos_font_size', $(this).data('size'));
    update_font_size();
});
$(document).on('click', '.sidebar-toggle', function () {
    var sidebar_collapse = localStorage.getItem('ub_sidebar_collapse');
    if (sidebar_collapse === null) {
        sidebar_collapse = localStorage.getItem('upos_sidebar_collapse');
    }
    if ($('body').hasClass('sidebar-collapse')) {
        localStorage.setItem('ub_sidebar_collapse', 'false');
        localStorage.setItem('upos_sidebar_collapse', 'false');
    } else {
        localStorage.setItem('ub_sidebar_collapse', 'true');
        localStorage.setItem('upos_sidebar_collapse', 'true');
    }
});

//Ask for confirmation for links
$(document).on('click', 'a.link_confirmation', function (e) {
    e.preventDefault();
    swal({
        title: LANG.sure,
        icon: 'warning',
        buttons: true,
        dangerMode: true,
    }).then((confirmed) => {
        if (confirmed) {
            window.location.href = $(this).attr('href');
        }
    });
});

//Change max quantity rule if lot number changes
$('table#stock_adjustment_product_table tbody').on('change', 'select.lot_number', function () {
    var tr = $(this).closest('tr');
    var qty_element = tr.find('input.product_quantity');
    var qty_available_el = tr.find('.qty_available_text');

    var multiplier = 1;
    var unit_name = '';
    var sub_unit_length = tr.find('select.sub_unit').length;
    if (sub_unit_length > 0) {
        var select = tr.find('select.sub_unit');
        multiplier = parseFloat(select.find(':selected').data('multiplier'));
        unit_name = select.find(':selected').data('unit_name');
    }

    if ($(this).val()) {
        var lot_qty = $('option:selected', $(this)).data('qty_available');
        var max_err_msg = $('option:selected', $(this)).data('msg-max');

        if (sub_unit_length > 0) {
            lot_qty = lot_qty / multiplier;
            var lot_qty_formated = __number_f(lot_qty, false);
            max_err_msg = __translate('lot_max_qty_error', {
                max_val: lot_qty_formated,
                unit_name: unit_name,
            });
        }

        qty_element.attr('data-rule-max-value', lot_qty);
        qty_element.attr('data-msg-max-value', max_err_msg);

        qty_element.rules('add', {
            'max-value': lot_qty,
            messages: {
                'max-value': max_err_msg,
            },
        });
        if (qty_available_el.length) {
            qty_available_el.text(__currency_trans_from_en(lot_qty, false));
        }
    } else {
        var default_qty = qty_element.data('qty_available');
        var default_err_msg = qty_element.data('msg_max_default');

        if (sub_unit_length > 0) {
            default_qty = default_qty / multiplier;
            var lot_qty_formated = __number_f(default_qty, false);
            default_err_msg = __translate('pos_max_qty_error', {
                max_val: lot_qty_formated,
                unit_name: unit_name,
            });
        }

        qty_element.attr('data-rule-max-value', default_qty);
        qty_element.attr('data-msg-max-value', default_err_msg);

        qty_element.rules('add', {
            'max-value': default_qty,
            messages: {
                'max-value': default_err_msg,
            },
        });

        if (qty_available_el.length) {
            qty_available_el.text(__currency_trans_from_en(default_qty, false));
        }
    }
    qty_element.trigger('change');
});
$('button#btnCalculator, button#return_sale').hover(function () {
    $(this).tooltip('show');
});
$('button#return_sale').click(function () {
    $(this).popover('toggle');
});
$('button#service_staff_replacement').click(function () {
    $(this).popover('toggle');
});
$(document).on('mouseleave', 'button#btnCalculator, button#return_sale', function (e) {
    $(this).tooltip('hide');
});

jQuery.validator.addMethod(
    'min-value',
    function (value, element, param) {
        return this.optional(element) || !(param > __number_uf(value));
    },
    function (params, element) {
        return $(element).data('min-value');
    }
);

$(document).on('click', '.view_uploaded_document', function (e) {
    e.preventDefault();
    var src = $(this).data('href');
    var html =
        '<div class="modal-dialog" role="document"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button></div><div class="modal-body"><img src="' +
        src +
        '" class="img-responsive" alt="Uploaded Document"></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button> <a href="' +
        src +
        '" class="btn btn-success" download=""><i class="fa fa-download"></i> Download</a></div></div></div>';
    $('div.view_modal').html(html).modal('show');
});

$(document).on('click', '#accordion .box-header', function (e) {
    if (e.target.tagName == 'A' || e.target.tagName == 'I') {
        return false;
    }
    $(this).find('.box-title a').click();
});

$(document).on('shown.bs.modal', '.contains_select2, .view_modal', function () {
    $(this)
        .find('.select2')
        .each(function () {
            var $el = $(this);
            var $p = $el.closest('.modal').length ? $el.closest('.modal') : $el.parent();

            if ($el.hasClass('select2-hidden-accessible')) {
                $el.select2('destroy');
            }

            $el.select2({ dropdownParent: $p, width: '100%' });
        });
});

//common configuration : tinyMCE editor

tinymce.overrideDefaults({
    height: 300,
    language: app_locale, // Set language dynamically
    language_url: base_path + '/js/lang/tiny/' + app_locale + '.js', // Dynamic URL
    theme: 'silver',
    plugins: [
        'advlist autolink link image lists charmap print preview hr anchor pagebreak',
        'searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking',
        'table template paste help',
    ],
    toolbar:
        'undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify |' +
        ' bullist numlist outdent indent | link image | print preview media fullpage | ' +
        'forecolor backcolor',
    menu: {
        favs: { title: 'My Favorites', items: 'code | searchreplace' },
    },
    menubar: 'favs file edit view insert format tools table help',
});

// Prevent Bootstrap dialog from blocking focusin
$(document).on('focusin', function (e) {
    if ($(e.target).closest('.tox-tinymce-aux, .moxman-window, .tam-assetmanager-root, .select2-container').length) {
        e.stopImmediatePropagation();
    }
});

//search parameter in url
function urlSearchParam(param) {
    var results = new RegExp('[?&]' + param + '=([^&#]*)').exec(window.location.href);
    if (results == null) {
        return null;
    } else {
        return results[1];
    }
}

// For dropdown hidden issue
// (function() {
//   var dropdownMenu;
//   $('table').on('show.bs.dropdown', function(e) {
//     dropdownMenu = $(e.target).find('.dropdown-menu');
//     $('body').append(dropdownMenu.detach());
//     var eOffset = $(e.target).offset();
//     if(dropdownMenu.hasClass('dropdown-menu-right')) {
//         dropdownMenu.css({
//             'display': 'block',
//             'top': eOffset.top + $(e.target).outerHeight(),
//             'left': 'auto',
//             'right': 0
//         });
//     } else {
//         dropdownMenu.css({
//             'display': 'block',
//             'top': eOffset.top + $(e.target).outerHeight(),
//             'left': eOffset.left
//         });
//     }
//   });
//   $('table').on('hide.bs.dropdown', function(e) {
//     $(e.target).append(dropdownMenu.detach());
//     dropdownMenu.hide();
//   });
// })();

function updateOnlineStatus() {
    if (!__is_online()) {
        $('#online_indicator').removeClass('text-success');
        $('#online_indicator').addClass('text-danger');
    } else {
        $('#online_indicator').removeClass('text-danger');
        $('#online_indicator').addClass('text-success');
    }
}

$(document).on('change', '.cash_denomination', function () {
    var total = 0;
    var table = $(this).closest('table');
    table.find('tbody tr').each(function () {
        var denomination = parseFloat($(this).find('.cash_denomination').attr('data-denomination'));
        var count = $(this).find('.cash_denomination').val()
            ? parseInt($(this).find('.cash_denomination').val())
            : 0;
        var subtotal = denomination * count;
        total = total + subtotal;
        $(this).find('span.denomination_subtotal').text(__currency_trans_from_en(subtotal, true));
    });

    table.find('span.denomination_total').text(__currency_trans_from_en(total, true));
    table.find('input.denomination_total_amount').val(total);
});

//autofocus select2 search input
let forceFocusFn = function () {
    // Gets the search input of the opened select2
    var searchInput = document.querySelector('.select2-container--open .select2-search__field');
    // If exists
    if (searchInput) searchInput.focus(); // focus
};

// Every time a select2 is opened
$(document).on('select2:open', () => {
    // We use a timeout because when a select2 is already opened and you open a new one, it has to wait to find the appropiate
    setTimeout(() => forceFocusFn(), 200);
});

function copyToClipboard(element_id) {
    var temp = $('<input>');
    $('body').append(temp);
    temp.val($('#' + element_id).text()).select();
    document.execCommand('copy');
    temp.remove();
    toastr.success(LANG.copied_to_clipboard);
}

// This function escapes HTML characters in a given string to prevent XSS attacks.
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ----- UdyogBill: E-way JSON download from invoice preview -----
window.ubDownloadEwayJsonFromContainer = function (container) {
    try {
        if (!container) {
            return false;
        }

        var payloadEl = container.querySelector
            ? container.querySelector('script.ub-eway-json-payload')
            : null;

        if (!payloadEl && window.jQuery) {
            payloadEl = window.jQuery(container).find('script.ub-eway-json-payload').get(0);
        }

        if (!payloadEl || !payloadEl.textContent) {
            return false;
        }

        var payload = JSON.parse(payloadEl.textContent);
        var invoiceNo = payload.docNo || 'invoice';
        var jsonStr = JSON.stringify(payload, null, 2);
        var blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'eway_' + invoiceNo + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        return true;
    } catch (e) {
        if (console && console.error) {
            console.error(e);
        }

        return false;
    }
};

window.ubDownloadEwayJsonFromPreview = function () {
    var section = document.getElementById('ub_print_preview_section');
    if (!section) {
        return false;
    }

    var block = section.querySelector('.ub-eway-json-actions');
    if (!block) {
        return false;
    }

    return window.ubDownloadEwayJsonFromContainer(block);
};

// ----- UdyogBill: Live print preview (UI only) -----
window.ubFitPrintPreviewToView = function () {
    try {
        var frame = document.getElementById('ub_print_preview_frame');
        var outer = document.getElementById('ub_print_preview_scale_outer');
        var section = document.getElementById('ub_print_preview_section');
        if (!frame || !outer || !section) {
            return;
        }

        outer.style.transform = 'none';
        outer.style.width = '100%';
        outer.style.height = 'auto';
        outer.style.marginBottom = '0';

        var availH = frame.clientHeight - 20;
        var availW = frame.clientWidth - 20;
        var contentH = section.scrollHeight;
        var contentW = section.scrollWidth;
        if (!availH || !availW || !contentH || !contentW) {
            return;
        }

        var scale = Math.min(availH / contentH, availW / contentW, 1);
        scale = Math.floor(scale * 1000) / 1000;

        if (scale < 0.995) {
            outer.style.transform = 'scale(' + scale + ')';
            outer.style.transformOrigin = 'top center';
            outer.style.width = '100%';
            outer.style.height = (contentH * scale) + 'px';
        }
    } catch (e) {
        if (console && console.error) {
            console.error(e);
        }
    }
};

window.ubOpenPrintPreview = function (options) {
    try {
        if (!options || !options.html) {
            return false;
        }

        var $modal = $('#ub_print_preview_modal');
        if (!$modal.length) {
            return false;
        }

        var title = options.title || document.title || '';
        var meta = options.meta || '';

        $('#ub_print_preview_meta').text(meta || title);
        $('#ub_print_preview_section').html(options.html);
        __currency_convert_recursively($('#ub_print_preview_section'));

        var hasEwayJson = $('#ub_print_preview_section .ub-eway-json-payload').length > 0;
        $('#ub_print_preview_eway_json_btn').toggle(hasEwayJson);

        $modal.modal('show');

        var fitPreview = function () {
            if (typeof window.ubFitPrintPreviewToView === 'function') {
                window.ubFitPrintPreviewToView();
            }
        };

        $modal
            .off('shown.bs.modal.ub')
            .on('shown.bs.modal.ub', function () {
                fitPreview();
                setTimeout(fitPreview, 120);
                setTimeout(fitPreview, 400);
            });

        $(window)
            .off('resize.ubPrintPreview')
            .on('resize.ubPrintPreview', fitPreview);

        // Important: invoice html contains <style> tags (often with body rules).
        // Remove injected preview html when modal closes so page typography resets.
        $modal
            .off('hidden.bs.modal.ub')
            .on('hidden.bs.modal.ub', function () {
                $(window).off('resize.ubPrintPreview');
                var outer = document.getElementById('ub_print_preview_scale_outer');
                if (outer) {
                    outer.style.transform = 'none';
                    outer.style.height = 'auto';
                }
                $('#ub_print_preview_section').html('');
                $('#ub_print_preview_meta').text('');
                $('#ub_print_preview_eway_json_btn').hide();
                if ($('#receipt_section').length) {
                    $('#receipt_section').html('').removeAttr('style');
                }
            });

        $('#ub_print_preview_eway_json_btn')
            .off('click.ub')
            .on('click.ub', function () {
                window.ubDownloadEwayJsonFromPreview();
            });

        $('#ub_print_preview_print_btn')
            .off('click.ub')
            .on('click.ub', function () {
                var $tmp = $('<div>').html(options.html);
                __currency_convert_recursively($tmp);
                var htmlToPrint = $tmp.html();
                var useSilent = (typeof window.ENABLE_SILENT_DIRECT_PRINT === 'undefined' || window.ENABLE_SILENT_DIRECT_PRINT);
                var printed = useSilent && typeof __silentPrintFromHtml === 'function' && __silentPrintFromHtml(htmlToPrint);
                if (!printed) {
                    $('#receipt_section').html(htmlToPrint);
                    __print_receipt('receipt_section');
                }
                $modal.modal('hide');
            });

        return true;
    } catch (e) {
        return false;
    }
};
