var ubDashEmptyTableMsg = 'No pending items - all clear.';
var ubDashTableDom = 'rtip';

function ubDashFormatPeriodLabel(start, end) {
    var startMoment = moment(start, 'YYYY-MM-DD');
    var endMoment = moment(end, 'YYYY-MM-DD');

    if (!startMoment.isValid() || !endMoment.isValid()) {
        return 'Selected period';
    }

    if (startMoment.isSame(endMoment, 'day')) {
        return startMoment.format('D MMM YYYY');
    }

    return startMoment.format('D MMM YYYY') + ' - ' + endMoment.format('D MMM YYYY');
}

function ubDashUpdatePeriodLabels(start, end) {
    var label = ubDashFormatPeriodLabel(start, end);
    $('#dashboard_date_filter_label').text(label);
    $('#ub_dash_period_subtitle').text('Showing numbers for ' + label + '.');
}

function ubDashMetricLoaderHtml() {
    return '<span class="ub-metric-value-skeleton" aria-hidden="true"></span>';
}

function ubDashUpdateTableCount(tableSelector, badgeSelector, oSettings) {
    if (!$(badgeSelector).length) {
        return;
    }

    var count = oSettings.fnRecordsDisplay();
    $(badgeSelector).text(count > 0 ? '(' + count + ')' : '');
}

function ubDashSyncTableWrap(tableSelector, oSettings) {
    var count = oSettings.fnRecordsDisplay();
    var $wrap = $(tableSelector).closest('.ub-table-wrap');
    $wrap.toggleClass('ub-dash-table-wrap--empty', count === 0);
    $wrap.toggleClass('ub-dash-table-wrap--filled', count > 0);
}

function ubDashHighlightDueColumn(tableSelector, columnIndex) {
    $(tableSelector + ' tbody tr').each(function () {
        var $cell = $('td', this).eq(columnIndex);
        $cell.removeClass('ub-dash-due-amount--alert');
        var raw = $cell.text().replace(/[^\d.-]/g, '');
        var value = parseFloat(raw);
        if (!isNaN(value) && value > 0) {
            $cell.addClass('ub-dash-due-amount--alert');
        }
    });
}

function ubDashAfterTableDraw(tableSelector, badgeSelector, oSettings, dueColumnIndex) {
    ubDashSyncTableWrap(tableSelector, oSettings);
    if (badgeSelector) {
        ubDashUpdateTableCount(tableSelector, badgeSelector, oSettings);
    }
    if (typeof dueColumnIndex === 'number') {
        ubDashHighlightDueColumn(tableSelector, dueColumnIndex);
    }
    __currency_convert_recursively($(tableSelector));
}

function ubDashChartSeriesTotal(chart) {
    if (!chart || !chart.series || !chart.series.length) {
        return 0;
    }

    var target = chart.series[chart.series.length - 1];
    for (var i = 0; i < chart.series.length; i++) {
        if (/all location/i.test(chart.series[i].name || '')) {
            target = chart.series[i];
            break;
        }
    }

    var total = 0;
    target.data.forEach(function (point) {
        total += Number(point.y) || 0;
    });

    return total;
}

function ubDashInitChartTotals() {
    if (typeof Highcharts === 'undefined') {
        return;
    }

    Highcharts.charts.forEach(function (chart) {
        if (!chart || !chart.renderTo) {
            return;
        }

        var $card = $(chart.renderTo).closest('.ub-chart-card');
        if (!$card.length) {
            return;
        }

        var $total = $card.find('.ub-chart-period-total');
        if (!$total.length) {
            return;
        }

        var total = ubDashChartSeriesTotal(chart);
        $total.text(typeof __currency_trans_from_en === 'function'
            ? __currency_trans_from_en(total, true)
            : total.toFixed(2));
    });
}

function ubDashBindMetricCards() {
    $(document).on('click', '.ub-metric-card--link[data-metric-href]', function (event) {
        if ($(event.target).closest('i[data-toggle="popover"]').length) {
            return;
        }

        var href = $(this).attr('data-metric-href') || $(this).data('metric-href');
        if (!href) {
            return;
        }

        if (href.indexOf('#') === 0) {
            var $target = $(href);
            if ($target.length) {
                event.preventDefault();
                $('html, body').animate({ scrollTop: $target.offset().top - 80 }, 300);
            }
            return;
        }

        window.location.href = href;
    });
}

function ubDashBindDueTableRows(tableSelector) {
    $(tableSelector + ' tbody').on('click', 'tr', function (event) {
        if ($(event.target).closest('a, button, input, label').length) {
            return;
        }

        var $link = $(this).find('a.btn-modal').first();
        if ($link.length) {
            $link.trigger('click');
        }
    });
}

