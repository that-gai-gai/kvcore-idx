kvCORE.Mortgage_Calculator = (new function ($, kv) {
	var $calculatorContainer = $('#kv-mortgage-calculator');
    var monthsPerYear = 12;
    var lastListPrice = 0;
    var lastDownPayment = 0;

    this.init = function (listing, $target) {
        if (kv.isEmpty(listing)) {
            listing = listing.data.price ? listing.data : {price: '500000'};            
        }
	    if (kv.isEmpty($target)) {
		    $target = $calculatorContainer;
	    }

        var listingPrice = parseInt(listing.price, 10);
        lastListPrice = listingPrice;
        lastDownPayment = listingPrice * 0.2;
        var propertyTax = !listing.taxes ? listingPrice * 0.005 : listing.taxes;
        var data = {
            price: formatPrice(listingPrice, 0),
            price_numeric: listingPrice,
            price_min: 100000,
            price_max: listingPrice * 2,
            interest_rate: formatPercent(4.25, 2),
            down_payment: formatPrice(lastDownPayment, 2),
            down_payment_percent: formatPercent(20),
	        property_taxes: formatPrice(propertyTax),
            insurance: formatPrice(0),
            pmi: formatPrice(0),
            extra_payment: formatPrice(0),
	        chart_id: 'kv-mortgage-calculator-chart-' + Math.random().toString(36).replace(/[^a-z]+/g, '')
        };

	    kv.View.render('mortgage-calculator', data, $target, function() {
		    var $input = $target.find('#kv-mortgage-calculator-form');
		    var $output = $target.find('#kv-mortgage-calculator-report');

		    bindMortgageCalculator($input, $output, data.chart_id);
	    });
    };

    function bindMortgageCalculator($input, $output, chartId) {
        calculateOutput($input, $output, chartId);

        $input.on("keyup", "input", function () {
            var $this = $(this);
            var fieldName = $this.attr('name');

            if ('down-payment-amount' === fieldName) {
                updateDownPaymentPercent($input, $this);
            } else if ('down-payment-percent' === fieldName) {
                updateDownPaymentAmount($input, $this);
            }

            calculateOutput($input, $output, chartId);
        });
        $input.on("blur", "input:not([name='list-price'])", function () {
            var $this = $(this);
            var fieldName = $this.attr("name");
            var val = formatInput(fieldName, $input);

            if ("interest-rate" === fieldName || 'down-payment-percent' === fieldName) {
                $this.val(formatPercent(val));
            } else {
                $this.val(formatPrice(val));
            }
        });
        $input.on("change", "select", function () {
            calculateOutput($input, $output, chartId);
        });
        $input.on("input", "[name='list-price']", function() {
            var $this = $(this);
            var listPrice = $this.val();
            var displayPrice = formatPrice(listPrice, 0);

	        $input.find("[data-value='price']").html(displayPrice);

            calculateOutput($input, $output, chartId);
        });

        $input.on('click', '.kv-mortgage-calculator-form-show-advanced-options', function(e){
            e.preventDefault();

	        $input.find('.kv-mortgage-calculator-form-advanced-options').removeClass('kv-hidden');
            $(this).addClass('kv-hidden');
        });
    }

    function calculateOutput($input, $output, chartId) {
        var listPrice = formatInput("list-price", $input),
            interestRate = formatInput("interest-rate", $input) / 100,
            downPayment = formatInput("down-payment-amount", $input),
            paymentTerm = formatInput("payment-term", $input),
            yearlyTaxes = formatInput("property-taxes", $input),
            insurance = formatInput("insurance", $input),
            pmi = formatInput("pmi", $input),
            extraPayment = formatInput("extra-payment", $input);

        var priceDownPaymentChanged = false;
        if (listPrice !== lastListPrice || downPayment !== lastDownPayment) {
            priceDownPaymentChanged = true;
            lastListPrice = listPrice;
            lastDownPayment = downPayment;
        }

        var monthlyPrincipal = calculateMonthlyPrincipal(
            listPrice,
            downPayment,
            paymentTerm,
            interestRate
        );

        var yearlyPrincipal = calculateYearlyPrincipal(monthlyPrincipal);
        var totalPrincipal = calculateTotalPrincipal(monthlyPrincipal, paymentTerm);

        var monthlyTaxes = calculateMonthlyTaxes(yearlyTaxes);
        var totalTaxes = calculateTotalTaxes(yearlyTaxes, paymentTerm);

	    var calculatedYearlyInsurance = calculateYearlyInsurance(listPrice, downPayment);
	    var yearlyInsurance = priceDownPaymentChanged
            ? calculatedYearlyInsurance
            : insurance !== 0
                ? insurance
                : calculatedYearlyInsurance;
	    var monthlyInsurancePMI = pmi + (yearlyInsurance / 12);
	    var yearlyInsurancePMI = monthlyInsurancePMI * 12;
	    var totalInsurancePMI = yearlyInsurancePMI * paymentTerm;

        var monthlyOther = extraPayment;
        var yearlyOther = extraPayment * 12;
        var totalOther = yearlyOther * paymentTerm;

        var monthlyTotal =
            monthlyPrincipal + monthlyTaxes + monthlyInsurancePMI + monthlyOther;
        var yearlyTotal = yearlyPrincipal + yearlyTaxes + yearlyInsurancePMI + yearlyOther;
        var totalTotal = totalPrincipal + totalTaxes + totalInsurancePMI + totalOther;

        var fields = {
            "monthly-total": formatPrice(monthlyTotal),
            "yearly-total": formatPrice(yearlyTotal),
            "total-total": formatPrice(totalTotal),

            "monthly-other": formatPrice(monthlyOther),
            "yearly-other": formatPrice(yearlyOther),
            "total-other": formatPrice(totalOther),

            "monthly-ins-pmi": formatPrice(monthlyInsurancePMI),
            "yearly-ins-pmi": formatPrice(yearlyInsurancePMI),
            "total-ins-pmi": formatPrice(totalInsurancePMI),

            "monthly-taxes": formatPrice(monthlyTaxes),
            "yearly-taxes": formatPrice(yearlyTaxes),
            "total-taxes": formatPrice(totalTaxes),

            "monthly-principal": formatPrice(monthlyPrincipal),
            "yearly-principal": formatPrice(yearlyPrincipal),
            "total-principal": formatPrice(totalPrincipal)
        };

        outputResult(fields, $output);
        $input.find('[name="insurance"]').val(formatPrice(yearlyInsurance));
        updateChart(chartId, monthlyPrincipal, monthlyTaxes, monthlyInsurancePMI, monthlyOther);
    }

    function calculateMonthlyPrincipal(listPrice, downPayment, paymentTerm, interestRate) {
        var principalAmountBorrowed = listPrice - downPayment;
        var monthlyInterestRate = interestRate / monthsPerYear;
        var numberOfPayments = paymentTerm * monthsPerYear;

        return (
            principalAmountBorrowed *
            (monthlyInterestRate *
                Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
            (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)
        );
    }

    function calculateYearlyPrincipal(monthlyPrincipal) {
        return monthlyPrincipal * monthsPerYear;
    }

    function calculateTotalPrincipal(monthlyPrincipal, paymentTerm) {
        return monthlyPrincipal * paymentTerm * monthsPerYear;
    }

    function calculateMonthlyTaxes(propertyTaxes) {
        return propertyTaxes / monthsPerYear;
    }

    function calculateTotalTaxes(propertyTaxes, paymentTerm) {
        return propertyTaxes * paymentTerm;
    }

	function calculateYearlyInsurance(listPrice, downPayment) {
		var LTVRatio = ((listPrice - downPayment) / listPrice);

		var insuranceRate = LTVRatio >= 0.95 ? 0.0099
            : LTVRatio >= 0.9 && LTVRatio < 0.95 ? 0.0078
            : LTVRatio >= 0.85 && LTVRatio < 0.9 ? 0.0055
            : LTVRatio < 0.85 ? 0.0055 : 0;

		return listPrice * insuranceRate;
	}

    function formatInput(fieldName, $input) {
	    var value = parseFloat($input
            .find("[name='" + fieldName + "']")
		    .val()
		    .replace(/[^\d\.]/g, ""));

	    return isNaN(value) ? 0 : value;
    }

    function outputResult(fields, $output) {
        Object.keys(fields).forEach(function (key) {
            $output.find("[data-value='" + key + "']").html(fields[key]);
        });
    }

    function formatPrice(value, decimalPoints) {
        if ("undefined" === typeof decimalPoints) {
            decimalPoints = 2;
        }

        var formatter = new Intl.NumberFormat('en-US', {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: decimalPoints
        });

        if (isNaN(value)) {
            value = 0;
        }

        return formatter.format(value);
    }

    function formatPercent(value, decimalPoints) {
        if ("undefined" === typeof decimalPoints) {
            decimalPoints = 2;
        }

        var formatter = new Intl.NumberFormat('en-US', {
            minimumSignificantDigits: decimalPoints
        });

        return formatter.format(value) + "%";
    }

    function updateDownPaymentPercent($input) {
        var listPrice = formatInput('list-price', $input);
        var inputAmount = formatInput('down-payment-amount', $input);
        var result = inputAmount / listPrice * 100;

        $input.find("[name='down-payment-percent']").val(formatPercent(result));
    }

    function updateDownPaymentAmount($input) {
        var listPrice = formatInput('list-price', $input);
        var inputPercentage = formatInput('down-payment-percent', $input) / 100;
        var result = listPrice * inputPercentage;

        $input.find("[name='down-payment-amount']").val(formatPrice(result));
    }
    
    function updateChart() {
	    if (arguments.length < 5 || typeof Chartist === 'undefined') {
		    return;
	    }

	    var argsArr = Array.prototype.slice.call(arguments);
	    var chartSelector = '#' + argsArr.shift();

	    var series = argsArr.map(Math.abs);
        var seriesOne24Th = series.reduce(function(a, b) { return a + b; }, 0) / 24;

	    new Chartist.Pie(chartSelector, {
		    series: series,
            labels: ['Principal', 'Taxes', 'INS/PMI*', 'Other']
        }, {
		    labelInterpolationFnc: function(label, i) {
			    return series[i] < seriesOne24Th ? false : label;
		    },
		    donut: true,
		    donutWidth: 30,
		    donutSolid: true,
		    startAngle: 0,
		    showLabel: true
	    });
    }

    if ($calculatorContainer.length) {
        this.init();
    }
}(jQuery, kvCORE));