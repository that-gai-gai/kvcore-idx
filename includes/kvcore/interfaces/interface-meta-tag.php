<?php

declare( strict_types=1 );

namespace kvCORE\Interfaces;

interface Meta_Tag {
	public function print_meta_init( string $type );
	public function print_meta_title();
	public function print_meta_image();
	public function print_meta_description();
}