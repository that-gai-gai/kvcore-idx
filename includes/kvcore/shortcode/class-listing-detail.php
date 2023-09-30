<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode;

use kvCORE\Api;
use kvCORE\Listing;
use kvCORE\Exclusive;
use kvCORE\Settings;
use kvCORE\Shortcode;
use kvCORE\View;

class Listing_Detail extends Shortcode
{
    private $name = 'listing_detail_page';
    protected $listing;
    protected $settings;
    protected $mls;
    protected $mlsid;

    /**
     * @return string
     */
    public function get_name(): string
    {
        return $this->name;
    }

    public function get_exclusive()
    {
        $exclusiveId = Exclusive::get_exclusive_id();
        if (!empty($exclusiveId)) {
            $exclusiveObj = new Exclusive($exclusiveId);
            $this->listing = $exclusiveObj->get_data();
        }
    }

    public function get_listing()
    {
        list($mls, $mlsid) = Listing::get_mls_and_mlsid();
        $this->mls = $mls;
        $this->mlsid = $mlsid;
        if (!empty($mls) && !empty($mlsid)) {
            $this->listing = get_transient("kv_listing_detail_info_{$mls}_{$mlsid}");
            if (empty($this->listing)) {
                $listingObj = new Listing($mls, $mlsid);
                $this->listing = $listingObj->get_data();
            } else {
                delete_transient("kv_listing_detail_info_{$mls}_{$mlsid}");
            }
        }
    }

    public function get_images(): string
    {
        if (empty($this->listing->photos)) {
            return "";
        }
        $labelsString = '';
        $realListingStatus = isset( $this->listing->realListingStatus ) ? $this->listing->realListingStatus : '';
        if ($realListingStatus === "Pending") {
            $labelsString = "<div class=\"kv-detail-listingstatus-wrapper\"><div class=\"kv-detail-listingstatus\"><div class=\"kv-py-1 kv-px-3\">" . $this->listing->realListingStatus . "</div></div></div>";
        }
        $openhouseString = '';
        $current_timezone = wp_timezone_string();
        if (!empty($this->listing->openHouses->data)) {
            if ($this->listing->realListingStatus === "Pending") {
                $openhouseString = "<div class=\"kv-detail-openhouse-wrapper\" style=\"top:70px;\">";
            } else {
                $openhouseString = "<div class=\"kv-detail-openhouse-wrapper\">";
            }
            $showOnlyTwoIterator = 0;
            foreach ($this->listing->openHouses->data as $openhouse) {
                $virtual = '';
                if (1 == $openhouse->virtual_openhouse || "1" == $openhouse->virtual_openhouse) {
                    $virtual = 'VIRTUAL ';
                }
                $date = new \DateTime("{$openhouse->month}/{$openhouse->day}/{$openhouse->year}");
                $current = (new \DateTime('now', new \DateTimeZone("{$current_timezone}")));
                $displayDate = $date->format('D, M d Y');
                $displayTime = preg_replace('/([0-9]{1,2}\:[0-9][0-9])\:[0-9][0-9]/', '$1', $openhouse->time);
                $openhouseFirstTime = strtok($displayTime, '-');

                $openhouseComparisonDate = new \DateTime("{$openhouse->month}/{$openhouse->day}/{$openhouse->year} {$openhouseFirstTime}", new \DateTimeZone("{$current_timezone}"));
                if ($openhouseComparisonDate >= $current && $showOnlyTwoIterator < 2) {
                    $showOnlyTwoIterator++;
                    $openhouseString .= "<div class=\"kv-detail-openhouse\"><div class=\"kv-px-1\">{$virtual}OPEN HOUSE {$displayDate} {$displayTime}</div></div>";
                }
            }
            $openhouseString .= "</div>";
        }
        $soldPrice = isset($this->listing->soldFields->data->sold_price) ? $this->listing->soldFields->data->sold_price : null;
        if ($soldPrice) {
            $openhouseString .= "<div class=\"kv-detail-listingstatus-wrapper\"><div class=\"kv-detail-listingstatus\"><div class=\"kv-py-1 kv-px-3\">Sold: " .gmdate("M d, Y", $this->listing->soldFields->data->sold_date). "</div></div></div>";
        }
        $imageGallery = "";
        $totalImagesLength = sizeof($this->listing->photos->data) - 5;
        foreach ($this->listing->photos->data as $key => $photo) {
            $imageTitle = "{$this->listing->address} {$this->listing->city}, {$this->listing->state} - Image {$key}";
            $mobile = $this->isMobileDevice();
            if($mobile) {
                if ($key === 0) {
                    $imageGallery .= "<aside class=\"kv-detail-v2-photos-main\"><img class=\"kv-image kv-image-object-fit kv-image-object-fit-cover\" src=\"https://img.kvcore.com/cdn-cgi/image/fit=scale-down,format=auto,width=550/{$photo->url}\" data-order=\"0\" alt=\"{$imageTitle}\" title=\"{$imageTitle}\"></aside>";

                } else {
                    $imageGallery .= "<img id='listing-photo' class=\"kv-image kv-image-object-fit kv-image-object-fit-cover\" src=\"https://img.kvcore.com/cdn-cgi/image/fit=scale-down,format=auto,width=550/{$photo->url}\" data-order=\"{$key}\" style=\"order: {$key}\" alt=\"{$imageTitle}\" title=\"{$imageTitle}\">";
                }
            }
            else {
                if(($key < 5)) {
                    if ($key === 0) {
                        $imageGallery .= "<aside class=\"kv-detail-v2-photos-main\"><img class=\"kv-image kv-image-object-fit kv-image-object-fit-cover\" src=\"https://img.kvcore.com/cdn-cgi/image/fit=scale-down,format=auto,width=900/{$photo->url}\" data-order=\"0\" alt=\"{$imageTitle}\" title=\"{$imageTitle}\"></aside>";

                    }
                    elseif ($key === 4) {
                        $imageGallery .= "<div class=\"kv-detail-v2-photos-more\">{$totalImagesLength} more</div><img id='listing-photo' class=\"kv-image kv-image-object-fit kv-image-object-fit-cover kv-darker\" src=\"https://img.kvcore.com/cdn-cgi/image/fit=scale-down,format=auto,width=900/{$photo->url}\" data-order=\"{$key}\" style=\"order: {$key}\" alt=\"{$imageTitle}\" title=\"{$imageTitle}\">";
                    }
                    else {
                        $imageGallery .= "<img id='listing-photo' class=\"kv-image kv-image-object-fit kv-image-object-fit-cover\" src=\"https://img.kvcore.com/cdn-cgi/image/fit=scale-down,format=auto,width=900/{$photo->url}\" data-order=\"{$key}\" style=\"order: {$key}\" alt=\"{$imageTitle}\" title=\"{$imageTitle}\">";
                    }
                }
                else {
                    $imageGallery .= "<img src=\"https://img.kvcore.com/cdn-cgi/image/fit=scale-down,format=auto,width=900/{$photo->url}\" id='listing-photo' class=\"kv-image kv-image-object-fit kv-image-object-fit-cover lazy\" data-src=\"https://img.kvcore.com/cdn-cgi/image/fit=scale-down,format=auto,width=900/{$photo->url}\" data-order=\"{$key}\" style=\"order: {$key}\" alt=\"{$imageTitle}\" title=\"{$imageTitle}\">";
                }
            }
        }
        $slideShow = "
	                <nav class=\"kv-detail-v2-photos-controls kv-hidden-md-up\">
                            <i class=\"fa fa-chevron-left\"></i>
                            <i class=\"fa fa-chevron-right\"></i>
                    </nav>
                    <div class=\"kv-detail-v2-photos kv-full-width-child\">
                        {$labelsString}
                        {$openhouseString}
                        {$imageGallery}
                    </div>
	    ";
        return $slideShow;
    }

