<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode;

use kvCORE\Areas_Table;
use kvCORE\Shortcode;
use kvCORE\View;
use kvCORE\Settings;

class Area extends Shortcode {

    public function render($atts = [], $content = '', $name = ''): string {
        if (!is_array($atts)) {
            $atts = [ $atts ];
        }

            //General Data
            $data = \kvCORE\Data_Store\Area_Page::get();
            $mapbox_key = Settings::get_setting( 'mapbox_access_token' );
            $brand_color = Settings::get_brand_colors('primary_color');
            $primary_color = $brand_color['primary_color'];
            $arr = json_decode(json_encode($data), true);
            $area_data = [];
            $area_data['mapbox_key'] = $mapbox_key;
            $area_data['area_location'] = $arr['name'];
            $area_data['branding'] = $primary_color;
            $area_data['areas'] = \kvCORE\Data_Store\Area_Page::get_active();

            //Check enabled Modules
            if ($arr){
                if (in_array("hero", $arr['enabled_modules'])) {
                    $area_data['hero_enabled'] = 'true';
                }
                if (in_array("highlights", $arr['enabled_modules'])) {
                    $area_data['highlights_enabled'] = 'true';
                }
                if (in_array("listings", $arr['enabled_modules'])) {
                    $area_data['listings_enabled'] = 'true';
                }
                if (in_array("areas_and_neighborhoods", $arr['enabled_modules'])) {
                    $area_data['an_enabled'] = 'true';
                }
                if (in_array("market_health", $arr['enabled_modules'])) {
                    $area_data['mh_enabled'] = 'true';
                }
                if (in_array("quick_links", $arr['enabled_modules'])) {
                    $area_data['ql_enabled'] = 'true';
                }

                //Area Page Data
                foreach ($arr as $key => $value ) {
                    foreach ($value as $sub_key => $sub_val ) {
                        if($sub_val['name'] == 'hero'){
                            $area_data['hero_title'] = $sub_val['title'];
                            $area_data['hero_desc'] = $sub_val['description'];
                            $polygon = $sub_val['polygon'];
                            $polygon_key = $sub_val['polygon_key'];
                            $geog_id = $sub_val['geog_id'];
                            if($polygon){
                                $area_data['polygon'] = $polygon; 
                                $area_data['polygon_key'] = $polygon_key; 
                                $area_data['geog_id'] = $geog_id; 
                                $area_data_center = json_decode($polygon, true);
                                $area_data['latlng'] = json_encode($area_data_center[0]);
                            }
                        }
                        if($sub_val['name'] == 'highlights'){
                            $highlights = $sub_val;
                            $area_data['homepriceavg'] = $this->getPercentageChange($sub_val['county_average_home_price'], $sub_val['current_average_home_price']);
                            $area_data['current_home_price'] = $this->thousandsCurrencyFormat($sub_val['current_average_home_price']);
                            $area_data['total_homes'] = $sub_val['total_homes'];
                            $area_data['totalhomesavg'] = $this->getPercentageChange($sub_val['previous_total_homes'], $sub_val['total_homes']);
                            $area_data['new_to_market'] = $sub_val['new_to_market'];
                            $area_data['new_avg'] = $this->getPercentageChange($sub_val['previous_new_to_market'], $sub_val['new_to_market']);
                            $area_data['cost_sqft'] = $sub_val['cost_sqft'];
                            $area_data['cost_sqft_avg'] = $this->getPercentageChange($sub_val['previous_cost_sqft'], $sub_val['cost_sqft']);
                            $area_array = $sub_val['query']['current']['query'];
                        }
                        if($sub_val['name'] == 'areas_and_neighborhoods'){
                            $area_data['areas_and_neighborhoods_data'] = $sub_val;
                        }
                    }
                }

                //$polygons = array_slice($polygon[0], 0, 30);       

                $reduction_api_data = $this->reduction_data($polygon);
                $reduc_arr = json_decode(json_encode($reduction_api_data), true);
                $reductions_data = [];
                $area_data['chart_query'] = $reduction_api_data;
                

                foreach ($reduc_arr as $key => $value ) {
                    foreach ($value as $listing_key => $listing_val ) {
                        foreach ($listing_val as $listing_history => $listing ) {
                            foreach ($listing as $listing_reduc => $listing_reduc_values ) {
                                foreach ($listing_reduc_values as $rd => $rdv ) {
                                    foreach ($rdv as $r => $rv ) {
                                        $reductions_data[] = 
                                            array(
                                            'date' => date('Y-m-d', $rv['dateofchange']),
                                            'percentage' => $rv['percentage']
                                        );
                                    }
                                }
                            }
                        }
                    }
                }

                $reduction_chart = $this->generateReductions($reductions_data);
                $chart_data = $this->chart_values($polygon);
                $chart_arr = json_decode(json_encode($chart_data), true);
                $foreclosures = [];
                $shortsale = [];
                $new = [];

                foreach ($chart_arr as $key => $value ) {
                    foreach ($value as $agg_key => $agg_val ) {
                        foreach ($agg_val as $chart_key => $chart_val ) {
                            foreach ($chart_val as $bucket_key => $bucket_val ) {
                                foreach ($bucket_val as $ct_key => $ct_val ) {
                                    foreach ($ct_val as $r_key => $r_val ) {
                                        $foreclosures[] = $r_val['total_foreclosures']['value'];
                                        $shortsale[] = $r_val['total_shortsales']['value'];
                                        $new[] = $r_val['total_new']['value'];
                                    }                        
                                } 
                            }
                        }  
                    }
                }
                $area_data['new_listings'] = json_encode(array_slice($new, 0, 6));
                $area_data['foreclosures'] = json_encode(array_slice($foreclosures, 0, 6)); 
                $area_data['short_sales'] = json_encode(array_slice($shortsale, 0, 6)); 
                $area_data['reductions'] = json_encode(array_slice($reduction_chart, 0, 6)); 
            }

            if ( empty($atts['area'] ) ) {
                $this->throw_404();
            }
        $area_location = $data->name;
        
        

        return View::render( 'shortcodes/area', $area_data );
    }

