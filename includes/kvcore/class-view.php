<?php

declare( strict_types = 1 );

namespace kvCORE;

use kvCORE\View\Environment;
use kvCORE\View\Loader;
use kvCORE\View\Custom_Function;

use Twig_Error_Loader;
use Twig_Error_Syntax;
use Twig_Error_Runtime;

class View {
	protected static $environment = null;
	/**
	 * @var \kvCORE\View\Loader
	 */
	protected static $loader = null;

	protected static function environment() : Environment {
		if( is_null( static::$environment )) {
			if( ! static::$loader instanceof Loader ) {
				static::$loader = new Loader\Filesystem();
			}

			static::$environment = new Environment(static::$loader->get_loader());
			static::set_custom_functions();
			static::set_custom_filters();
		}

		return static::$environment;
	}

	protected static function set_custom_functions() {
		$custom_functions = apply_filters( 'kvcoreidx/view/functions', [] );

		if( count( $custom_functions ) ) {
			foreach( $custom_functions as $i => $custom_function ) {
				$name = $custom_function['name'] ?? null;
				$callback = $custom_function['callback'] ?? null;
				$options = $custom_function['options'] ?? [];

				if ( is_string( $name ) && is_callable( $callback ) ) {
					static::$environment->addFunction( new Custom_Function( $name, $callback, $options ) );
				}
			}
		}

		static::$environment->addFunction(new Custom_Function('function', function( string $function_name) {
			$args = func_get_args();
			array_shift($args);

			$function_name = trim($function_name);

			return call_user_func_array($function_name, ($args));
		} ) );
	}

	protected static function set_custom_filters() {
		$custom_filters = apply_filters( 'kvcoreidx/view/filters', [] );

		if( count( $custom_filters ) ) {
			foreach( $custom_filters as $i => $custom_filter ) {
				$name = $custom_filter['name'] ?? null;
				$callback = $custom_filter['callback'] ?? null;
				$options = $custom_filter['options'] ?? [];

				if ( is_string( $name ) && is_callable( $callback ) ) {
					$the_filter = new \Twig_Filter( $name, $callback, $options );

					static::$environment->addFilter( $the_filter );
				}
			}
		}
	}

	public static function render( string $name, array $context = [] ) : string {
		try {
			return static::environment()->render( $name, static::apply_filters(
				'render', $name, $context
			) );
		} catch ( Twig_Error_Loader $e ) {
			return "<div class='kv-error kv-hidden-public'><strong>Twig Loader Error</strong>: `{$e->getMessage()}`</div>";
		} catch ( Twig_Error_Syntax $e ) {
			return "<div class='kv-error kv-hidden-public'><strong>Twig Syntax Error</strong>: `{$e->getMessage()}`</div>";
		} catch ( Twig_Error_Runtime $e ) {
			return "<div class='kv-error kv-hidden-public'><strong>Twig Runtime Error</strong>: `{$e->getMessage()}`</div>";
		} catch ( \Exception $e ) {
			return "<div class='kv-error kv-hidden-public'><strong>Unhandled Exception</strong>: `{$e->getMessage()}`</div>";
		}
	}

	public static function display( string $name, array $context = [] ) {
		try {
			static::environment()->display( $name, static::apply_filters(
				'display', $name, $context
			) );
		} catch ( Twig_Error_Loader $e ) {
			echo "<div class='kv-error kv-hidden-public'><strong>Twig Loader Error</strong>: `{$e->getMessage()}`</div>";
		} catch ( Twig_Error_Syntax $e ) {
			echo "<div class='kv-error kv-hidden-public'><strong>Twig Syntax Error</strong>: `{$e->getMessage()}`</div>";
		} catch ( Twig_Error_Runtime $e ) {
			echo "<div class='kv-error kv-hidden-public'><strong>Twig Runtime Error</strong>: `{$e->getMessage()}`</div>";
		} catch ( \Exception $e ) {
			echo "<div class='kv-error kv-hidden-public'><strong>Unhandled Exception</strong>: `{$e->getMessage()}`</div>";
		}
	}

	protected static function apply_filters( string $render_type, string $name, array $context = [] ) : array {
		$context = static::apply_filter( 'kvcoreidx/view/context', $context );

		if ( $render_type ) {
			$context = static::apply_filter( "kvcoreidx/view/{$render_type}/context", $context );
		}

		if ( $name ) {
			$context = static::apply_filter( "kvcoreidx/view/{$name}/context", $context );
		}

		if ( $name && $render_type ) {
			$context = static::apply_filter( "kvcoreidx/view/{$name}/{$render_type}/context", $context );
		}

		return $context;
	}

	protected static function apply_filter( $filter_name, $context = [] ) : array {
		if ( function_exists( 'apply_filters' ) ) {
			$context = apply_filters( $filter_name, $context );
		}

		return $context;
	}
}