    public function get_call_to_action($settings): string
    {
        $show_mls_logo_in_header = isset($settings["listing_detail"]["show_mls_logo_in_header"]) ? $settings["listing_detail"]["show_mls_logo_in_header"] : false;
        $hide_listing_date = isset($settings["listing_detail"]["hide_listing_date"]) ? $settings["listing_detail"]["hide_listing_date"] : false;
        $show_prequalify_button = isset($settings["listing_detail"]["show_prequalify_button"]) ? $settings["listing_detail"]["show_prequalify_button"] : false;
        $show_mls_disclaimer_in_header = isset($settings["listing_detail"]["show_mls_disclaimer_in_header"]) ? $settings["listing_detail"]["show_mls_disclaimer_in_header"] : false;
        $tracking_code_script = isset($settings["listing_detail"]["tracking_code_script"]) ? $settings["listing_detail"]["tracking_code_script"] : '';
        $is_exclusive_listing = isset($this->listing->is_exclusive_listing) ? $this->listing->is_exclusive_listing : false;
        $mlsLogo = $show_mls_logo_in_header === "1" && !empty($this->listing->mlsid) ? "<li><img src=\"https://d9la9jrhv6fdd.cloudfront.net/mlslogos/{$this->listing->mls}.png\" alt=\"{$this->listing->mlsName->data->name}\"></li>" : "";
        $mlsid = (!empty($this->listing->mlsid) && !$is_exclusive_listing) ? "<li>MLS# {$this->listing->mlsid}</li>" : '';
        $date = $this->listing->listingdate ? $hide_listing_date !== "1" ? "<li>" . date("m/d/Y", $this->listing->listingdate) . "</li>" : "" : "";
        $trackingCodeTxt = $tracking_code_script;
        $codeParams = ["[mlsid]", "[address]", "[city]", "[state]", "[price]", "[beds]", "[baths]", "[area]", "[neighborhood]"];
        $thisListingMlsid = isset( $this->listing->mlsid ) ? $this->listing->mlsid : '';
        $replaceParamsWith = [$thisListingMlsid, $this->listing->address, $this->listing->city, $this->listing->state, $this->listing->price, $this->listing->beds, $this->listing->baths, $this->listing->area, $this->listing->neighborhood];
        $trackingCode = $trackingCodeTxt ? str_replace($codeParams, $replaceParamsWith, $trackingCodeTxt) : '';
        $preQualify = "";
        if ($show_prequalify_button === "1" && (!empty($this->listing->agentname) && !empty($this->listing->brokername))) {
            $preQualify = "<li><div class=\"kv-detail-prequalify kv-button kv-button-inverted\">Get pre-approved</div></li>";
        }
        if ($show_prequalify_button === "2" && $settings["listing_detail"]["prequalify_link"] && (!empty($this->listing->agentname) && !empty($this->listing->brokername))) {
            $preQualify = "<li><a href=\"{$settings["listing_detail"]["prequalify_link"]}\" target=\"_blank\" class=\"kv-button kv-button-inverted\">Get pre-approved</a></li>";
        }
        $showListingAgentAndMLsInHeader = !$is_exclusive_listing ? "<div class=\"kv-container kv-detail-v2-compliance\">Presented By: ".$this->get_mls_courtesy_of($this->listing)."</div>" : "";

        $siteName = get_bloginfo('name');
        $mlsDisclaimer = $show_mls_disclaimer_in_header === "1" ? "<div class=\"kv-container kv-detail-v2-compliance\">Disclaimer: The information contained in this listing has not been verified by {$siteName} and should be verified by the buyer.</div>" : "";

        return "
                <div class=\"kv-container-space-between kv-mb-0 kv-pl-0\">
                    {$showListingAgentAndMLsInHeader}
                </div>
                <div class=\"kv-container-space-between kv-mb-0\">
                    <ul class=\"kv-list-bar kv-list-bar-no-border\">
                        {$mlsLogo}
                        {$mlsid}
                        {$date}
                    </ul>
                    <ul class=\"kv-list-bar kv-list-bar-no-border\">
                        {$preQualify}
                        <li>
                            <div class=\"kv-detail-requesttour kv-button kv-button-inverted\">Request Tour</div>
                        </li>".
                        "<li>
                            <div class=\"kv-detail-request kv-button kv-button-inverted\">Request Info</div>
                        </li>
                    </ul>
                </div>
                
                $mlsDisclaimer
                {$trackingCode}";
    }

    public function get_footage_type()
    {
        $acreageTypes = ['Acreage', 'Com Land', 'Cross Property', 'Farm', 'Land', 'Land Lease', 'Lot', 'Lot-Land'];
        $footageType = 'footage';
        if (in_array($this->listing->type, $acreageTypes))
            $footageType = 'acreage';

        return $footageType;
    }

    public function get_feature_icons($publicUrl): string
    {
        $bathsCalculated = $this->listing->halfbaths > 0 ? $this->listing->baths . ' / ' . $this->listing->halfbaths : $this->listing->baths;
        $footageType = $this->get_footage_type();
        $footageName = $footageType == 'footage' ? 'SQFT' : 'ACRES';

        $footageFormatted = null;
        if (is_numeric($this->listing->footage)) {
            $footageFormatted = number_format($this->listing->footage);
        } else {
            $footageFormatted = $this->listing->footage;
        }

        $canadaBeds = '';

        $listingFeaturesInterior = isset( $this->listing->features->data->interior ) ? $this->listing->features->data->interior : null;

        if ($listingFeaturesInterior) {
            foreach ($this->listing->features->data->interior as $feature) {
                if ($feature->name === 'totalBedrooms') {
                    $canadaBeds = $feature->value;
                }
            }
        }


        $displayBeds = !empty($canadaBeds) ? $canadaBeds : $this->listing->beds;

        $beds = !empty($displayBeds) ? "<li><img src=\"{$publicUrl}/images/detail/bed.svg\">Beds &bull; {$displayBeds}</li>" : "";
        if ($this->listing->halfbaths > 0) {
            $baths = !empty($bathsCalculated) ? "<li><img src=\"{$publicUrl}/images/detail/bath.svg\">Full/Half Baths &bull; {$bathsCalculated}</li>" : "";
        } else {
            $baths = !empty($bathsCalculated) ? "<li><img src=\"{$publicUrl}/images/detail/bath.svg\">Baths &bull; {$bathsCalculated}</li>" : "";
        }
        $footage = !empty($this->listing->footage) ? "<li><img src=\"{$publicUrl}/images/detail/footage.png\">{$footageName} &bull; {$footageFormatted}</li>" : "";
        $garage = !empty($this->listing->garage) ? "<li><img src=\"{$publicUrl}/images/detail/garage.svg\">Garage &bull; {$this->listing->garage}</li>" : "";
        $yearBuilt = !empty($this->listing->yearbuilt) ? "<li><img src=\"{$publicUrl}/images/detail/year.svg\">Year Built &bull; {$this->listing->yearbuilt}</li>" : "";
        return "{$beds}{$baths}{$footage}{$garage}{$yearBuilt}";

    }


    public function get_mls_courtesy_of($listing) {
        //$listing param is used inside the eval part
        $mlsServices = Api::request('GET', "public/mls-services");
        ob_start();
        eval($mlsServices->data[0]->courtesy);
        $courtesy = ob_get_contents();
        ob_end_clean();
        return $courtesy;
    }

