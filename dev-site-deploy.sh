#!/bin/bash


# Usage:
#   ./dev-site-deploy <DEPLOYMENT_NAME> <RELEASE_S3_URI>


# Fail on errors and close stdin
set -eo pipefail
exec 0<&-


function main {
    local deployment_name="$1"
    local  release_s3_uri="$2"

    # Assert variables are provided
    local failure=0
    if [ -z "$deployment_name" ]; then
        echo "error: DEPLOYMENT_NAME not provided" 1>&2
        failure=1
    fi
    if [ -z "$release_s3_uri" ]; then
        echo "error: RELEASE_S3_URI not provided" 1>&2
        failure=1
    fi

    if [ "$failure" -ne 0 ]; then
        return $failure
    fi


    # If site doesn't exist yet, then perform first time set up
    if [ ! -d "/www/html/$deployment_name" ]; then

        # DB
        mysql --defaults-extra-file=/etc/ire/wp-db.cnf -se "CREATE DATABASE IF NOT EXISTS $deployment_name;"

        # DNS
        cfdns -zone kvcore.com -create-record -sub $deployment_name.wpdev -type CNAME -value wpdev.kvcore.com -proxy

        # Site installation
        sudo -u www-data composer create-project --remove-vcs --no-install -- roots/bedrock "/www/html/$deployment_name"
        sudo -u www-data composer --working-dir="/www/html/$deployment_name" install

        # Envs installation
        sed "s/{{BRANCH}}/$deployment_name/g" /etc/insidere/wordpress-customer-envs/envs/template.env \
            | sudo -u www-data tee /www/html/$deployment_name/.env > /dev/null
    fi

    # Pull release
    local temp_download="$(mktemp)"
    aws s3 cp "$release_s3_uri" "$temp_download"
    sudo -u www-data rm -rf "/www/html/$deployment_name/web/app/plugins/kvcore-idx"
    sudo -u www-data tar -xvf "$temp_download" --directory "/www/html/$deployment_name/web/app/plugins"

    # Reload fpm
    sudo systemctl reload "$(systemctl list-units | grep -o php.*-fpm.service)"

    # Set last updated time
    echo $(date +%s) | sudo -u www-data tee /www/html/$deployment_name/.last-update > /dev/null
}

main "$@"
