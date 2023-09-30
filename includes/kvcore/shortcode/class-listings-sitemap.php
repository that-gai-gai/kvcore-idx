<?php

declare(strict_types=1);

namespace kvCORE\Shortcode;

use kvCORE\Api;
use kvCORE\Settings;
use kvCORE\Shortcode;

class Listings_Sitemap extends Shortcode {

    protected $name = "listings_sitemap_page";

    /**
     * This function will return a string for the needed html.
     * It will get listings, 1000 at a time, from the api sort by price then build html needed.
     *
     * @return string
     */
    public function render_listings_sitemap()
    {        

        $content = "<div class='kv-container'>";

        //Get min and max
        global $wp_query;
        $min = $wp_query->query_vars['min'] ?? null;
        $max = $wp_query->query_vars['max'] ?? null;
        $filter = $wp_query->query_vars['filter'] ?? null;
        $type = $wp_query->query_vars['type'] ?? null;
        $page = $wp_query->query_vars['paginate'] ?? 1;

        $area = null;

        if(!empty($filter)) {

            if(empty($type))
                throw (new \Exception("A type must be passed in with an area"));

            $area = $type . "|" . $filter;
        }

        if(empty($min)) {
            throw (new \Exception("A minimum price is required"));
        }

        //Output heading
        if(empty($max) && empty($filter))
            $content .= "<h1>Listings For \${$min}+</h1>";
        elseif(!empty($filter)) {
            $parsedArea = ucfirst(urldecode($filter));
            if(!empty($max))
                $content .= "<h1>Listings Between \${$min} - \${$max} in {$parsedArea}</h1>";
            else
                $content .= "<h1>Listings From \${$min}+ in {$parsedArea}</h1>";
        }
        else
            $content .= "<h1>Listings Between \${$min} - \${$max}</h1>";

        $listingsPageUrl = get_page_link(Settings::get_setting('listing_detail_page'));

        // Limit 1000 listings
        $endpoint = "/public/listings/sitemap?limit=24&page={$page}";

        if(!empty($area))
            $endpoint .= "&area[]={$area}";

        //Set min if exists
        if (!empty($min)) {
            $endpoint .= "&priceMin={$min}";
        }

        //Set max if exists
        if(!empty($max))
            $endpoint .= "&priceMax={$max}";

        // Get listings
        $listings = Api::request('GET', $endpoint, []);

        if (!is_array($listings->data ?? false)) { $listings->data = []; }

        //Loop through data and build links
        foreach ($listings->data as $listing) {
            $listingSlug = $this->build_link($listing->mls, $listing->mlsid, $listing->address, $listing->city, $listing->state, $listing->zip);

            $link = "{$listingsPageUrl}{$listingSlug}";

            $content .= "<a rel=\"canonical\" href=\"{$link}/\">{$listing->address} {$listing->city}, {$listing->state} {$listing->zip}</a><br>";
        }

        if(!empty($listings->data)) {

            $content .= "<style>
                            .pager {
                              display: inline-block;
                            }
                            
                            .pager a {
                              color: black;
                              float: left;
                              padding: 8px 16px;
                              text-decoration: none;
                            }
                            
                            .pager a.active {
                              background-color: #ddd;
                              color: white;
                            }
                            
                            .pager a:hover:not(.active) {background-color: #ddd;}
                            
                            #ellipses {
                                background-color: darkgray;
                                color: white;
                            }
                            #ellipses:hover {
                                cursor: not-allowed;
                            }
                        </style>";

            $content .= "<br><div class=\"pager\">";

            $page = (int)$page;

            $back = $page - 1;

            $listingSitemapBaseUrl = get_page_link(Settings::get_setting('listings_sitemap')) . "?min={$min}" . !empty($max) ? "max={$max}" : "";
            if(!empty($filter)){
                if(!empty($max))
                    $listingSitemapBaseUrl = get_site_url() . "/listings-sitemap/homes-in-{$filter}-from-{$min}-to-{$max}?";
                else
                    $listingSitemapBaseUrl = get_site_url() . "/listings-sitemap/homes-in-{$filter}-from-{$min}?";
            }



            $content .= $back > 0 ? "<a href=\"{$listingSitemapBaseUrl}&type={$type}&paginate={$back}\">&laquo;</a>" : "";
            switch (true) {
                case $page > 3 && $page < ($listings->lastPage - 3):
                    for($i = $page - 3; $i <= $page + 3; $i++) {
                        $class = $i === $page ? "class=\"active\"" : "";
                        $content .= "<a href=\"{$listingSitemapBaseUrl}&type={$type}&paginate={$i}\" {$class}>{$i}</a>";
                    }
                    $content .= "<a href=\"#\" id='ellipses'>...</a><a href=\"{$listingSitemapBaseUrl}&filter={$type}&paginate={$listings->lastPage}\">{$listings->lastPage}</a>";
                    break;
                case $page > ($listings->lastPage - 3) && $page > 3:
                    for($i = ($listings->lastPage - 6); $i <= $listings->lastPage; $i++) {
                        $class = $i === $page ? "class=\"active\"" : "";
                        $content .= "<a href=\"{$listingSitemapBaseUrl}&type={$type}&paginate={$i}\" {$class}>{$i}</a>";
                    }
                    break;
                case $page < 3:
                    for($i = 1; $i <= $listings->lastPage; $i++) {
                        $class = $i === $page ? "class=\"active\"" : "";
                        $content .= "<a href=\"{$listingSitemapBaseUrl}&type={$type}&paginate={$i}\" {$class}>{$i}</a>";
                        if($i === 7)
                            break;
                    }
                    if($listings->lastPage > 7)
                        $content .= "<a href=\"#\" id='ellipses'>...</a><a href=\"{$listingSitemapBaseUrl}&filter={$type}&paginate={$listings->lastPage}\">{$listings->lastPage}</a>";
                    break;
            }

            if($page !== $listings->lastPage) {
                $forward = $page + 1;
                $content .= "<a href=\"{$listingSitemapBaseUrl}&type={$type}&paginate={$forward}\">&raquo;</a>";
            }
            $content .= "</div>";
        }

        // Return string
        return $content . "</div>";
    }

    /**
     * Getter on the name property
     * @return string
     */
    public function get_name()
    {
        return $this->name;
    }

    /**
     * This will build the listing detail slug, looks like "/property/81-1000785969-0-Woodspring-Drive-York-Twp-PA-17402/"
     *
     * @param $mls
     * @param $mlsid
     * @param $address
     * @param $state
     * @param $zip
     * @return string
     */
    private function build_link($mls, $mlsid, $address, $city, $state, $zip)
    {
        return $mls . '-' . $mlsid . '-' . $this->get_slug( $address ) . '-' . $this->get_slug( $city ) . '-' . $state . '-' . $zip;
    }

    private function get_slug($string)
    {
        $result = strtolower( $string );

        $result = preg_replace( '/[^a-z0-9\s-]/', '', $result );
        $result = trim( preg_replace( '/[\s-]+/', ' ', $result ) );
        $result = ucwords( $result );
        $result = preg_replace( '/\s/', '-', $result );

        return $result;
    }
}