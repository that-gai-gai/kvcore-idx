<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode;

use kvCORE\Api;
use kvCORE\Settings;
use kvCORE\Shortcode;
use kvCORE\View;

class Properties_Crawlable extends Shortcode {
    private $name = 'listings_crawlable_page';
    private $attributes;
    private $areas = [];
    private $priceMin;
    private $priceMax;
    private $baseURI = "public/listings";
    private $queryString = "";
    private $listings;

    public function crawlable_listings_view($context)
    {

        $this->set_areas();
        $this->set_prices();

        global $wp_query;
        global $wp;
        $page = !empty($wp_query->query_vars['paginate']) ? $wp_query->query_vars['paginate'] : 1;
        $url = home_url( $wp->request );
        if(empty($this->queryString)) {
            $this->queryString .= "?page={$page}";
        } else {
            $this->queryString .= "&page={$page}";
        }

        $this->baseURI .= $this->queryString;
        $this->set_listings();
        $context['data'] = $this->listings->data;
        $settings = Settings::get_settings();
        $listingsPerRow = !empty($settings['listings']['per_row']) ? $settings['listings']['per_row'] : 4;
        $context["defaultFilters"]["perRow"] = $listingsPerRow;
        $context["openListingsInNewTab"] = (Settings::get_setting('listings/open_in_new_tab') ? true : false );
        $context["pageUrl"] = $url;


        $context["from"] = $this->listings->from;
        $context["to"] = $this->listings->to;
        $context["total"] = $this->listings->total;
        $context["currentPage"] = $this->listings->current_page;
        $context["last_page"] = $this->listings->last_page;
        $context["page"] = $page;
        $result = "<div id=\"kvcoreidx-properties-page-crawlable\" class=\"kv-container\">";
        $result .= View::render("properties-crawlable", $context);
        $result .= "</div>";

        return $result;
    }

    /**
     * @return string
     */
    public function get_name(): string {
        return $this->name;
    }

    private function set_areas()
    {
        if(!empty($this->attributes['areas'])) {
            $this->areas = explode('||', $this->attributes['areas']);
        }

        foreach($this->areas as $key => $area) {
            if(empty($this->queryString)) {
                $this->queryString .= "?area[]={$area}";
            } else {
                $this->queryString .= "&area[]={$area}";
            }
        }
    }

    private function set_prices()
    {
        if(!empty($this->attributes['pricemin'])) {
            $priceMin = $this->attributes['pricemin'];
            if(empty($this->queryString)) {
                $this->queryString .= "?priceMin={$priceMin}";
            } else {
                $this->queryString .= "&priceMin={$priceMin}";
            }
        }

        if(!empty($this->attributes['pricemax'])) {
            $priceMax = $this->attributes['pricemax'];
            if(empty($this->queryString)) {
                $this->queryString .= "?priceMax={$priceMax}";
            } else {
                $this->queryString .= "&priceMax={$priceMax}";
            }
        }
    }

    private function set_listings()
    {
        $response = Api::request('GET', $this->baseURI);
        if(!empty($response)) {
            $response = $this->set_detail_url($response);
        }

        $this->listings = $response;
    }

    /**
     * This sets detail url for listings.
     */
    private function set_detail_url($listings)
    {
        $listing_detail_page = Settings::get_setting('listing_detail_page');
        $detail_page_url = trailingslashit(get_permalink($listing_detail_page));
        foreach($listings->data as $listing) {
            $listing->detail_url = $detail_page_url . $listing->mls . '-' . $listing->mlsid . '-' . $this->get_slug($listing->address) . '-' . $this->get_slug($listing->city) . '-' . $listing->state . '-' . $listing->zip;
        }
        return $listings;
    }

    /**
     * Generates slugs for listing detail url.
     *
     * @param $string
     * @return string|string[]|null
     */
    private function get_slug( $string ) {
        $result = strtolower( $string );

        $result = preg_replace( '/[^a-z0-9\s-]/', '', $result );
        $result = trim( preg_replace( '/[\s-]+/', ' ', $result ) );
        $result = ucwords( $result );
        $result = preg_replace( '/\s/', '-', $result );

        return $result;
    }

    protected function process_atts( &$atts ) {
        $this->attributes = $atts;
    }
}