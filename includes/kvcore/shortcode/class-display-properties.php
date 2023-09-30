<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode;

use kvCORE\Shortcode;
use kvCORE\Settings;

class Display_Properties extends Shortcode {

    private $context = [];

	/**
	 * @return array
	 */
	public function get_context(): array {
		$this->context = [
			'supportedTypes' => Settings::get_supported_types()
		];
		return $this->context;
	}

    public $template_name = 'display-properties';
}