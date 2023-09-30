<?php

declare( strict_types = 1 );

namespace kvCORE\View;

use Symfony\Component\Yaml\Yaml;

class Compiler {
	public function __construct() {
	}

	public function get_compiled_view( string $name, string $content = '', array $meta = []) {
		$compiled_view = $this->compile_view( $name, $content, $meta );

		return sprintf(
			'kvCORE.View.add(\'%s\', %s,%s);',
			$compiled_view['name'],
			json_encode($compiled_view['content']),
			( is_array( $compiled_view['meta'] ) && count( $compiled_view['meta'] ) ) ? json_encode( $compiled_view['meta'] ) : "null"
		);
	}

	public function compile_view( string $name, string $content = '', array $meta = [] ) {
		if ( ! $name ) {
			throw new \Exception("\$name is required" );
		}

		$result = [
			'name' => $name,
			'content' => $content,
			'meta'    => $meta,
		];

		$source_directory = KVCORE_IDX_PUBLIC_PATH . KVCORE_IDX_PARTIAL_PATH_NAME;
		$default          = file_get_contents( $source_directory . '/_default.twig' );

		$pattern = "/<%\s*include\s+['\"]+([^'\"]+)['\"]+\s*%>/";

		preg_match_all( $pattern, $default, $template_parts );

		foreach ( $template_parts[1] as $i => $part ) {
			$part_file = $source_directory . "/_{$part}.twig";

			if ( file_exists( $part_file ) ) {
				$default = str_replace( $template_parts[0][ $i ], file_get_contents( $part_file ), $default );
			}
		}

		preg_match( '/\{#\s+---[\r\n]+([^#]+)[\r\n]+---\s+#\}/', $content, $data );

		$template_meta = Yaml::parse( $data[1] ?? '' );

		if ( ( $template_meta['layout'] ?? '' ) !== 'none' ) {
			$result['content'] = str_replace( "<% content %>", $content, $default );
		}

		$result['meta'] = $template_meta;

		return $result;
	}
}
