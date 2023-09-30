<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode\Listing_Detail\Details;

use kvCORE\Shortcode\Listing_Detail\Details;

class Home_Details extends Details {
	private $name = 'listing_detail_home_details';

	/**
	 * @return string
	 */
	public function get_name(): string {
		return $this->name;
	}
}