    public function get_feature_list($featureTypes) : string {
	    $featureList = "";
        $is_exclusive_listing = isset($this->listing->is_exclusive_listing) ? $this->listing->is_exclusive_listing : false;
        if(!$is_exclusive_listing && !empty($this->listing->featureGroups->data)) {
            $featureList .= "<div class=\"kv-row-container\">
            <div class=\"kv-detail-v2-features kv-detail-v2-interiorfeatures kv-my-5\">
                <div class=\"kv-container\">
                    <h2>Interior Features for {$this->listing->address}</h2>
                </div>";
            $featureGroupsArr = $this->listing->featureGroups->data;
            $featureGroupsArr = json_decode(json_encode($featureGroupsArr), true);
            
            $sorted = [];
            $keys = array_keys($featureGroupsArr);
            sort($keys);

            //special case bedrooms first
            if ($keys[0] === 'bathrooms' && ( (isset($keys[1]) ? $keys[1] : null) === 'bedrooms') ) {
                $temp = $keys[0];
                $keys[0] = $keys[1];
                $keys[1] = $temp;
            }
            foreach ($keys as $key) {
                $sorted[$key] = $featureGroupsArr[$key];
            }

            foreach ($sorted as $type => $group) {
                if (empty($this->listing->featureGroups->data->{$type}))
                    continue;
                $headUppercase = ucwords(str_replace("_", " ", $type));
                $specificFeatures = "";

                $count = count($this->listing->featureGroups->data->{$type});
                $allItems = $this->listing->featureGroups->data->{$type};
                $itemsWithNumbers = [];

                //realname is blank causes sorting issue
                foreach ($allItems as $key => $item) {
                    $item->realname = !empty($item->realname) ? $item->realname : $item->name;
                    //Filter/remove Buyer Office Email
                    if ($item->name == 'BuyerOfficeEmail' ) {
                        unset($allItems[$key]);
                    }
                    //numbers need to be ordered after
                    if (is_numeric($item->realname[0])) {
                        unset($allItems[$key]);
                        array_push($itemsWithNumbers, $item);
                    }
                }
                
                $canada = $this->settings['optimize_for_canada'];

                $specificFeatures .= "<div class=\"kv-row kv-no-gutters kv-mt-5 kv-w-100\"><h3 class=\"kv-p-3 kv-w-100\">{$headUppercase}</h3><div class=\"kv-list-v2\">";

                //sorting 3rd level descripions
                $columnsForSort = array_column($allItems, 'realname');

                if (sizeof($columnsForSort) > 1) {
                    array_multisort($columnsForSort, SORT_ASC, $allItems);
                }

                if (sizeof($itemsWithNumbers) > 0) {
                    //sorting numbered ones
                    $numberedColumnsForSort = array_column($itemsWithNumbers, 'realname');

                    if (sizeof($numberedColumnsForSort) > 1) {
                        array_multisort($numberedColumnsForSort, SORT_ASC, $itemsWithNumbers);
                    }
                    //put numbered ones at end
                    $allItems = array_merge($allItems, $itemsWithNumbers);
                }

                $count = count($allItems);
                $firstHalf = array_slice($allItems, 0, intval($count / 2));
                $secondHalf = array_slice($allItems, intval($count / 2));

                foreach ($firstHalf as $single) {
                    $realName = !empty($single->realname) ? $single->realname : $single->name;
                    //Remove anything with HOA if canada setting returns true
                    if (strpos($realName, 'HOA') !== false && $canada) {
                        continue;
                    }
                    $value = preg_replace('/,(?=[^\s])/', ', ', $single->value);

                    // We're going to have to clean up some of these fields that need to be formatted as currency.
                    if (in_array($realName, ['HOA Fee', 'Maintenance Fee'])) {
                        $value = "$" . $value;
                    } elseif (in_array($realName, ['Taxes'])) {
                        $value = "$" . number_format(floatval($value));
                    }

                    if (strpos($single->realname, 'Virtual') !== false) {
                        $specificFeatures .= "
                                            <div class=\"kv-list-v2-item\">
                                                <span class=\"kv-list-v2-item-name\">{$realName}</span
                                                ><span class=\"kv-list-v2-item-value\"><a href=\"{$value}\" target=\"_blank\">{$single->value}</a></span>
                                            </div>";
                    } else {                    
                        $specificFeatures .= "
                                            <div class=\"kv-list-v2-item\">
                                                <span class=\"kv-list-v2-item-name\">{$realName}</span
                                                ><span class=\"kv-list-v2-item-value\">{$value}</span>
                                            </div>";
                    }
                }
                $specificFeatures .= "</div><div class=\"kv-list-v2\">";
                foreach ($secondHalf as $single) {
                    $realName = !empty($single->realname) ? $single->realname : $single->name;
                    //Remove anything with HOA if canada setting returns true
                    if (strpos($realName, 'HOA') !== false && $canada) {
                        continue;
                    }
                    $value = $single->value ? preg_replace('/,(?=[^\s])/', ', ', $single->value) : '';
                    // We're going to have to clean up some of these fields that need to be formatted as currency.
                    if (in_array($realName, ['HOA Fee', 'Maintenance Fee'])) {
                        $value = "$" . $value;
                    } elseif (in_array($realName, ['Taxes'])) {
                        $value = "$" . number_format(floatval($value));
                    }

                    if (strpos($single->realname, 'Virtual') !== false) {
                        $specificFeatures .= "
                                            <div class=\"kv-list-v2-item\">
                                                <span class=\"kv-list-v2-item-name\">{$realName}</span
                                                ><span class=\"kv-list-v2-item-value\"><a href=\"{$value}\" target=\"_blank\">{$single->value}</a></span>
                                            </div>";
                    } else {
                        $specificFeatures .= "
                                            <div class=\"kv-list-v2-item\">
                                                <span class=\"kv-list-v2-item-name\">{$realName}</span
                                                ><span class=\"kv-list-v2-item-value\">{$value}</span>
                                            </div>";
                    }
                }    
                $specificFeatures .= "</div></div>";

                //rare case where there is one item layout is messed up
                if ($count == 1) {
                    $specificFeatures = "<div class=\"kv-row kv-no-gutters kv-mt-5 kv-w-100\">
                                            <h3 class=\"kv-p-3 kv-w-100\">{$headUppercase}</h3>
                                            <div class=\"kv-list-v2\">
                                                <div class=\"kv-list-v2-item\">
                                                    <span class=\"kv-list-v2-item-name\">{$realName}</span
                                                    ><span class=\"kv-list-v2-item-value\">{$value}</span>
                                                </div>
                                            </div>
                                        </div>";
                }

                $featureList .= $specificFeatures;
            }

            $featureList .= '</div></div></div>';

        }

        if (!empty($this->listing->roomDetails->data)) {
            $roomDetails = [];
            $specificRoomFeatures = "";
            $roomFeatureAllCount = 0;
            $count = count($this->listing->roomDetails->data);
            $firstHalf = array_slice($this->listing->roomDetails->data, 0, (int)ceil($count / 2));
            $secondHalf = array_slice($this->listing->roomDetails->data, (int)ceil($count / 2));
            $roomFeatureCount = 0;
            $specificRoomFeatures = "<div class=\"kv-list-v2\">";
            foreach ($firstHalf as $single) {
                $specificRoomFeaturesTemp = '';
                $specificRoomFeatureTitle = '';
                foreach ($single as $key=>$value) {
                    $value = preg_replace('/,(?=[^\s])/', ', ', $value);
                    if($key == 'name'){
                        $specificRoomFeatureTitle = $value;
                    }elseif($value && $key !== 'roomtype'){
                            $roomFeatureCount++;
                            $specificRoomFeaturesTemp .= "
                                        <div class=\"kv-list-v2-item\">
                                            <span class=\"kv-list-v2-item-name\">{$key}</span>
                                            <span class=\"kv-list-v2-item-value\">{$value}</span>
                                        </div>";
                    }
                }
                if($roomFeatureCount>0){
                    $specificRoomFeatureTitle = "<div class=\"kv-row kv-no-gutters kv-mt-5 kv-w-100\"><h3 class=\"kv-p-3 kv-w-100\">{$specificRoomFeatureTitle}</h3><div>";
                }else{
                    $specificRoomFeatureTitle = "<div class=\"kv-row kv-no-gutters kv-mt-0 kv-w-100\" style=\"display:none\"><h4 class=\"kv-p-3 kv-w-100\">{$specificRoomFeatureTitle}</h4><div>";
                }
                $specificRoomFeatures.= ($specificRoomFeatureTitle.$specificRoomFeaturesTemp."</div></div>");
            }
            $roomFeatureAllCount += $roomFeatureCount;
            $roomFeatureCount = 0;
            $specificRoomFeatures .= "</div><div class=\"kv-list-v2\">";
            foreach ($secondHalf as $single) {
                $specificRoomFeaturesTemp = '';
                $specificRoomFeatureTitle = '';
                $roomFeatureCount = 0;
                foreach ($single as $key=>$value) {
                    $value = preg_replace('/,(?=[^\s])/', ', ', $value);
                    if($key == 'name'){
                        $specificRoomFeatureTitle = $value;
                    }elseif($value && $key !== 'roomtype'){
                        $roomFeatureCount++;
                        $specificRoomFeaturesTemp .= "
                                        <div class=\"kv-list-v2-item\">
                                            <span class=\"kv-list-v2-item-name\">{$key}</span>
                                            <span class=\"kv-list-v2-item-value\">{$value}</span>
                                        </div>";
                    }
                }
                if($roomFeatureCount>0){
                    $specificRoomFeatureTitle = "<div class=\"kv-row kv-no-gutters kv-mt-5 kv-w-100\"><h3 class=\"kv-p-3 kv-w-100\">{$specificRoomFeatureTitle}</h3><div>";
                }else{
                    $specificRoomFeatureTitle = "<div class=\"kv-row kv-no-gutters kv-mt-0 kv-w-100\" style=\"display:none\"><h4 class=\"kv-p-3 kv-w-100\">{$specificRoomFeatureTitle}</h4><div>";
                }
                $specificRoomFeatures.= ($specificRoomFeatureTitle.$specificRoomFeaturesTemp."</div></div>");
            }
            $roomFeatureAllCount += $roomFeatureCount;
            $specificRoomFeatures .= "</div>";

            if($roomFeatureAllCount > 0){
                $featureList .= "<div class=\"kv-row-container kv-row-container-room-details\">
                            <div class=\"kv-detail-v2-features kv-detail-v2-roomdetails kv-my-5\">
                            <div class=\"kv-container\">
                                <h2>Room Details for {$this->listing->address}</h2>
                            </div>";
                $featureList .= $specificRoomFeatures;

                $featureList .= "</div></div>";
            }
        }

        if (!empty($this->listing->featureGroups->data)) {
            $featureTypes = ['general', 'exterior'];
        }
        foreach ($featureTypes as $type) {
            if (empty($this->listing->features->data->{$type}))
                continue;

            $headUppercase = ucfirst($type);
            $specificFeatures = "<div class=\"kv-list-v2\">";

            //sorting descripions
            $columnsForSort = array_column($this->listing->features->data->{$type}, 'realname');

            if (sizeof($columnsForSort) > 1) {
                array_multisort($columnsForSort, SORT_ASC, $this->listing->features->data->{$type});
            }

            $count = count($this->listing->features->data->{$type});
            $firstHalf = array_slice($this->listing->features->data->{$type}, 0, intval($count / 2));
            $secondHalf = array_slice($this->listing->features->data->{$type}, intval($count / 2));

            $canada = $this->settings['optimize_for_canada'];

            foreach ($firstHalf as $single) {
                $realName = $single->realname;

                //Remove anything with HOA if canada setting returns true
                if (strpos($realName, 'HOA') !== false && $canada) {
                    continue;
                }
                $value = $single->value ? preg_replace('/,(?=[^\s])/', ', ', $single->value) : '';

                // We're going to have to clean up some of these fields that need to be formatted as currency.
                if (in_array($realName, ['HOA Fee', 'Maintenance Fee'])) {
                    $value = "$" . $value;
                } elseif (in_array($realName, ['Taxes'])) {
                    $value = "$" . number_format(floatval($value));
                }

                if (strpos($single->realname, 'Virtual') !== false) {
                    $specificFeatures .= "
                                        <div class=\"kv-list-v2-item\">
                                            <span class=\"kv-list-v2-item-name\">{$realName}</span
                                            ><span class=\"kv-list-v2-item-value\"><a href=\"{$value}\" target=\"_blank\">Click here</a></span>
                                        </div>";
                } else {
                    $specificFeatures .= "
                                        <div class=\"kv-list-v2-item\">
                                            <span class=\"kv-list-v2-item-name\">{$realName}</span
                                            ><span class=\"kv-list-v2-item-value\">{$value}</span>
                                        </div>";
                }
            }
            $specificFeatures .= "</div><div class=\"kv-list-v2\">";

            foreach ($secondHalf as $single) {
                $realName = $single->realname;
                //Remove anything with HOA if canada setting returns true
                if (strpos($realName, 'HOA') !== false && $canada) {
                    continue;
                }
                $value = preg_replace('/,(?=[^\s])/', ', ', $single->value);

                // We're going to have to clean up some of these fields that need to be formatted as currency.
                if (in_array($realName, ['HOA Fee', 'Maintenance Fee'])) {
                    $value = "$" . $value;
                } elseif (in_array($realName, ['Taxes'])) {
                    $value = "$" . number_format(floatval($value));
                }

                if (strpos($single->realname, 'Virtual') !== false) {
                    $specificFeatures .= "
                                        <div class=\"kv-list-v2-item\">
                                            <span class=\"kv-list-v2-item-name\">{$realName}</span
                                            ><span class=\"kv-list-v2-item-value\"><a href=\"{$value}\" target=\"_blank\">Click here</a></span>
                                        </div>";
                } else {
                    $specificFeatures .= "
                                        <div class=\"kv-list-v2-item\">
                                            <span class=\"kv-list-v2-item-name\">{$realName}</span
                                            ><span class=\"kv-list-v2-item-value\">{$value}</span>
                                        </div>";
                }
            }
            $specificFeatures .= "</div>";

            //rare case where there is one item layout is messed up
            if ($count == 1) {
                $specificFeatures = "<div class=\"kv-list-v2\">
                                        <div class=\"kv-list-v2-item\">
                                            <span class=\"kv-list-v2-item-name\">{$realName}</span
                                            ><span class=\"kv-list-v2-item-value\">{$value}</span>
                                        </div>
                                    </div>";
            }

            $featureList .= "<div class=\"kv-row-container\">
                                <div class=\"kv-detail-v2-features kv-detail-v2-{$type} kv-my-5\">
                                    <div class=\"kv-container kv-mb-4\">
                                        <h2>{$headUppercase} for {$this->listing->address}</h2>
                                    </div>
                                    <div class=\"kv-row kv-no-gutters kv-w-100\">
                                        {$specificFeatures}
                                    </div>
                                </div>
                            </div>";
        }
        return $featureList;
    }

