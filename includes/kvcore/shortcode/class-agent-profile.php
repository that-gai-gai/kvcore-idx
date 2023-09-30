<?php

declare(strict_types=1);

namespace kvCORE\Shortcode;

use kvCORE\Api;
use kvCORE\Settings;
use kvCORE\Shortcode;
use kvCORE\View;

class Agent_Profile extends Shortcode
{
    protected $filePath = "agent-profile";
    protected $data;
    protected $listings;

    /**
     * This will get all data necessary for agent profile template.
     *
     * @return string
     * @throws \Exception
     */
    public function agent_profile_view()
    {
        $settings = Settings::get_settings();
        $agentId = $this->get_agent_id();

        $this->data = $this->get_agent($agentId);
        $this->data = gettype($this->data) !== "array" ? $this->data : $this->data[0];

        if(empty($this->data)){
            global $wp_query;
            $wp_query->set_404();
            status_header(404);
            get_template_part(404); 
            exit();
        } 
        $limit = (!empty($settings['agent_profile']['limit']) && $settings['agent_profile']['limit'] !== 'showAll') ? $settings['agent_profile']['limit'] : 3;
        $this->listings = Api::request('GET', "public/listings?agents={$agentId}&limit={$limit}&currentFilters[perRow]={$limit}", []);
        $include_manual_listings_to_agent_profile = isset($settings['agent_profile']['include_manual_listings_to_agent_profile']) ? $settings['agent_profile']['include_manual_listings_to_agent_profile'] : false;

        if ($include_manual_listings_to_agent_profile == '1') {
            $manualListings = Api::request('GET', "public/listings/manualListings?agent[]={$agentId}", []);
            $count = 0;
            foreach($manualListings->data as $key=>$val) {
                $manualListings->data[$key]->is_exclusive_listing = true;
            }
            //append manual listings
            if (!empty($this->listings->data)) {
                $this->listings->data = array_merge($this->listings->data, $manualListings->data);
            } else {
                $this->listings->data = $manualListings->data;
            }
            
        }

        if(!empty($this->listings->data)) {
            $this->set_detail_url();
        }

        $use_cell = $this->data->show_cell_phone === 1 ? $this->data->cell_phone : null;
        $use_work = $this->data->show_work_phone === 1 ? $this->data->work_phone : null;
        $use_direct = $this->data->show_direct_phone === 1 ? $this->data->direct_phone : null;
        $this->data->social = $this->set_agent_social_profiles();
        //quotes slashes fix
        $this->data->bio = str_replace("\'", "'", $this->data->bio);
        $this->data->bio = str_replace('\"', '"', $this->data->bio);
        $this->data->use_this_phone = !empty($this->data) ? $this->get_first_agent_phone([$use_cell, $use_work, $use_direct]) : '';

        $this->listings->notShowSold = false;

        $kvcoreidx = [
            'options' => $settings,
            'pages' => Settings::get_plugin_page_urls(),
            'publicUrl' => KVCORE_IDX_PUBLIC_URL,
            'phone' => $this->data->use_this_phone
        ];
        return View::render($this->filePath, ['data' => $this->data, 'kvcoreidxSettings' => $kvcoreidx, 'listings' => $this->listings]);
    }

    private function get_agent($agentId)
    {
        $agentTransient = get_transient( "agent_profile_{$agentId}" );

        if ( empty( $agentTransient ) ) {
            $data = Api::request('GET', 'public/members/' . $agentId, []);
            $agentTransient = $data;
            if(!empty($agentTransient->data)) {
                $agentTransient = $agentTransient->data;
                set_transient("agent_profile_{$agentId}", $agentTransient, DAY_IN_SECONDS);
            } else {
                $agentTransient = null;
            }
        }
        delete_transient("agent_profile_{$agentId}");
        return $agentTransient;
    }

    /**
     * This gets agentId from URL
     *
     * @return string
     */
    private function get_agent_id()
    {
        global $wp_query;
        $agentId = $wp_query->query_vars['team-member'];
        if(empty($agentId)) {
            global $wp;
            if(!empty($wp->request))
                preg_match_all('/\/([0-9]+)-/m', $wp->request, $matches, PREG_SET_ORDER);
            $agentId = $matches[0][1] ?? '';
        }

        return $agentId;
    }

    /**
     * Returns the first available phone number
     *
     * @param $phones
     * @return string
     */
    private function get_first_agent_phone($phones)
    {
        foreach ($phones as $item) {
            if(!empty($item))
                return $item;
        }
        return '';
    }

