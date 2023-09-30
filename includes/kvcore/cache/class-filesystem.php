<?php

declare( strict_types=1 );

namespace kvCORE\Cache;

use kvCORE\Cache;

class Filesystem extends Cache {
	/**
	 * @var Filesystem
	 */
	protected static $instance = null;

	/**
	 * @var string
	 */
	protected $cache_directory_relative_path = 'cache/kvcoreidx';

	/**
	 * @var string|null
	 */
	protected $cache_directory = null;

	/**
	 * @var string|null
	 */
	protected $cache_directory_uri = null;

	protected static function init() {
		if( is_null( static::$instance ) ) {
			try {
				static::$instance = new static();
			} catch ( \Exception $e ) {
				if ( is_admin() && current_user_can( 'edit_pages' ) ) {
					wp_die( $e->getMessage() );
				} else {
					// don't output on frontend
				}
			}
		}

		return static::$instance;
	}

	public function __construct() {
		parent::__construct();

		$this->set_cache_directory();
	}

	/**
	 * @throws \Exception
	 */
	protected function set_cache_directory() {
		if ( is_multisite() ) {
			$blog_id = get_current_blog_id();

			if ( $blog_id ) {
				$this->cache_directory_relative_path .= "/sites/" . $blog_id;
			}
		}

		$this->cache_directory_relative_path = rtrim( trim( apply_filters(
			'kvcoreidx/cache/filesystem/relative_directory',
			$this->cache_directory_relative_path
		) ), '/' );

		// allow override to work from wp-config if present
		if (defined('KVCORE_IDX_CACHE_DIRECTORY')) {
			$this->cache_directory = KVCORE_IDX_CACHE_DIRECTORY;
		} else {
			$this->cache_directory = rtrim( trim( apply_filters(
				'kvcoreidx/cache/filesystem/directory',
                WP_CONTENT_DIR . '/' . $this->cache_directory_relative_path
			) ), '/' );
		}

		$this->cache_directory_uri = rtrim( trim( apply_filters(
			'kvcoreidx/cache/filesystem/directory_uri',
			'/' . $this->cache_directory_relative_path
		) ), '/' );

		if ( ! is_dir( $this->cache_directory) ) {
			if ( ! mkdir( $this->cache_directory, 0755, true ) ) {
				throw new \Exception("Failed to create directory `{$this->cache_directory}`");
			}
		}
	}

	protected function save( string $name, string $contents ) {
		$destination_file = "{$this->cache_directory}/{$name}";

		$destination_directory = dirname( $destination_file );

		if ( ! is_dir( $destination_directory ) ) {
			mkdir( $destination_directory, 0755, true );
		}

		return file_put_contents( $destination_file, $contents);
	}

	protected function delete( string $name ) {
		$file_to_delete = "{$this->cache_directory}/{$name}";

		if ( file_exists( $file_to_delete ) ) {
			return unlink( $file_to_delete );
		} else {
			return true;
		}
	}

	protected function delete_all( string $pattern ) {
		if ( ! $pattern ) {
			throw new \Exception( "Empty file pattern provided");
		}

		$files_to_delete = glob("{$this->cache_directory}/{$pattern}" );

		foreach( $files_to_delete as $i => $file ) {
			unlink( $file );
		}

		return true;
	}

	protected function get_uri( string $name ) : string {
		return "{$this->cache_directory_uri}/$name";
	}

	protected function get_file( string $name ) : string {
		return "{$this->cache_directory}/{$name}";
	}

	public static function save_to_cache( string $filename, string $contents ) {
		return static::init()->save( $filename, $contents );
	}

	public static function delete_from_cache( string $filename ) {
		return static::init()->delete( $filename );
	}

	public static function delete_all_from_cache( string $pattern ) {
		return static::init()->delete_all( $pattern );
	}

	public static function get_cache_file_uri( string $name ): string {
		return static::init()->get_uri( $name );
	}

	public static function get_cache_file( string $name ): string {
		return static::init()->get_file( $name );
	}
}