    protected function throw_404() {
        global $wp_query;
        $wp_query->set_404();
        status_header(404);
    }

    public function getPercentageChange($oldNumber, $newNumber){
        if($oldNumber > 0){
            $decreaseValue = $oldNumber - $newNumber;
            $percentage = ($decreaseValue / $oldNumber) * 100;
            $finalpercentage = round($percentage);
        }
        else{
            $finalpercentage = 0;
        }
        
    
        return $finalpercentage;
    }

    public function thousandsCurrencyFormat($num) {

        if($num>1000) {
      
              $x = round($num);
              $x_number_format = number_format($x);
              $x_array = explode(',', $x_number_format);
              $x_parts = array('k', 'm', 'b', 't');
              $x_count_parts = count($x_array) - 1;
              $x_display = $x;
              $x_display = $x_array[0] . ((int) $x_array[1][0] !== 0 ? '.' . $x_array[1][0] : '');
              $x_display .= $x_parts[$x_count_parts - 1];
      
              return $x_display;
      
        }
      
        return $num;
    }

    public function chart_values($polygon){

    

        $monthOneStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-1 months")))));
        $monthOneEndDate =  strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-1 months")))));
        $monthTwoStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-2 months")))));
        $monthTwoEndDate = strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-2 months")))));
        $monthThreeStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-3 months")))));
        $monthThreeEndDate = strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-3 months")))));
        $monthFourStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-4 months")))));
        $monthFourEndDate = strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-4 months")))));
        $monthFiveStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-5 months")))));
        $monthFiveEndDate = strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-5 months")))));
        $monthSixStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-6 months")))));
        $monthSixEndDate = strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-6 months")))));

        $listing_api_endpoint = 'https://listing-api.kvcore.com/graphql';
        $listing_api_token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjIsImFjdCI6MjEsImp0aSI6ImtAZWFhJDdUZHJtTVlSJV5wWSN6N2dyZll3I05weGZhSWtqT3BZayFHY1VeSjRAZzJtZlNQZHBRZFZNTiFtZ28iLCJuYmYiOjE1OTMwNDA1NTUsImV4cCI6MTYyNDU3NjU1NSwiaWF0IjoxNTkzMDQwNTU1LCJhdWQiOiJsaXN0aW5ncyJ9.3zZA9G-W-BZIc3BjflQcLJI9lPSG86ltpdfOVSh-KH0';
        $token = $listing_api_token;
        $data = [
            'query' => '{
                listings(
                  filter: {
                    size: 100
                    from: 0
                    body: "{  \\"query\\": {\\"bool\\": {  \\"filter\\": [{  \\"term\\": {\\"is_on_market\\": true  }},{  \\"geo_polygon\\": {\\"location\\": {  \\"points\\": '.$polygon.'}  }}  ]}  },  \\"aggs\\": {\\"chart_stats\\": {  \\"range\\": {\\"field\\": \\"listingdate\\",\\"keyed\\": true,\\"ranges\\": [  {\\"key\\": \\"6\\",\\"to\\": '.$monthSixEndDate.',\\"from\\": '.$monthSixStartDate.'  },  {\\"key\\": \\"5\\",\\"to\\": '.$monthFiveEndDate.',\\"from\\": '.$monthFiveStartDate.'  },  {\\"key\\": \\"4\\",\\"to\\": '.$monthFourEndDate.',\\"from\\": '.$monthFourStartDate.'  },  {\\"key\\": \\"3\\",\\"to\\": '.$monthThreeEndDate.',\\"from\\": '.$monthThreeStartDate.'  },  {\\"key\\": \\"2\\",\\"to\\": '.$monthTwoEndDate.',\\"from\\": '.$monthTwoStartDate.'  },  {\\"key\\": \\"1\\",\\"to\\": '.$monthOneEndDate.',\\"from\\": '.$monthOneStartDate.'  }]  },  \\"aggs\\": {\\"avg_price\\": {  \\"avg\\": {\\"field\\": \\"price\\"  }},\\"total_foreclosures\\": {  \\"sum\\": {\\"script\\": {  \\"lang\\": \\"painless\\",  \\"source\\": \\"return doc[\\\\\\"foreclosure\\\\\\"].value == true ? 1 : 0\\"}  }},\\"total_shortsales\\": {  \\"sum\\": {\\"script\\": {  \\"lang\\": \\"painless\\",  \\"source\\": \\"return doc[\\\\\\"shortsale\\\\\\"].value == true ? 1 : 0\\"}  }},\\"total_new\\" : {  \\"value_count\\": {\\"script\\": {  \\"lang\\": \\"painless\\",  \\"source\\": \\"doc[\\\\\\"type\\\\\\"].value\\"}  }  }  }}  }}"
                  }
                ) {
                  aggregations,
                  listings { listing_history { percentage, dateofchange } }
                }
              }',
        ];

