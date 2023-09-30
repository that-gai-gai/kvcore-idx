<?php

declare( strict_types=1 );

namespace kvCORE;

class Instantiator {
	protected static $instance = null;

	public static function init() {
		if( is_null( static::$instance ) ) {
			static::$instance = new static();
		}

		return static::$instance;
	}
}