function ubDashInitGodownStockChart() {
    if (!$('#ub_godown_stock_chart').length) {
        return;
    }

    if (typeof Highcharts === 'undefined') {
        return;
    }

    var requestData = {};
    if ($('#stock_alert_location').length > 0 && $('#stock_alert_location').val()) {
        requestData.location_id = $('#stock_alert_location').val();
    }

    $.ajax({
        url: '/home/godown-stock-summary',
        data: requestData,
        success: function (data) {
            var totalItems = Number(data.total_items) || 0;
            var totalQuantity = Number(data.total_quantity) || 0;
            var stockByPrice = Math.max(Number(data.closing_stock_by_sp) || 0, 0);
            var stockByCost = Math.max(Number(data.closing_stock_by_pp) || 0, 0);
            var estimateProfit = Math.max(Number(data.potential_profit) || 0, 0);

            $('#ub_godown_total_items').text(
                typeof __number_f === 'function' ? __number_f(totalItems, false) : totalItems
            );
            $('#ub_godown_total_quantity').text(
                typeof __number_f === 'function' ? __number_f(totalQuantity, false) : totalQuantity
            );

            if (window.ubGodownStockChart) {
                window.ubGodownStockChart.destroy();
                window.ubGodownStockChart = null;
            }

            window.ubGodownStockChart = Highcharts.chart('ub_godown_stock_chart', {
                chart: {
                    type: 'pie',
                    backgroundColor: 'transparent',
                    height: 280,
                    spacing: [0, 0, 0, 0],
                },
                credits: { enabled: false },
                title: { text: null },
                tooltip: {
                    pointFormatter: function () {
                        var value = typeof __currency_trans_from_en === 'function'
                            ? __currency_trans_from_en(this.y, true)
                            : this.y;
                        return '<b>' + this.name + '</b>: ' + value;
                    },
                },
                plotOptions: {
                    pie: {
                        allowPointSelect: false,
                        cursor: 'default',
                        dataLabels: { enabled: false },
                        showInLegend: false,
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        size: '92%',
                    },
                },
                series: [{
                    name: 'Stock Value',
                    colorByPoint: true,
                    data: [
                        { name: 'Stock Value by Price', y: stockByPrice, color: '#7c6bb8' },
                        { name: 'Stock Value by Cost', y: stockByCost, color: '#f58220' },
                        { name: 'Estimate Profit', y: estimateProfit, color: '#94a3b8' },
                    ],
                }],
            });
        },
    });
}