    public function get_agent_widget()
    {
        $agentWidget = "";
        if (!empty($this->listing->listingAgent->data)) {
            $settings = Settings::get_settings();
            $price = $this->listing->price ? number_format($this->listing->price) : 0;
            $hide_listing_date = isset($settings["listing_detail"]["hide_listing_date"]) ? $settings["listing_detail"]["hide_listing_date"] : false;
            $colisting_agent_work_phone = isset($this->listing->coListingAgent->data->work_phone) ? $this->listing->coListingAgent->data->work_phone : '';
            $show_prequalify_button = isset($settings["listing_detail"]["show_prequalify_button"]) ? $settings["listing_detail"]["show_prequalify_button"] : false;
            $is_exclusive_listing = isset($this->listing->is_exclusive_listing) ? $this->listing->is_exclusive_listing : false;
            $date = $this->listing->listingdate ? $hide_listing_date !== "1" ? "<div class=\"kv-list-v2-item\">
            <span class=\"kv-list-v2-item-name\">List Date</span>
            <span class=\"kv-list-v2-item-value\">" . date("m/d/Y", $this->listing->listingdate) . "</span>
            </div>" : "" : "";
            $showListingAgentCellPhone = isset( $this->listing->listingAgent->data->show_cell_phone ) ? $this->listing->listingAgent->data->show_cell_phone : false;
            $showListingAgentWorkPhone = isset( $this->listing->listingAgent->data->show_work_phone ) ? $this->listing->listingAgent->data->show_work_phone : false;
            $showListingAgentDirectPhone = isset( $this->listing->listingAgent->data->show_direct_phone ) ? $this->listing->listingAgent->data->show_direct_phone : false;
            $use_cell = $showListingAgentCellPhone === 1 ? $this->listing->listingAgent->data->cell_phone : null;
            $use_work = $showListingAgentWorkPhone === 1 ? $this->listing->listingAgent->data->work_phone : null;
            $use_direct = $showListingAgentDirectPhone === 1 ? $this->listing->listingAgent->data->direct_phone : null;

            $phone = !empty($this->listing->listingAgent->data) ? $this->get_first_agent_phone([$use_cell, $use_work, $use_direct]) : '';
            $phone = $this->formatPhone($phone);
            $coagentphone = $this->listing->coListingAgent->data->cell_phone ?? $this->listing->coListingAgent->data->direct_phone ?? $colisting_agent_work_phone;
            $coagentphone = $this->formatPhone($coagentphone);
            $preQualify = "";
            $websiteUrlToUse = "";
            if (!empty($this->listing->listingAgent->data->website_url)) {
                $websiteUrlToUse = "<a href=\"{$this->listing->listingAgent->data->website_url}\" target=\"_blank\" class=\"kv-detail-agentwebsite kv-button kv-button kv-mt-2\">Visit My Website</a>";
            }
            if (!empty($this->listing->listingAgent->data->kvcoreuserdomain)) {
                $websiteUrlToUse = "<a href=\"{$this->listing->listingAgent->data->kvcoreuserdomain}\" target=\"_blank\" class=\"kv-detail-agentwebsite kv-button kv-button-inverted-v2 kv-mt-2\">Visit My Website</a>";
            }

            if ($show_prequalify_button === "1" && (!empty($this->listing->agentname) && !empty($this->listing->brokername))) {
                $preQualify = "<div class=\"kv-detail-prequalify kv-button kv-button-inverted-v2\">Get pre-approved</div>";
            }
            if ($show_prequalify_button === "2" && $settings["listing_detail"]["prequalify_link"] && (!empty($this->listing->agentname) && !empty($this->listing->brokername))) {
                $preQualify = "<a href=\"{$settings["listing_detail"]["prequalify_link"]}\" target=\"_blank\" style=\"margin-bottom:8px!important;\" class=\"kv-button kv-button-inverted-v2\">Get pre-approved</a>";
            }
            $mls_row = !$is_exclusive_listing ? "<div class=\"kv-list-v2-item\"><span class=\"kv-list-v2-item-name\">MLS#</span><span class=\"kv-list-v2-item-value\">{$this->listing->mlsid}</span></span></div>" : "";
            $listingTypeName = $this->listing->typeName ?? '';
            $agentWidget .=
                "<div class=\"kv-detail-v2-agent kv-mt-5\">
                    <div class=\"kv-detail-v2-agent-photo\">
                        <img src=\"{$this->listing->listingAgent->data->photo}\">
                    </div>
                    <div class=\"kv-detail-v2-agent-details\">
                        <h2 class='kv-detail-v2-agent-full-name'>{$this->listing->listingAgent->data->full_name}</h2>
                        <div class='kv-detail-v2-agent-title'>{$this->listing->listingAgent->data->title}</div>
                        <div class=\"kv-list-v2\">
                            <div class=\"kv-list-v2-item\">
                                <span class=\"kv-list-v2-item-name\">Price</span>
                                <span class=\"kv-list-v2-item-value\">\${$price}</span>
                            </div>
                            {$mls_row}
                            {$date}
                            <div class=\"kv-list-v2-item\">
                                <span class=\"kv-list-v2-item-name\">Property Type</span>
                                <span class=\"kv-list-v2-item-value\">{$listingTypeName}</span>
                            </div>
                            <div class=\"kv-list-v2-item\">
                                <span class=\"kv-list-v2-item-name\">Phone</span>
                                <span class='kv-list-v2-item-name-phone'>
                                    <a href=\"tel:{$phone}\" class=\"kv-list-v2-item-value\">{$phone}</a>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class=\"kv-detail-v2-agent-cta\">
                        {$preQualify}
                        <div class=\"kv-detail-requesttour kv-button kv-button-inverted-v2\">Request Tour</div>
                        <div class=\"kv-detail-request kv-button kv-button-inverted-v2\">Request Info</div>
                        {$websiteUrlToUse}
                    </div>
                </div>";
        }
        if (!empty($this->listing->coListingAgent->data)) {
            $agentWidget .=
                "<div class=\"kv-detail-v2-agent kv-mt-5\">
                    <div class=\"kv-detail-v2-coagent-photo\">
                        <img src=\"{$this->listing->coListingAgent->data->photo}\">
                    </div>
                    <div class=\"kv-detail-v2-agent-details\">
                        <h2 class='kv-detail-v2-coagent-full-name'>{$this->listing->coListingAgent->data->full_name}</h2>
                        <div class='kv-detail-v2-coagent-title'>{$this->listing->coListingAgent->data->title}</div>
                        <div class=\"kv-list-v2\">
                            <div class=\"kv-list-v2-item\">
                                <span class=\"kv-list-v2-item-name\">Price</span>
                                <span class=\"kv-list-v2-item-value\">\${$price}</span>
                            </div>
                            {$mls_row}
                            {$date}
                            <div class=\"kv-list-v2-item\">
                                <span class=\"kv-list-v2-item-name\">Property Type</span>
                                <span class=\"kv-list-v2-item-value\">{$this->listing->typeName}</span>
                            </div>
                            <div class=\"kv-list-v2-item\">
                                <span class=\"kv-list-v2-item-name\">Phone</span>
                                <span class='kv-list-v2-item-name-coagentphone'>
                                    <a href=\"tel:{$coagentphone}\" class=\"kv-list-v2-item-value\">{$coagentphone}</a>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class=\"kv-detail-v2-agent-cta\">
                        {$preQualify}
                        <div class=\"kv-detail-requesttour kv-button kv-button-inverted-v2\">Request Tour</div>
                        <div class=\"kv-detail-request kv-button kv-button-inverted-v2\">Request Info</div>
                    </div>
                </div>";
        }
        return $agentWidget;
    }

