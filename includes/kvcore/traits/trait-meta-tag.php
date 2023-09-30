<?php

declare( strict_types=1 );

namespace kvCORE\Traits;

use kvCORE\Settings;

trait Meta_Tag {
	protected $meta_type;

	public function print_meta_init( string $type ): bool {
		if ( empty( $type ) ) {
			return false;
		}

		switch ( $type ) {
			case 'facebook':
				$app_id = Settings::get_setting( 'facebook_client_id' );
				if ( $app_id ) {
					echo "<meta property=\"fb:app_id\" content=\"{$app_id}\">";
				}

				$url = get_home_url( null, $_SERVER['REQUEST_URI'] );
				echo "<meta property=\"og:url\" content=\"{$url}\">";
				echo '<meta property="og:type" content="article">';
				break;

			case 'twitter':
				echo '<meta name="twitter:card" content="summary_large_image">';
				break;

			default:
				return false;
		}

		$this->meta_type = $type;

		return true;
	}

	protected function echo_title( string $title ) {
		switch ( $this->meta_type ) {
			case 'facebook':
				echo "<meta property=\"og:title\" content=\"{$title}\">";
				break;

			case 'twitter':
				echo "<meta name=\"twitter:title\" content=\"{$title}\">";
				break;
		}
	}

	protected function echo_image( string $image_url ) {
		switch ( $this->meta_type ) {
			case 'facebook':
				echo "<meta property=\"og:image\" content=\"{$image_url}\">";

				list( $width, $height ) = $this->get_image_size( $image_url );
				if ( !empty( $width ) && !empty( $height ) && $width >= 200 && $height >= 200 ) {
					echo "<meta property=\"og:image:width\" content=\"{$width}\">";
					echo "<meta property=\"og:image:height\" content=\"{$height}\">";
				}
				break;

			case 'twitter':
				echo "<meta name=\"twitter:image\" content=\"{$image_url}\">";
				break;
		}
	}

	private function get_image_size( string $image_url ): array {
		$image_sizes_transient_name = KVCORE_IDX_PLUGIN_NAME . '_image_sizes';

		$sizes = get_transient( $image_sizes_transient_name );

		if ( !is_array( $sizes ) ) {
			$sizes = [];
		}

		if ( !isset( $sizes[md5( $image_url )] ) ) {
			list( $width, $height ) = getimagesize( $image_url );
			$sizes[md5( $image_url )] = [ $width, $height ];
			set_transient( $image_sizes_transient_name, $sizes );
		}

		return $sizes[md5( $image_url )];
	}

	protected function process_description( string $description ): string {
		// strip html tags
		$description = strip_tags( $description );
		// strip new lines (replace any combination of
		// sequential newlines and spaces with single space
		$description = preg_replace( "/[\r\n\s\t]+/", ' ', $description );

		$description_max_length = 420;

		if ( strlen( $description ) > $description_max_length ) {
			$description = trim( substr( $description, 0, $description_max_length - 5 ) ) . '...';
		}

		return $description;
	}

	protected function echo_description( string $description ) {
		switch ( $this->meta_type ) {
			case 'facebook':
				echo "<meta property=\"og:description\" content=\"{$description}\">";
				break;

			case 'twitter':
				echo "<meta name=\"twitter:description\" content=\"{$description}\">";
				break;
		}
	}
}