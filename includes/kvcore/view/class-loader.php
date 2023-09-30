<?php

declare( strict_types = 1 );

namespace kvCORE\View;

use Twig_LoaderInterface;

class Loader {
	protected $loader = null;

	public function get_loader() : Twig_LoaderInterface {
		return $this->loader;
	}
}
