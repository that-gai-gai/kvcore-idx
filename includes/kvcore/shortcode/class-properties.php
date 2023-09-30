<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode;

use kvCORE\Admin\Page\Settings\Hotsheets;
use kvCORE\Shortcode;

class Properties extends Shortcode {
	private $name = 'listings';

	/**
	 * @return string
	 */
	public function get_name(): string {
		return $this->name;
	}

	protected function process_atts( &$atts ) {
		if ( empty( $atts['hotsheet'] ) ) {
			return;
		}

		$filters = Hotsheets::get_by_name( $atts['hotsheet'] );
		if ( empty( $filters ) ) {
			return;
		}

		$new_atts = [];

		foreach ( $filters as $filter => $value ) {
			$new_atts[$filter] = $value;
		}

		$atts = array_merge( $new_atts, $atts );
	}
}