        $curl_url = $listing_api_endpoint;
        $ch = curl_init();
        curl_setopt( $ch, CURLOPT_URL, $curl_url );
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1 );
        curl_setopt($ch, CURLOPT_POST,           1 );
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

        curl_setopt( $ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$token}",
            'Content-Type: application/json',
            'Accept: application/json',
            'DNT: 1'
        ] );
        $output = curl_exec( $ch );
        curl_close( $ch );
        $response = json_decode($output);
        $response->query = $data;
        return $response;
    }

    public function reduction_data($polygon){

       


        $monthOneStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-1 months")))));
        $monthOneEndDate =  strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-1 months")))));
        $monthTwoStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-2 months")))));
        $monthTwoEndDate = strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-2 months")))));
        $monthThreeStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-3 months")))));
        $monthThreeEndDate = strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-3 months")))));
        $monthFourStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-4 months")))));
        $monthFourEndDate = strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-4 months")))));
        $monthFiveStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-5 months")))));
        $monthFiveEndDate = strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-5 months")))));
        $monthSixStartDate = strtotime(date("Y-m-01", strtotime(date("Y-m-d", strtotime("-6 months")))));
        $monthSixEndDate = strtotime(date("Y-m-t", strtotime(date("Y-m-d", strtotime("-6 months")))));

        $listing_api_endpoint = 'https://listing-api.kvcore.com/graphql';
        $listing_api_token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjIsImFjdCI6MjEsImp0aSI6ImtAZWFhJDdUZHJtTVlSJV5wWSN6N2dyZll3I05weGZhSWtqT3BZayFHY1VeSjRAZzJtZlNQZHBRZFZNTiFtZ28iLCJuYmYiOjE1OTMwNDA1NTUsImV4cCI6MTYyNDU3NjU1NSwiaWF0IjoxNTkzMDQwNTU1LCJhdWQiOiJsaXN0aW5ncyJ9.3zZA9G-W-BZIc3BjflQcLJI9lPSG86ltpdfOVSh-KH0';
        $token = $listing_api_token;
        $data = [
            'query' => '{
                listings(
                  filter: {
                    size: 100
                    from: 0
                    body: "{  \\"query\\": {\\"bool\\": {  \\"filter\\": [{  \\"term\\": {\\"is_on_market\\": true  }},{  \\"geo_polygon\\": {\\"location\\": {  \\"points\\": '.$polygon.'}  }}  ]}  },  \\"aggs\\": {\\"chart_stats\\": {  \\"range\\": {\\"field\\": \\"listingdate\\",\\"keyed\\": true,\\"ranges\\": [  {\\"key\\": \\"6\\",\\"to\\": '.$monthSixEndDate.',\\"from\\": '.$monthSixStartDate.'  },  {\\"key\\": \\"5\\",\\"to\\": '.$monthFiveEndDate.',\\"from\\": '.$monthFiveStartDate.'  },  {\\"key\\": \\"4\\",\\"to\\": '.$monthFourEndDate.',\\"from\\": '.$monthFourStartDate.'  },  {\\"key\\": \\"3\\",\\"to\\": '.$monthThreeEndDate.',\\"from\\": '.$monthThreeStartDate.'  },  {\\"key\\": \\"2\\",\\"to\\": '.$monthTwoEndDate.',\\"from\\": '.$monthTwoStartDate.'  },  {\\"key\\": \\"1\\",\\"to\\": '.$monthOneEndDate.',\\"from\\": '.$monthOneStartDate.'  }]  },  \\"aggs\\": {\\"avg_price\\": {  \\"avg\\": {\\"field\\": \\"price\\"  }},\\"total_foreclosures\\": {  \\"sum\\": {\\"script\\": {  \\"lang\\": \\"painless\\",  \\"source\\": \\"return doc[\\\\\\"foreclosure\\\\\\"].value == true ? 1 : 0\\"}  }},\\"total_shortsales\\": {  \\"sum\\": {\\"script\\": {  \\"lang\\": \\"painless\\",  \\"source\\": \\"return doc[\\\\\\"shortsale\\\\\\"].value == true ? 1 : 0\\"}  }},\\"total_new\\" : {  \\"value_count\\": {\\"script\\": {  \\"lang\\": \\"painless\\",  \\"source\\": \\"doc[\\\\\\"type\\\\\\"].value\\"}  }  }  }}  }}"
                  }
                ) {
                  listings { listing_history { percentage, dateofchange } }
                }
              }',
        ];


        $curl_url = $listing_api_endpoint;
        $ch = curl_init();
        curl_setopt( $ch, CURLOPT_URL, $curl_url );
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1 );
        curl_setopt($ch, CURLOPT_POST,           1 );
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

        curl_setopt( $ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$token}",
            'Content-Type: application/json',
            'Accept: application/json',
            'DNT: 1'
        ] );
        $output = curl_exec( $ch );
        curl_close( $ch );
        $response = json_decode($output);
        $response->query = $data;
        return $response;
    }


    public function generateReductions($data){

        $monthSix = $this->reductionCount($data, date("Y-m-01", strtotime(date("Y-m-d", strtotime("-1 months")))),  date("Y-m-t", strtotime(date("Y-m-d", strtotime("-1 months")))));
        $monthFive = $this->reductionCount($data, date("Y-m-01", strtotime(date("Y-m-d", strtotime("-2 months")))),  date("Y-m-t", strtotime(date("Y-m-d", strtotime("-2 months")))));
        $monthFour = $this->reductionCount($data, date("Y-m-01", strtotime(date("Y-m-d", strtotime("-3 months")))),  date("Y-m-t", strtotime(date("Y-m-d", strtotime("-3 months")))));
        $monthThree = $this->reductionCount($data, date("Y-m-01", strtotime(date("Y-m-d", strtotime("-4 months")))),  date("Y-m-t", strtotime(date("Y-m-d", strtotime("-4 months")))));
        $monthTwo = $this->reductionCount($data, date("Y-m-01", strtotime(date("Y-m-d", strtotime("-5 months")))),  date("Y-m-t", strtotime(date("Y-m-d", strtotime("-5 months")))));
        $monthOne = $this->reductionCount($data, date("Y-m-01", strtotime(date("Y-m-d", strtotime("-6 months")))),  date("Y-m-t", strtotime(date("Y-m-d", strtotime("-6 months")))));

        $reductions = [$monthSix, $monthFive,$monthFour,$monthThree,$monthTwo, $monthOne];

        return $reductions;

    }

    public function reductionCount($data, $startDate, $endDate){

        $count = 0;

        foreach ($data as $reduction) {
            if (($reduction['date'] >= $startDate) && ($reduction['date'] <= $endDate)){
                if($reduction['percentage'] > 0){
                    $count++;
                }
            }
        }

        return $count;
    }

}
