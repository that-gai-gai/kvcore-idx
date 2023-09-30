<?php

declare( strict_types=1 );

namespace kvCORE\View\Loader;

use kvCORE\View\Loader;
use Twig_Loader_Filesystem;

class Filesystem extends Loader {
	protected $loader = null;
	protected $filter_name = 'kvcoreidx/view/loader/filesystem/path';

	public function __construct( $path = [] ) {
		if( ! is_array( $path ) ) {
			if($path){
				$path = [ $path ];
			} else {
				$path = [];
			}
		}

		$path = $this->filter_path( $path );

		$this->loader = new Twig_Loader_Filesystem( $path );
	}

	protected function filter_path( array $path = [] ) : array {
		if(function_exists('apply_filters' ) ) {
			$path = array_reverse( apply_filters($this->filter_name, $path ) );
		}

		return $path;
	}
}
