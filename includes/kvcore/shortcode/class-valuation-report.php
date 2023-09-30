<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode;

use kvCORE\Shortcode;

class Valuation_Report extends Shortcode {
	public $template_name = 'market-report';
	public $context = [ 'is_valuation' => true ];
}