    public function get_additional_details(): string
    {
        $additionalDetails = "";

        if (empty($this->listing->history->data) && empty($this->listing->schools->data) && empty($this->listing->listingAgent->data)) {
            return $additionalDetails;
        }
        return
            "<div class=\"kv-row-container\">
                <div class=\"kv-detail-v2-additional-agent kv-my-5\">
                    {$this->get_history_and_schools()}
                    {$this->get_agent_widget()}
                </div>
            </div>";
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

    public function no_listing_found_content($data) {
        $notLoggedInButHasSoldListingSet = $this->listing->soldFields->data->sold_price && $_COOKIE['kvcoreidx_has_vow_access'];
        $content = 
            "
            <div class=\"kv-detail-sold-col\">
                <h1>
                    <span class=\"kv-detail-v2-main-city\"><i class=\"fa fa-map-marker\"></i>{$data->city}, {$data->state} {$data->zip}</span>
                    <span class=\"kv-detail-v2-main-address\">{$data->address}</span>
                </h1>
                <h2>
                    Oops! This listing is no longer available.
                </h2>
                <p>
                    Please provide your email address and phone number and we will update you of any status changes. You can also view more listings below.
                </p>
                <button class=\"kv-mt-4 kv-button kv-detail-v2-back-to-search-button kv-button\">
                    BACK TO PROPERTY SEARCH
                </button>
            </div>
            ";
        if ($notLoggedInButHasSoldListingSet) {
            $content = 
            "
            <div class=\"kv-detail-sold-col\">
                <div class=\"listing-row text-center\" style=\"padding: 1rem;\">
                    <h5><strong>Looking for a specific listing? Maybe it went off the market!</strong></h5>
                    <br />
                        <p><strong>OR</strong></p>
                        <p>
                            <button class=\"kv-mt-4 kv-button kv-detail-vow-login-trigger kv-button\">Login to view sold listings</button>
                        </p>
                    <br />
                    <h5><strong>Want to Know What Happened to this Listing? Drop us a Line!</strong></h5>
                </div>
            </div>
            ";
        }
        return $content;
    }

    public function listing_detail_view()
    {
        $data = $this->listing;

        $pages = Settings::get_plugin_page_urls();
        if (empty($data)) {
            $settings = Settings::get_settings();

            $limit = 6;
            $listings = Api::request('GET', "public/listings?limit={$limit}&ourListings=1&currentFilters[perRow]={$limit}", []);
            if(!empty($listings->data)) {
                foreach($listings->data as $listing) {
                    $listing_detail_page = Settings::get_setting('listing_detail_page');
                    $detail_page_url = trailingslashit(get_permalink($listing_detail_page));
                    $listing->detail_url = $detail_page_url . $listing->mls . '-' . $listing->mlsid . '-' . $this->get_slug($listing->address) . '-' . $this->get_slug($listing->city) . '-' . $listing->state . '-' . $listing->zip;
                }
            }

            $kvcoreidx = [
                'options' => $settings,
                'pages' => Settings::get_plugin_page_urls(),
                'publicUrl' => KVCORE_IDX_PUBLIC_URL,
                'phone' => ''
            ];

            // Ensure we return a 404 so that search engines don't think this is a duplicate page
            global $wp_query;
            $wp_query->set_404();
            status_header(404);

            return View::render('no-listing-found', ['properties_search_url' => $pages['properties'], 'mls' => $this->mls, 'mlsid' => $this->mlsid, 'kvcoreidx' => $kvcoreidx, 'listings' => $listings]);
        }
        $saveOrRemove = "";
        $is_exclusive_listing = isset($this->listing->is_exclusive_listing) ? $this->listing->is_exclusive_listing : false;
        $data_saved  = isset($data->saved ) ? $data->saved  : false;
        $listing_enhancements_data_video  = isset($this->listing->enhancements->data->video ) ? $this->listing->enhancements->data->video  : false;
        if (!$is_exclusive_listing) {
            $saveOrRemove = !$data_saved ? "<a id=\"kv-detail-save\" href=\"\" data-mls=\"{$this->mls}\"
            data-mls_id=\"{$this->mlsid}\"><i class=\"fa fa-heart-o\"></i><span>Save</span></a>" : "<a id=\"kv-detail-save\" class=\"saved-listing\" href=\"\"  data-mls=\"{$this->mls}\"
            data-mls_id=\"{$this->mlsid}\"><i class=\"fa fa-heart\"></i><span>Remove</span></a>";
        }
        $pages = Settings::get_plugin_page_urls();
        $virtualTour = $data->virtualtour ? "<li><a href=\"{$data->virtualtour}\" target=\"_blank\" class=\"kv-detail-v2-details-virtualtour\"><i class=\"fa fa-video-camera\"></i>Virtual Tour</a></li>" : "";
        if (!empty($this->listing->enhancements->data->virtualtour)) {
            $virtualTour = "<li><a href=\"{$this->listing->enhancements->data->virtualtour}\" target=\"_blank\" class=\"kv-detail-v2-details-virtualtour\"><i class=\"fa fa-video-camera\"></i>Virtual Tour</a></li>";
        }
        $virtualOpenHouse = (isset($data->openHouses->data[0]->unbranded_virtual_url) && !empty($data->openHouses->data[0]->unbranded_virtual_url)) ? "<li><a href=\"{$data->openHouses->data[0]->unbranded_virtual_url}\" target=\"_blank\" class=\"kv-detail-v2-details-virtualopenhouse\"><i class=\"fa fa-video-camera\"></i>Virtual Open House</a></li>" : "";
        if (!empty($this->listing->enhancements->data->virtualoh)) {
            $virtualOpenHouse = "<li><a href=\"{$this->listing->enhancements->data->virtualoh}\" target=\"_blank\" class=\"kv-detail-v2-details-virtualopenhouse\"><i class=\"fa fa-video-camera\"></i>Virtual Open House</a></li>";
        }
        $video = $listing_enhancements_data_video ? "<li><a href=\"{$listing_enhancements_data_video}\" target=\"_blank\"><i class=\"fa fa-play\"></i>Video</a></li>" : "";
        $settings = Settings::get_settings();
        $this->settings = $settings;
        $hide_mortgage_calculator  = isset($settings["listing_detail"]["hide_mortgage_calculator"] ) ? $settings["listing_detail"]["hide_mortgage_calculator"]  : false;
        if (!empty($this->listing->remarks)) {
            $this->listing->remarks = stripslashes(utf8_decode($this->listing->remarks));
        }
        $remarks = !empty($this->listing->remarks) ? "<div class=\"kv-container kv-detail-v2-details-description\">{$this->listing->remarks}</div>" : "";
        if (!empty($this->listing->enhancements->data->description)) {
            $remarks = "<div class=\"kv-container kv-detail-v2-details-description\">{$this->listing->enhancements->data->description}</div>";
        }
        $presented_by = !$is_exclusive_listing ? "<div class=\"kv-container kv-mt-2\"><b>Presented By: </b>{$this->get_mls_courtesy_of($data)}</div>" : "";

        $mortgage_calculator = $hide_mortgage_calculator !== "1" ? "<section id=\"kv-detail-mortgage-calculator\" class=\"kv-mortgage-calculator-container\"></section>" : "";
        $price = $this->listing->price ? number_format($this->listing->price) : 0;
        //only for manual type sold
        if ($is_exclusive_listing && $this->listing->manualType === 'Sold') {
            $price = $this->listing->sold_price ? number_format($this->listing->sold_price) : 0;
        }
        $modals = View::render("shortcodes/v2-includes", ['kvcoreidx' => ['pages' => Settings::get_plugin_page_urls(), 'options' => Settings::get_settings()]]);
        $listingData = htmlspecialchars(json_encode($data), ENT_QUOTES, 'UTF-8');

        $isOnMarket = isset( $this->listing->isOnMarket->data->isOnMarket ) ? $this->listing->isOnMarket->data->isOnMarket : false ;
        
        $domain_settings = Api::request( 'POST', 'public/domain' );
        $hasFullSoldAccess = $domain_settings->account_settings->enable_sold_data && $domain_settings->account_settings->allow_sold_on_websites && $domain_settings->account_settings->sold_data_active && $domain_settings->account_settings->vow_website_configuration === 0 ? true : false;
        $hasSoldAccessWithCookie = !is_null($_COOKIE['kvcoreidx_has_vow_access']) && !is_null( $_COOKIE['kvcoreidx_lead_id']) ? true : false;
        $canShowFullSoldListing = !is_null($this->listing->soldFields->data->sold_price) && ($hasSoldAccessWithCookie || $hasFullSoldAccess) ? true : false;
        
        if ($isOnMarket || $this->listing->is_exclusive_listing || $canShowFullSoldListing) {
            $content =
                "
                <div id=\"kvcoreidx-listing-details-page\" class='kv-container kv-px-0' data-listing=\"{$listingData}\">
                    <div class=\"kv-detail-v2\">
                        <div class=\"kv-row-container\" style=\"display: none;\"></div>
                        <div class=\"kv-row-container\">
                            <button class=\"kv-detail-v2-back-to-search-button kv-mt-4 kv-button\">BACK TO SEARCH</button>
                            <div class=\"kv-detail-v2-main kv-mt-4 kv-mb-5\">
                                <div class=\"kv-container-space-between\">
                                    <div class=\"kv-mt-4\">
                                        <h1>
                                            <span class=\"kv-detail-v2-main-city\"><i class=\"fa fa-map-marker\"></i>{$data->city}, {$data->state} {$data->zip}</span>
                                            <span class=\"kv-detail-v2-main-address\">{$data->address}</span>
                                        </h1>
                                    </div>
                                    <div class=\"kv-mt-4\">
                                        <div class=\"kv-detail-v2-main-price\">
                                            <h2>
                                                \${$price}
                                            </h2>
                                        </div>
                                        <ul class=\"kv-detail-v2-main-actions kv-list-bar\">
                                            <li>
                                                {$saveOrRemove}
                                            </li>
                                            <li><a id=\"kv-detail-share\" href=\"\"><i class=\"fa fa-share-alt\"></i>Share</a></li>
                                            <li><a id=\"kv-detail-print-flyer\" href=\"\"><i class=\"fa fa-file-text-o\"></i>Print</a></li>
                                            <li>
                                                <a href=\"{$pages['user_profile']}#tab-saved-searches\">
                                                    <i class=\"fa fa-envelope-o\"></i>Saved Searches
                                                </a>
                                            </li>
                                            {$virtualTour}
                                            {$virtualOpenHouse}
                                            {$video}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class=\"kv-row-container kv-detail-v2-photos-container\">
                            {$this->get_images()}
                        </div>
                        <div id=\"kv-detail-v2-cta\" class=\"kv-row-container\">
                            <div class=\"kv-detail-v2-cta kv-my-4\">
                                {$this->get_call_to_action($settings)}
                            </div>
                        </div>
                        <div class=\"kv-row-container\">
                            <div class=\"kv-detail-v2-info kv-my-5\">
                                <div class=\"kv-container-space-between kv-mb-0\">
                                    <ul class=\"kv-list-bar kv-list-bar-no-border\">
                                        {$this->get_feature_icons(KVCORE_IDX_PUBLIC_URL)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class=\"kv-row-container\">
                            <div class=\"kv-detail-v2-details kv-my-5\">
                                <div class=\"kv-container kv-mb-4 kv-detail-v2-details-title\">
                                    <h2>Home Details</h2>
                                </div>
                                {$remarks}
                                {$presented_by}
                            </div>
                        </div>
                        {$this->get_feature_list(['general', 'interior', 'exterior'])}
                        {$this->get_additional_details()}
                        <section id=\"kv-detail-v2-map\" class=\"kv-detail-v2-map\"></section>
                        {$mortgage_calculator}
                        <div class=\"kv-row-container\">
                            <div class=\"kv-detail-v2-compliance-similar kv-my-5\">
                                <div class=\"kv-detail-v2-similar kv-hidden\">
                                    <div class=\"kv-container kv-mb-4\">
                                        <h2>Similar Properties to {$this->listing->address}</h2>
                                    </div>
                                    <div id=\"kv-detail-v2-similar\" class=\"kv-container kv-px-0\">

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {$modals}
                <style>
                    img.lazy {
                        background: #F1F1FA;
                        width: 400px;
                        height: 300px;
                        display: inline-block;
                        border: 0;
                    }
                </style>";
        } else {
            $content =
            "
            <div id=\"kvcoreidx-listing-details-page\" class='kv-container kv-px-0' data-listing=\"{$listingData}\">
                <div class=\"kv-detail-v2\">
                    <div class=\"kv-detail-sold\">
                        {$this->no_listing_found_content($data)}
                        <div class=\"kv-detail-sold-col\">
                            <form class=\"ask-a-question-form kv-form\" action=\"public/leads/question\" method=\"put\" data-callback=\"null\" data-children-count=\"4\">
                                <input id=\"modal--question-mlsid\" name=\"mls_id\" type=\"hidden\" value=\"{$data->mlsid}\" />
                                <input id=\"modal--question-mls\" name=\"mls\" type=\"hidden\" value=\"{$data->mls}\" />
                                <input id=\"modal--question-lead_id\" name=\"lead_id\" type=\"hidden\" value=\"{$data->lead_id}\" />
                                <label for=\"modal--question-name\">
                                    Name
                                </label>
                                <input id=\"modal--question-name\" class=\"kv-form-control\" name=\"name\" type=\"text\" placeholder=\"John Doe\" data-kwimpalastatus=\"alive\" data-kwimpalaid=\"1604006156874-0\" />
                                <label for=\"modal--question-email\">
                                    Email
                                </label>
                                <input id=\"modal--question-email\" class=\"kv-form-control\" name=\"email\" type=\"text\" placeholder=\"Email Address\" data-kwimpalastatus=\"alive\" data-kwimpalaid=\"1604006156874-1\" />
                                <label for=\"modal--question-phone\">
                                    Phone
                                </label>
                                <input id=\"modal--question-phone\" class=\"kv-form-control\" name=\"phone\" type=\"text\" placeholder=\"Phone\" data-kwimpalastatus=\"alive\" data-kwimpalaid=\"1604006156874-2\" />
                                <label for=\"modal--question-question\">
                                    Comments
                                </label>
                                <label for=\"modal--question-question\">
                                </label>
                                <textarea id=\"modal--question-question\" class=\"kv-form-control\" name=\"question\">I would like to be updated on the status of MLS ID #{$data->mlsid}</textarea>
                                <button class=\"kv-button\" type=\"submit=\">
                                    SUBMIT
                                </button>
                            </form>
                        </div>
                    </div>
                    <div class=\"kv-row-container\">
                        <div class=\"kv-detail-v2-compliance-similar kv-my-5\">
                            <div class=\"kv-detail-v2-similar kv-hidden\">
                                <div class=\"kv-container kv-mb-4\">
                                    <h2>Similar Properties to {$this->listing->address}</h2>
                                </div>
                                <div id=\"kv-detail-v2-similar\" class=\"kv-container kv-px-0\">

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {$modals}
            ";
        }
        return $content;
    }

    public function formatPhone($number)
    {
        $pattern = '/(\d{3})(\d{3})(\d{0,})/';
        return Settings::get_setting('team/phone_format') === 'bracket'
            ? preg_replace($pattern, '($1) $2-$3', (string)$number)
            : preg_replace($pattern, '$1.$2.$3', (string)$number);
    }

    public function get_history_and_schools()
    {
        if (empty($this->listing->history->data) && empty($this->listing->schools->data))
            return "";
        $priceHistory = "";

        if (!empty($this->listing->history->data && $this->settings['optimize_for_canada'] != "1")) {
            $priceHistory =
                "<div class=\"kv-list-v2\"><h3 class=\"kv-list-v2-title\">Price History</h3><div class=\"kv-detail-v2-additional-agent-price-history\"></div></div>";
        }
        $schoolData = "";
        if (!empty($this->listing->schools->data)) {
            $schoolTypeNames = [
                'middleschool' => 'Middle School',
                'elementaryschool' => 'Elementary School',
                'highschool' => 'High School'
            ];
            $thereIsNoSchoolData = true;
            $schoolData .=
                "<div class=\"kv-list-v2\">
                    <h3 class=\"kv-list-v2-title\">Schools</h3>";

            foreach ($this->listing->schools->data as $school) {
                if (strpos($school->name, "Unknown") === false) {
                    $schoolData .=
                        "<div class=\"kv-list-v2-item\">
                        <span class=\"kv-list-v2-item-name\">{$schoolTypeNames[$school->type]}</span>
                        <span class=\"kv-list-v2-item-value\">{$school->name}</span>
                    </div>";
                    $thereIsNoSchoolData = false;
                } else {
                    $schoolData .=
                        "<div class=\"kv-list-v2-item\">
                        <span class=\"kv-list-v2-item-name\">{$schoolTypeNames[$school->type]}</span>
                        <span class=\"kv-list-v2-item-value\">N/A</span>
                    </div>";
                }
            }
            $schoolData .= "</div>";

            if ($thereIsNoSchoolData) {
                $schoolData = "";
            }
        }

        return
            "<div class=\"kv-container kv-mb-4\">
                <h2>Additional Details</h2>
            </div>
            <div class=\"kv-row kv-no-gutters kv-detail-v2-features kv-w-100\">
                {$priceHistory}
                {$schoolData}
            </div>";
    }

    public function get_similar_listings()
    {
        $similarListings = Api::request('GET', "public/listings/{$this->listing->mls}/{$this->listing->mlsid}/similar?max=15");
        $similarListings = $similarListings->data;

        $currentLayout = "card";
        $perRow = 6;
        $perRowClass = " kv-per-row-{$perRow}";
        $acreageTypes = ['Acreage', 'Com Land', 'Cross Property', 'Farm', 'Land', 'Land Lease', 'Lot', 'Lot-Land'];
        $similarCarousel = "<div class=\"kv-property-listings kv-grid-columns-{$perRow}\">";
        foreach ($similarListings as $key => $similar) {

            if ($key === 15)
                break;

            $markerId = $similar->lat == 0 && $similar->long == 0 ? 0 : $similar->mlsid;
            $brokerId = !empty($similar->brokerid) ? "kv-property-broker-{$similar->brokerid}" : "";

            $similarCarousel .= "<div class=\"kv-property{$perRowClass} {$brokerId}\" data-marker-id=\"{$markerId}\">";
            $detailUrl = "/details/{$similar->mls}-{$similar->mlsid}";

            $click = $this->settings['listings']['open_in_new_tab'] == "0" ? "window.open('{$detailUrl}', '_blank');" : "document.location='{$detailUrl}';";
            $blank = $this->settings['listings']['open_in_new_tab'] == "0" ? "target=\"_blank\"" : "";
            $footageName = "SQFT";

            if (in_array($similar->typeName, $acreageTypes))
                $footageName = "ACRES";

            $price = number_format($similar->price);
            $address = empty($similar->area) ? $similar->address : $similar->address . ", " . $similar->area;


            //This may need a manual type span
            $coverPhoto = !empty($similar->coverphoto_url) ? "<a href=\"{$detailUrl}\" class=\"kv-box-image\" style=\"background-image: url({$similar->coverphoto_url})\" {$blank}></a>" : "";

            $marker = $currentLayout == 'map' && $similar->lat != 0 && $similar->long != 0 ? "<i class=\"kv-marker\" title=\"View on map\" data-marker-id=\"{$markerId}\"></i>" : "";
            $listingType = !empty($similar->type) ? "<div class=\"kv-box-content-keyword\">{$similar->type}</div>" : "";

            $boxFooter = !empty($similar->mls) && !empty($similar->mlsid) ? "kv-box-footer-count-1" : "";

            $baths = !empty($similar->baths) ? $similar->baths : "-";
            $halfbaths = " / ".$similar->halfbaths;
            $bathsTxt = 'BATHS';
            if (!empty($similar->halfbaths)) {
                $bathsTxt = 'BATHS FULL/HALF';
            }
            $footage = !empty($similar->footage) ? number_format($similar->footage) : "-";
            $beds = !empty($similar->beds) ? $similar->beds : "-";


            $footer = "";
            if (!empty($similar->mls) && !empty($similar->mlsid)) {
                $savedListing = "";
                if (!$this->listing->is_exclusive_listing) {
                    if (empty($similar->saved)) {
                        $savedListing = "saved-listing";
                        $favs = "<i class=\"fa fa-heart-o\"></i>&nbsp;Add to favorites";
                    } else {
                        $favs = "<i class=\"fa fa-heart\"></i>&nbsp;Remove from favorites";
                    }
                }
                $footer =
                    "<div class=\"kv-box-footer\">
                        <a href=\"/properties/?similarMls={$similar->mls}&similarMlsId={$similar->mlsid}\" class=\"kv-box-footer-item kv-small kv-similar-properties\" data-mls=\"{$similar->mls}\" data-mlsid=\"{$similar->mlsid}\" {$blank}>
                            <i class=\"fa fa-balance-scale\"></i>&nbsp;Similar
                        </a>
                        <a href=\"#\" class=\"kv-box-footer-item kv-small add-favorite {$savedListing}\" data-mls=\"{$similar->mls}\" data-mls_id=\"{$similar->mlsid}\">
                            {$favs}
                        </a>
                    </div >";
            }


            $similarCarousel .=
                "<div class=\"kv-box {$boxFooter}\">
                    {$coverPhoto}
                    <div class=\"kv-box-content\" onclick=\"{$click}\">
                        <div class=\"kv-box-title\">
                            <h3 class=\"kv-box-content-title-main\">
                                <span class=\"kv-box-content-title-main-bold\">\${$price}</span>
                            </h3>
                            <h4 class=\"kv-box-content-title-sub\" title=\"{$address}\">
                                {$similar->address} {$similar->city} {$similar->zip}
                            </h4>
                        </div>

                        {$marker}

                        {$listingType}
                    </div>

                    <div class=\"kv-box-footer kv-box-footer-show\">
                        <div class=\"kv-box-footer-item\">
                            <div>{$beds}</div>
                            <small>BEDS</small>
                        </div>
                        <div class=\"kv-box-footer-item\">
                            <div>{$baths}{$halfbaths}</div>
                            <small>{$bathsTxt}</small>
                        </div>
                        <div class=\"kv-box-footer-item\">
                            <span>{$footage}</span>
                            <small class=\"kv-color-gray\">{$footageName}</small>
                        </div>
                    </div>
                   {$footer}
                </div>";

            $similarCarousel .= "</div>";
        }
        $similarCarousel .= "</div>";
        return $similarCarousel;
    }

    private function isMobileDevice()
    {
        return preg_match("/(android|avantgo|blackberry|bolt|boost|cricket|docomo|fone|hiptop|mini|mobi|palm|phone|pie|tablet|up\.browser|up\.link|webos|wos)/i", $_SERVER["HTTP_USER_AGENT"]);
    }
}