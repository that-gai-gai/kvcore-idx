<?php

declare(strict_types=1);

namespace kvCORE\Shortcode;

use kvCORE\Api;
use kvCORE\Settings;
use kvCORE\Shortcode;
use kvCORE\View;

class Agent_Profile_Sitemap extends Shortcode
{
    protected $name = "agent_profile_sitemap";

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
        switch ($pass) {
            case 1:
                $content .= $this->first_pass();
                break;
            case 2:
                $content .= $this->second_pass();
                break;
        }
        // Return string
        return $content . "</div>";
    }

    /**
     * This will show all offices which can be navigated to see agents under those offices.
     *
     * @return string
     * @throws \Exception
     */
    public function first_pass()
    {
        $content = "<h1>Browse Agents By Office</h1>";

        $offices = API::request('GET', 'public/entity/list', []);

        if(empty($offices->data))
            throw (new \Exception("No offices found"));

        foreach($offices->data as $office) {
            $encodedName = urlencode(str_replace('-', '_', $office->name));
            $content .= "<p><a style='padding: 14px 0' href=\"/agents-sitemap/agents-in-{$encodedName}/?pass=2&entity={$office->id}\">Agents in $office->name</a></p>";
        }

        return $content;
    }

    /**
     * This function will return a bunch of links for agent profile pages under an office. If entity id isn't passed in then it'll just get all agents.
     *
     * @return string
     */
    public function second_pass()
    {

        $agentPageUrl = get_page_link(Settings::get_setting('agent_profile_page'));
        $page = 1;

        global $wp_query;
        $entityId = $wp_query->query_vars['entity'] ?? null;
        $entityName = $wp_query->query_vars['entityName'] ?? null;

        $content = "<h1>Agent Profile Sitemap</h1>";
        if(!empty($entityName)) {
            $entityName = str_replace('_', '-', urldecode($entityName));
            $content = "<h1>Agents in {$entityName}</h1>";
        }


        //Doing a do while because we want at least one request to send.
        do {
            // Hit the api for 200 agents at a time.
            $endpoint = "/public/members/list/sitemap?perpage=500&page={$page}&includeInactive=1";

            if(!empty($entityId))
                $endpoint .= "&entities[]={$entityId}";

            $agents = Api::request('GET', $endpoint, []);

            if (empty($agents->data)) {
                break;
            }

            // Loop through response and add links for each agent.
            foreach ($agents->data as $agent) {
                $agentSlug = $this->build_slug($agent->id, $agent->first_name, $agent->last_name);
                $link = "{$agentPageUrl}{$agentSlug}/";
                $content .= "<p><a style='padding: 14px 0' rel=\"canonical\" href=\"{$link}\">{$agent->first_name} {$agent->last_name}</a></p>";
            }

            $page++;
            $lastPage = $agents->pagination->last_page;

        } while ($page !== $lastPage);

        return $content;

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
     * Getter on the name property
     * @return string
     */
    public function get_name()
    {
        return $this->name;
    }

    /**
     * This will build the agent profile slug, looks like "12345-john-doe"
     *
     * @param $id
     * @param $firstName
     * @param $lastName
     * @return string
     */
    private function build_slug($id, $firstName, $lastName)
    {
        $agentSlug = (string)$id;

        if (!empty($firstName)) {
            $agentSlug .= "-{$firstName}";
        }
        if (!empty($lastName)) {
            $agentSlug .= "-{$lastName}";
        }

        // Check if there are any spaces in the slug.
        if ($agentSlug == trim($agentSlug) && strpos($agentSlug, ' ') !== false) {
            // Sometimes first name or last name have multiple names in them.
            // This will get rid of all the spaces and replace with a hyphen.
            $agentSlug = implode('-', explode(' ', $agentSlug));
        }

        return $agentSlug;
    }
}