$(document).ready(function() {
    ubDashBindMetricCards();
    setTimeout(ubDashInitChartTotals, 800);
    setTimeout(ubDashInitChartTotals, 2000);
    setTimeout(ubDashInitGodownStockChart, 500);

    if ($('#dashboard_date_filter').length == 1) {
        dateRangeSettings.startDate = moment();
        dateRangeSettings.endDate = moment();
        ubDashUpdatePeriodLabels(moment().format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'));

        $('#dashboard_date_filter').daterangepicker(dateRangeSettings, function(start, end) {
            var startStr = start.format('YYYY-MM-DD');
            var endStr = end.format('YYYY-MM-DD');
            ubDashUpdatePeriodLabels(startStr, endStr);
            update_statistics(startStr, endStr);
            if ($('#quotation_table').length && $('#dashboard_location').length) {
                quotation_datatable.ajax.reload();
            }
        });

        setTimeout(function () {
            update_statistics(moment().format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'));
        }, 200);
    }

    $('#dashboard_location').change( function(e) {
        var start = $('#dashboard_date_filter')
                    .data('daterangepicker')
                    .startDate.format('YYYY-MM-DD');

        var end = $('#dashboard_date_filter')
                    .data('daterangepicker')
                    .endDate.format('YYYY-MM-DD');

        update_statistics(start, end);
    });

    // Defer heavy dashboard tables so the shell paints first
    setTimeout(function () {
    if (!$('#stock_alert_table').length && !$('#purchase_payment_dues_table').length && !$('#sales_payment_dues_table').length) {
        return;
    }

    var dashTableLanguage = {
        emptyTable: ubDashEmptyTableMsg,
        zeroRecords: ubDashEmptyTableMsg,
    };

    if ($('#stock_alert_table').length) {
        var stock_alert_table = $('#stock_alert_table').DataTable({
            processing: true,
            serverSide: true,
            ordering: false,
            searching: false,
            scrollX: true,
            fixedHeader: false,
            dom: ubDashTableDom,
            language: dashTableLanguage,
            ajax: {
                "url": '/home/product-stock-alert',
                "data": function ( d ) {
                    if ($('#stock_alert_location').length > 0) {
                        d.location_id = $('#stock_alert_location').val();
                    }
                }
            },
            fnDrawCallback: function(oSettings) {
                ubDashAfterTableDraw('#stock_alert_table', '#stock_alert_count', oSettings);
            },
        });

        $('#stock_alert_table tbody').addClass('ub-dash-clickable-rows');
        $('#stock_alert_location').change( function(){
            stock_alert_table.ajax.reload();
            ubDashInitGodownStockChart();
        });
    }

    if ($('#purchase_payment_dues_table').length) {
        purchase_payment_dues_table = $('#purchase_payment_dues_table').DataTable({
        processing: true,
        serverSide: true,
        ordering: false,
        searching: false,
        scrollX: true,
        fixedHeader: false,
        dom: ubDashTableDom,
        language: dashTableLanguage,
        ajax: {
            "url": '/home/purchase-payment-dues',
            "data": function ( d ) {
                if ($('#purchase_payment_dues_location').length > 0) {
                    d.location_id = $('#purchase_payment_dues_location').val();
                }
            }
        },
        fnDrawCallback: function(oSettings) {
            ubDashAfterTableDraw('#purchase_payment_dues_table', '#purchase_payment_dues_count', oSettings, 2);
        },
    });

    ubDashBindDueTableRows('#purchase_payment_dues_table');
    $('#purchase_payment_dues_table tbody').addClass('ub-dash-clickable-rows');
        $('#purchase_payment_dues_location').change( function(){
            purchase_payment_dues_table.ajax.reload();
        });
    }

    if ($('#sales_payment_dues_table').length) {
        sales_payment_dues_table = $('#sales_payment_dues_table').DataTable({
        processing: true,
        serverSide: true,
        ordering: false,
        searching: false,
        scrollX: true,
        fixedHeader: false,
        dom: ubDashTableDom,
        language: dashTableLanguage,
        ajax: {
            "url": '/home/sales-payment-dues',
            "data": function ( d ) {
                if ($('#sales_payment_dues_location').length > 0) {
                    d.location_id = $('#sales_payment_dues_location').val();
                }
            }
        },
        columns: [
            { data: 0, defaultContent: '' },
            { data: 1, defaultContent: '' },
            { data: 2, defaultContent: '' },
            { data: 3, defaultContent: '' },
            { data: 4, defaultContent: '', orderable: false, searchable: false },
        ],
        fnDrawCallback: function(oSettings) {
            ubDashAfterTableDraw('#sales_payment_dues_table', '#sales_payment_dues_count', oSettings, 3);
        },
    });

    ubDashBindDueTableRows('#sales_payment_dues_table');
    $('#sales_payment_dues_table tbody').addClass('ub-dash-clickable-rows');
        $('#sales_payment_dues_location').change( function(){
            sales_payment_dues_table.ajax.reload();
        });
    }

    if ($('#stock_expiry_alert_table').length) {
        stock_expiry_alert_table = $('#stock_expiry_alert_table').DataTable({
        processing: true,
        serverSide: true,
        searching: false,
        scrollX: true,
        fixedHeader: false,
        dom: ubDashTableDom,
        language: dashTableLanguage,
        ajax: {
            url: '/reports/stock-expiry',
            data: function(d) {
                d.exp_date_filter = $('#stock_expiry_alert_days').val();
            },
        },
        order: [[3, 'asc']],
        columns: [
            { data: 'product', name: 'p.name' },
            { data: 'location', name: 'l.name' },
            { data: 'stock_left', name: 'stock_left' },
            { data: 'exp_date', name: 'exp_date' },
        ],
        fnDrawCallback: function(oSettings) {
            __show_date_diff_for_human($('#stock_expiry_alert_table'));
            ubDashAfterTableDraw('#stock_expiry_alert_table', '#stock_expiry_alert_count', oSettings);
        },
    });
    }

    if ($('#quotation_table').length) {
        quotation_datatable = $('#quotation_table').DataTable({
            processing: true,
            serverSide: true,
            fixedHeader:false,
            aaSorting: [[0, 'desc']],
            "ajax": {
                "url": '/sells/draft-dt?is_quotation=1',
                "data": function ( d ) {
                    if ($('#dashboard_location').length > 0) {
                        d.location_id = $('#dashboard_location').val();
                    }
                }
            },
            columnDefs: [ {
                "targets": 4,
                "orderable": false,
                "searchable": false
            } ],
            columns: [
                { data: 'transaction_date', name: 'transaction_date'  },
                { data: 'invoice_no', name: 'invoice_no'},
                { data: 'name', name: 'contacts.name'},
                { data: 'business_location', name: 'bl.name'},
                { data: 'action', name: 'action'}
            ]            
        });
    }
    }, 400);

});

function update_statistics(start, end) {
    var location_id = '';
    if ($('#dashboard_location').length > 0) {
        location_id = $('#dashboard_location').val();
    }
    var data = { start: start, end: end, location_id: location_id };
    var loader = ubDashMetricLoaderHtml();
    $('.total_purchase').html(loader);
    $('.purchase_due').html(loader).removeClass('ub-metric-value--alert');
    $('.total_sell').html(loader);
    $('.invoice_due').html(loader).removeClass('ub-metric-value--alert');
    $('.total_expense').html(loader);
    $('.total_purchase_return').html(loader);
    $('.total_sell_return').html(loader);
    $('.net').html(loader);
    $('.billing_received').html(loader);
    $('.total_sell_collect_note').prop('hidden', true).text('');
    $.ajax({
        method: 'get',
        url: '/home/get-totals',
        dataType: 'json',
        data: data,
        success: function(data) {
            //purchase details
            $('.total_purchase').html(__currency_trans_from_en(data.total_purchase, true));
            $('.purchase_due').html(__currency_trans_from_en(data.purchase_due, true));
            if (parseFloat(data.purchase_due || 0) > 0) {
                $('.purchase_due').addClass('ub-metric-value--alert');
            }

            //sell details
            $('.total_sell').html(__currency_trans_from_en(data.total_sell, true));
            $('.invoice_due').html(__currency_trans_from_en(data.invoice_due, true));
            if (parseFloat(data.invoice_due || 0) > 0) {
                $('.invoice_due').addClass('ub-metric-value--alert');
            }
            //expense details
            $('.total_expense').html(__currency_trans_from_en(data.total_expense, true));
            var total_purchase_return = data.total_purchase_return - data.total_purchase_return_paid;
            $('.total_purchase_return').html(__currency_trans_from_en(total_purchase_return, true));
            var total_sell_return_due = data.total_sell_return - data.total_sell_return_paid;
            $('.total_sell_return').html(__currency_trans_from_en(total_sell_return_due, true));
            $('.total_sr').html(__currency_trans_from_en(data.total_sell_return, true));
            $('.total_srp').html(__currency_trans_from_en(data.total_sell_return_paid, true));
            $('.total_pr').html(__currency_trans_from_en(data.total_purchase_return, true));
            $('.total_prp').html(__currency_trans_from_en(data.total_purchase_return_paid, true));
            $('.net').html(__currency_trans_from_en(data.net, true));
            // Amount received = billing total - buyer due (fallback if API key missing)
            var billing_received = (typeof data.billing_received !== 'undefined' && data.billing_received !== null)
                ? data.billing_received
                : (parseFloat(data.total_sell || 0) - parseFloat(data.invoice_due || 0));
            $('.billing_received').html(__currency_trans_from_en(billing_received, true));

            var collectGap = parseFloat(data.total_sell || 0) - parseFloat(billing_received || 0);
            if (collectGap > 0.009) {
                $('.total_sell_collect_note')
                    .text(__currency_trans_from_en(collectGap, true) + ' still to collect')
                    .prop('hidden', false);
            }

            // assign tooltip total_sell_return 
            var lang = $('#total_srp').data('value');
            var splitlang = lang.split('-');
            
            var newContent = "<p class='mb-0 text-muted fs-10 mt-5'>" + splitlang[0] + ": <span class=''>" + __currency_trans_from_en(data.total_sell_return, true) + "</span><br>" + splitlang[1] + ": <span class=''>" + __currency_trans_from_en(data.total_sell_return_paid, true) + "</span></p>";
            $('#total_srp').attr('data-content', newContent)
            // assign tooltip total_purchase_return 
            var lang = $('#total_prp').data('value');
            var splitlang = lang.split('-');
            
            var newContent = "<p class='mb-0 text-muted fs-10 mt-5'>" + splitlang[0] + ": <span class=''>" + __currency_trans_from_en(data.total_purchase_return, true) + "</span><br>" + splitlang[1] + ": <span class=''>" + __currency_trans_from_en(data.total_purchase_return_paid, true) + "</span></p>";
            
            $('#total_prp').attr('data-content', newContent);

        },
    });
}
