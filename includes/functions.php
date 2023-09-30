<?php

function kv_get_post_by_slug( $slug ) {
	$post_id = null;

	$args = [
		'name' => $slug,
		'post_type' => 'page',
		'post_status' => 'publish',
		'numberposts' => 1,
	];

	$posts = get_posts( $args );

	if( is_array( $posts ) ) {
		$posts = reset( $posts );

		if( $posts->ID ?? null ) {
			$post_id = $posts->ID;
		}
	}

	return $post_id;
}