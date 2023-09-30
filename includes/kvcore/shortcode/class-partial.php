<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode;

use kvCORE\Api;
use kvCORE\Listing;
use kvCORE\Exclusive;
use kvCORE\Settings;
use kvCORE\Shortcode;
use kvCORE\View;

class Partial extends Shortcode {
    public function custom_render($atts = [], $content = '', $name = ''): string {
        $partial = isset($atts['shortcode_attributes']['partial']) ? $atts['shortcode_attributes']['partial'] : '_default';
        $data = $atts['shortcode_attributes'];

        return View::render($partial, $data);
    }
}
