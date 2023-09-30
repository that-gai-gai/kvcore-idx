<?php

declare( strict_types = 1 );

namespace kvCORE\View;

use Twig_Environment;

class Environment extends Twig_Environment{
	protected $filter_name = "kvcoreidx/view";

	public function render( $name, array $context = [] ) {
		// apply WP filters to context
		$context = $this->filter_context( $name, 'render', $context );

		return parent::render( "{$name}.twig", $context );
	}

	public function display( $name, array $context = [] ) {
		// apply WP filters to context
		$context = $this->filter_context( $name, 'display', $context );

		parent::display( "{$name}.twig", $context );
	}

	protected function filter_context($name, string $action = 'render', array $context = [] ) : array {
		if( function_exists( 'apply_filters' ) ) {
			$context = apply_filters( "{$this->filter_name}/context", $context );
			$context = apply_filters( "{$this->filter_name}/{$action}/context", $context );
			$context = apply_filters( "{$this->filter_name}/{$action}/{$name}/context", $context );
		}

		return $context;
	}
}