    /**
     * This sets the social profiles
     *
     * @return array
     */
    private function set_agent_social_profiles()
    {
        list($fb,$twitter,$instagram,$pinterest,$linkedIn,$youtube) = $this->getAbsoluteSocialDomains();
        $result = [];

		if (!empty($this->data->facebook_url)) {
		    $result['facebook_url'] = $this->data->facebook_url;
		    if(strpos($this->data->facebook_url, 'https') === false && strpos($this->data->facebook_url, 'http') === false) {
		        if(strpos($this->data->facebook_url, 'facebook.com') === false)
                    $result['facebook_url'] = "{$fb}" . $this->data->facebook_url;
		        else
		            $result['facebook_url'] = "https://{$this->data->facebook_url}";
            }
        }
        if (!empty($this->data->twitter_url)) {
            $result['twitter_url'] = $this->data->twitter_url;
            if(strpos($this->data->twitter_url, 'https') === false && strpos($this->data->twitter_url, 'http') === false) {
                if(strpos($this->data->twitter_url, 'twitter.com') === false)
                    $result['twitter_url'] = "{$twitter}" . $this->data->twitter_url;
                else
                    $result['twitter_url'] = "https://{$this->data->twitter_url}";
            }
        }
        if (!empty($this->data->instagram_url)) {
            $result['instagram_url'] = $this->data->instagram_url;
            if(strpos($this->data->instagram_url, 'https') === false && strpos($this->data->instagram_url, 'http') === false) {
                if(strpos($this->data->instagram_url, 'instagram.com') === false)
                    $result['instagram_url'] = "{$instagram}" . $this->data->instagram_url;
                else
                    $result['instagram_url'] = "https://{$this->data->instagram_url}";
            }
        }
        if (!empty($this->data->pinterest_url)) {
            $result['pinterest_url'] = $this->data->pinterest_url;
            if(strpos($this->data->pinterest_url, 'https') === false && strpos($this->data->pinterest_url, 'http') === false) {
                if(strpos($this->data->pinterest_url, 'pinterest.com') === false)
                    $result['pinterest_url'] = "{$pinterest}" . $this->data->pinterest_url;
                else
                    $result['pinterest_url'] = "https://{$this->data->pinterest_url}";
            }
        }
        if (!empty($this->data->linkedin_url)) {
            $result['linkedin_url'] = $this->data->linkedin_url;
            if(strpos($this->data->linkedin_url, 'https') === false && strpos($this->data->linkedin_url, 'http') === false) {
                if(strpos($this->data->linkedin_url, 'linkedin.com') === false)
                    $result['linkedin_url'] = "{$linkedIn}" . $this->data->linkedin_url;
                else
                    $result['linkedin_url'] = "https://{$this->data->linkedin_url}";
            }
        }
        if (!empty($this->data->youtube_url)) {
            $result['youtube_url'] = $this->data->youtube_url;
            if(strpos($this->data->youtube_url, 'https') === false && strpos($this->data->youtube_url, 'http') === false) {
                if(strpos($this->data->youtube_url, 'youtube.com') === false)
                    $result['youtube_url'] = "{$youtube}" . $this->data->youtube_url;
                else
                    $result['youtube_url'] = "https://{$this->data->youtube_url}";
            }
        }
		return $result;
    }

    private function getAbsoluteSocialDomains() {
		return [
			'https://www.facebook.com/',
            'https://twitter.com/',
            'https://www.instagram.com/',
            'https://www.pinterest.com/',
            'https://www.linkedin.com/in/',
            'https://www.youtube.com/channel/'
		];
    }

    /**
     * This sets detail url for listings.
     */
    private function set_detail_url()
    {
        $settings = Settings::get_settings();
        foreach($this->listings->data as $listing) {
            $listing_detail_page = Settings::get_setting('listing_detail_page');
            $link_agent_listings_to_agent_subdomain = isset($settings['agent_profile']['link_agent_listings_to_agent_subdomain']) ? $settings['agent_profile']['link_agent_listings_to_agent_subdomain'] : false;
            $is_exclusive_listing = isset($listing->is_exclusive_listing) ? $listing->is_exclusive_listing : false;

            if ($link_agent_listings_to_agent_subdomain == '1' && !empty($this->data->kvcoreuserdomain)) {
                $detail_page_url = trailingslashit($this->data->kvcoreuserdomain).'/property/';
            } else {
                $detail_page_url = trailingslashit(get_permalink($listing_detail_page));
            }
            $listing->detail_url = $detail_page_url . $listing->mls . '-' . $listing->mlsid . '-' . $this->get_slug($listing->address) . '-' . $this->get_slug($listing->city) . '-' . $listing->state . '-' . $listing->zip;
            //manual listings need different url
            if ($is_exclusive_listing) {
                if ($listing->manualType === 'Sold') {
                    $listing->price = $listing->sold_price;
                }
                $exclusive_detail_page = Settings::get_setting( 'exclusive_detail_page' );
                $exclusive_detail_page_url = trailingslashit(get_permalink($exclusive_detail_page));
                $listing->detail_url = $exclusive_detail_page_url . $listing->id . '-' . $this->get_slug($listing->address) . '-' . $this->get_slug($listing->city) . '-' . $listing->state . '-' . $listing->zip;
            }
            
        }
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
}