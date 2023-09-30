<?php

declare(strict_types=1);

namespace kvCORE\Shortcode;

use kvCORE\Api;
use kvCORE\Settings;
use kvCORE\Shortcode;

class Listing_Sitemap_Base extends Shortcode
{
    protected $name = "listings_sitemap_ranges";
    protected $filter;
    protected $filterType;

    /**
     * This function will return a string for the needed html.
     * It will get agents, 500 at a time, from the api then build the links to their profile pages.
     *
     * @return string
     */
    public function custom_render($context)
    {
        $pass = $this->get_pass();


        $content = "<div class='kv-container'>";
        switch ((int)$pass) {
            case 1:
                $content .= $this->first_pass();
                break;
            case 2:
                $content .= $this->second_pass();
                break;
            case 3:
                $content .= $this->third_pass();
                break;
            default:
                break;
        }

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
     * Purpose: Get which pass through of this shortcode we're on.
     */
    private function get_pass()
    {
        global $wp_query;
        // Pass will either be 2 or it won't be set. If it's not set then it's pass 1.
        return $wp_query->query_vars['pass'] ?? 1;
    }

    /**
     * This is the entry point to the sitemap
     * Gives list of area types to browse.
     * We're doing the structure of /listings-sitemap/{areaType} to take us to the second pass.
     *
     * @return string
     */
    private function first_pass()
    {
        $siteName = get_bloginfo('name');
        $markup = "<h1>Browse All Homes | {$siteName}</h1>";


        $cityLink = get_site_url() . "/listings-sitemap/city";
        $zipLink = get_site_url() . "/listings-sitemap/zip";
        $countyLink = get_site_url() . "/listings-sitemap/county";
        $neighborhoodLink = get_site_url() . "/listings-sitemap/neighborhood";
        $areaLink = get_site_url() . "/listings-sitemap/area";

        $markup .= "<p><a style='padding: 14px 0;' href=\"{$cityLink}\">See All Homes by City</a></p>";
        $markup .= "<p><a style='padding: 14px 0;' href=\"{$zipLink}\">See All Homes by Zip Code</a></p>";
        $markup .= "<p><a style='padding: 14px 0;' href=\"{$countyLink}\">See All Homes by County</a></p>";
        $markup .= "<p><a style='padding: 14px 0;' href=\"{$neighborhoodLink}\">See All Homes by Neighborhood</a></p>";
        $markup .= "<p><a style='padding: 14px 0;' href=\"{$areaLink}\">See All Homes by Area</a></p>";

        return $markup;
    }

    /**
     * This is where we query all areas they have under some specific type
     * We then build a links that will take them to homes in those specifics areas.
     *
     * @return string
     * @throws \Exception
     */
    private function second_pass()
    {
        global $wp_query;

        $filterType = $wp_query->query_vars['filter'] ?? null;
        $type = $wp_query->query_vars['type'] ?? null;

        //when listing has blank city etc. filterType actually equals 'homes' fix
        $filterTypeNoneDisplay = '';
        if ($filterType === 'homes') {
            $filterTypeNoneDisplay = 'no '.$type;
            $filterType = $filterTypeNoneDisplay;
        } 

        // Has to be one of these types
        if(empty($filterType) || !in_array($filterType, ['area', 'city', 'county', 'neighborhood', 'zip', 'school', $filterTypeNoneDisplay]))
            throw new \Exception('Incorrect filter type.');

        $prettyType = ucwords($filterType);
        $markup = "<h1>Browse Homes by {$prettyType}</h1>";

        // Was having encoding issues with spaces.
        $filterType = trim(str_replace(' ', '+', $filterType));
        if ($filterTypeNoneDisplay) {
            $filterType = '';
        }
        $path = "public/listings/areas?query=&type={$filterType}";
        if(Settings::get_setting('listings/inherit_kvcore_county_settings') === "1") {
            $path .= "&countyFilter=1";
        }

        $areas = Api::request("GET", $path);

        if(!empty($areas->areas)) {
            foreach($areas->areas as $key => $area) {
                $prettyName = ucwords($area->name);

                // Replacing - with _ because we were having issues with our rewrite rules when using -
                $encodedName = str_replace('-', '_', trim(urldecode($area->name)));

                $url = get_site_url() . "/listings-sitemap/homes-in-{$encodedName}";
                // Structure for area: city|name
                $markup .= "<p><a href=\"{$url}/?type={$filterType}\" style='padding: 14px 0'>Homes in {$prettyName}</a></p>";
            }
        }
        return $markup;
    }

    /**
     * Third and final pass. This will have price range links, and a paginated list of all listings in a specific area.
     *
     * @return string
     * @throws \Exception
     */
    private function third_pass()
    {
        global $wp_query;
        $this->filter = $wp_query->query_vars['filter'] ?? null;
        $this->filterType = $wp_query->query_vars['type'] ?? null;
        $page = $wp_query->query_vars['paginate'] ?? 1;

        if(empty($this->filter))
            throw new \Exception('A Filter Is Required On This Page');

        // Undoing what we did above so everything works. Basically a hacky work-around our rewrite rules
        $this->filter = str_replace('_', '-', $this->filter);

        $query = $this->filter;

        $markup = "<h1>All Homes in " . ucwords(urldecode($query)) . "</h1>";

        $count = 1;
        // Build out the price ranges. $50000 increments from up to $1,000,000
        for($i = 100000; $i <= 1000000; $i += 50000) {

            if($i !== 1000000) {
                $min = $i;
                $max = $i + 50000;
                $href = "<a style='padding: 14px 0' href=\"/listings-sitemap/homes-in-{$this->filter}-from-{$min}-to-{$max}/?type={$this->filterType}\">\${$min} - \${$max}</a>, ";
                $href .= $count++ % 5 === 0 ? "<br><br>" : "";
                $markup .= $href;
                continue;
            }

            $href = "<a style='padding: 14px 0' href=\"/listings-sitemap/homes-in-{$this->filter}-from-{$i}/?type={$this->filterType}\">\${$i}+</a><br><br><br>";
            $markup .= $href;
        }

        $markup .= $this->get_listings($page, $this->filterType . "|" . $this->filter);

        return $markup;
    }

    /**
     * This function builds the links for listing detail urls and pagination.
     *
     * @param $page
     * @param $area
     * @return string
     */
    private function get_listings($page, $area)
    {
        $listingsPageUrl = get_page_link(Settings::get_setting('listing_detail_page'));

        // Limit 1000 listings
        $endpoint = "/public/listings/sitemap?limit=24&page={$page}";

        if(!empty($area)) {
            // encode spaces with  +
            $area = str_replace(' ', '+', trim(urldecode($area)));
            $endpoint .= "&area[]={$area}";
        }

        //Set max if exists
        if(!empty($max))
            $endpoint .= "&priceMax={$max}";

        // Get listings
        $listings = Api::request('GET', $endpoint, []);

        if (!is_array($listings->data ?? false)) { $listings->data = []; }

        $content = '';

        //Loop through data and build links
        foreach ($listings->data as $listing) {
            $listingSlug = $this->build_link($listing->mls, $listing->mlsid, $listing->address, $listing->city, $listing->state, $listing->zip);

            $link = "{$listingsPageUrl}{$listingSlug}";
            $fullAddress = "{$listing->address} {$listing->city}, {$listing->state} {$listing->zip}";
            if (trim($fullAddress) === ",") { $fullAddress = "No Address"; }

            $content .= "<p><a style='padding: 14px 0' rel=\"canonical\" href=\"{$link}/\">{$fullAddress}</a><p>";
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

            //Build the pagination. So much logic.....
            $page = (int)$page;

            $back = $page - 1;

            $encodedName = str_replace('-', '_', trim(urldecode($this->filter)));

            $url = get_site_url() . "/listings-sitemap/homes-in-{$encodedName}/?type={$this->filterType}";

            //Back one button
            $content .= $back > 0 ? "<a href=\"{$url}&paginate={$back}\">&laquo;</a>" : "";
            switch (true) {
                //This case is when we have greater than 3 pages and enough pages to go to show ellipses.
                case $page > 3 && $page < ($listings->lastPage - 3):
                    for($i = $page - 3; $i <= $page + 3; $i++) {
                        $class = $i === $page ? "class=\"active\"" : "";
                        $content .= "<a href=\"{$url}&paginate={$i}\" {$class}>{$i}</a>";
                    }
                    $content .= "<a href=\"#\" id='ellipses'>...</a><a href=\"{$url}&paginate={$listings->lastPage}\">{$listings->lastPage}</a>";
                    break;
                //This case is when we're within 3 of the end. Don't show ellipses
                case $page > ($listings->lastPage - 3) && $page > 3:
                    for($i = ($listings->lastPage - 6); $i <= $listings->lastPage; $i++) {
                        $class = $i === $page ? "class=\"active\"" : "";
                        $content .= "<a href=\"{$url}&paginate={$i}\" {$class}>{$i}</a>";
                    }
                    break;
                //This case is when we're within 3 of the beginning. Avoiding negative numbers here.
                case $page < 3:
                    for($i = 1; $i <= $listings->lastPage; $i++) {
                        $class = $i === $page ? "class=\"active\"" : "";
                        $content .= "<a href=\"{$url}&paginate={$i}\" {$class}>{$i}</a>";
                        if($i === 7)
                            break;
                    }
                    if($listings->lastPage > 7)
                        $content .= "<a href=\"#\" id='ellipses'>...</a><a href=\"{$url}&paginate={$listings->lastPage}\">{$listings->lastPage}</a>";
                    break;
            }

            //Forward one button
            if($page !== $listings->lastPage) {
                $forward = $page + 1;
                $content .= "<a href=\"{$url}&paginate={$forward}\">&raquo;</a>";
            }
            $content .= "</div>";
        }


        return $content;
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