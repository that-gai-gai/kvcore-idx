<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode;

use kvCORE\Shortcode;

class User_Profile extends Shortcode {
	private $name = 'leads';

	/**
	 * @return string
	 */
	public function get_name(): string {
		return $this->name;
	}
}