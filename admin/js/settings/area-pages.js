(function ($, kv) {
    var $target = $('#area-pages-wrapper');
    var searchTimeout = null;
    var areaListPage = 1;
    var modulesList = [
        {
            name: 'hero',
            title: 'Hero',
            author: 'kvCORE',
            sortable: true,
            configurable: true,
        },
        {
            name: 'highlights',
            title: 'Highlights',
            author: 'kvCORE',
            sortable: true,
            configurable: false,
        },
        {
            name: 'listings',
            title: 'Listings',
            author: 'kvCORE',
            sortable: true,
            configurable: false,
        },
        {
            name: 'areas_and_neighborhoods',
            title: 'Areas & Neighborhoods',
            author: 'kvCORE',
            sortable: true,
            configurable: false,
        },
        {
            name: 'market_health',
            title: 'Market Health',
            author: 'kvCORE',
            sortable: true,
            configurable: false,
        },
        {
            name: 'quick_links',
            title: 'Quick Links',
            author: 'kvCORE',
            sortable: true,
            configurable: false,
        },
    ];

    function switchToAreasListTab() {
        kv.View.render('area-pages-list', {}, $target, getAreasList(displayAreasList));
    }

    function showModuleEdit(data) {
        data.module_data = data.modules.find(function(module) {
            return module.name === data.module.name;
        });

        kv.View.load('area-pages-edit-module-hero',
            data,
            function (output) {
                kv.View.render(
                    'admin-modal',
                    {
                        id: 'kv-module-edit-modal',
                        title: data.module.title + ' Module',
                        content: output,
                    },
                    $target.find('.area-page-modal'),
                    function() {
                        var $moduleEditModal = $('#kv-module-edit-modal');

                        bindAreaPagesEditModuleHero($moduleEditModal, data);

                        $moduleEditModal.kvModal('show');
                    }
                );
            }
        );
    }

    function getAreasList(callback) {
        var data = {};
        var searchString = $target.find("#area-pages-search").val();

        if (searchString) {
            data.q = searchString;
        }

        $.ajax({
            url: kvcoreidxAdminConfig.restNamespace + 'area-page/list',
            data: data,
            beforeSend: function(jqXHR) {
                jqXHR.setRequestHeader('X-WP-Nonce', kvcoreidxAdminConfig.nonce);
            },
            success: function(data) {
                if (data.areas.length) {
                    kvCORE.Search.replaceDataset('area-pages', data.areas);
                } else {
                    kvCORE.Search.removeDataset('area-pages');
                }

                if (callback && typeof callback === 'function') {
                    callback();
                }
            }
        });
    }

    function displayAreasList() {
        var data = { data: [] };

        if (kvCORE.Search.datasetExists('area-pages')) {
            data = kvCORE.Search.search(
                'area-pages',
                '*',
                parseInt($target.find("#area-pages-list-set-rows").val()),
                areaListPage
            );

            data.module_count = modulesList.length;

            data.pagination = {
                current: areaListPage,
                first: 1,
                last: data.last_page,
                show_first: false,
                show_last: false,
                pages: [],
            };

            var maxPageCount = 5;
            var middlePage = Math.ceil(maxPageCount / 2);

            var firstPaged = null;
            var lastPaged = null;

            if (areaListPage <= middlePage) {
                firstPaged = 1;
                lastPaged = Math.min(firstPaged + maxPageCount - 1, data.last_page);
            } else if (areaListPage > data.last_page - middlePage + 1) {
                firstPaged = data.last_page - maxPageCount + 1;
                lastPaged = data.last_page;
            } else {
                firstPaged = Math.max(areaListPage - middlePage + 1, 1);
                lastPaged = Math.min(firstPaged + maxPageCount - 1, data.last_page);
            }


            if (firstPaged > 1) {
                data.pagination.show_first = true;
            }
            if (lastPaged < data.last_page) {
                data.pagination.show_last = true;
            }

            for (var i = firstPaged; i <= lastPaged; i++) {
                data.pagination.pages.push(i);
            }
        }

        kv.View.render('area-pages-list-areas', data, $target.find('.area-page-item-list'), function() {
            bindAreaPagesList();
        });
    }

    function bindAreaPagesList() {
        $target.find('[name*="activate-area"]').change(function(e) {
            var $this = $(this);
            var area = $this.data('area');
            var action = $this.is(':checked') ? 'enable' : 'disable';
            var isEnable = $this.is(':checked') ? true : false;
            var isLocal = !!area.remote_id;
            var method = 'PUT';

            var postData = {
                is_active: isEnable,
            };

            if (isLocal) {
                postData.id = area.id;
            } else {
                postData.remote_id = area.id;
                postData.name = area.name;
                method = 'POST';
            }

            $.ajax({
                contentType: 'application/json',
                url: kvcoreidxAdminConfig.restNamespace + 'area-pages',
                beforeSend: function(jqXHR) {
                    jqXHR.setRequestHeader('X-WP-Nonce', kvcoreidxAdminConfig.nonce);
                },
                method: method,
                data: JSON.stringify(postData),
                success: function(response) {
                    getAreasList(displayAreasList);
                },
            });
        });

        $target.find('.area-name-link, .area-edit-link, .kv-admin-button-edit').click(function(e) {
            e.preventDefault();

            var $self = $(this);
            var id = $self.data('id');

            switchToModulesTab(id);
        });

        $target.find("#area-pages-search").keyup(function(e) {
            areaListPage = 1;

            if (searchTimeout) {
                window.clearTimeout(searchTimeout);
            }

            searchTimeout = window.setTimeout(function() {
                getAreasList(displayAreasList);
            }, 500);
        });

        $target.find("#area-pages-list-set-rows").change(function(e) {
            areaListPage = 1;

            displayAreasList();
        });

        $target.find('.area-page-pagination-button').click(function(e){
            e.preventDefault();

            areaListPage = parseInt($(this).data('page'));

            displayAreasList();
        });
    }

    function switchToModulesTab(id) {
        kv.View.render('area-pages-modules', { name: '', }, $target, function() {
            getAreaData(id, function(data) {
                kv.View.render('area-pages-modules', data, $target, function() {});
            });
        });
    }

    function getAreaData(id, callback) {
        $.ajax({
            url: kvcoreidxAdminConfig.restNamespace + 'area-page/' + id,
            beforeSend: function(jqXHR) {
                jqXHR.setRequestHeader('X-WP-Nonce', kvcoreidxAdminConfig.nonce);
            },
            success: function(data) {
                if (typeof callback === 'function') {
                    callback(data);
                }

                displayModulesList(data);
            }
        });
    }

    function displayModulesList(data) {
        data.modules_list = getModulesList(data);
        data.module_count = modulesList.length;

        kv.View.render(
            'area-pages-modules-list',
            data,
            $target.find('.area-page-item-list'),
            bindAreaModulesList
        );
    }

    function getModulesList(data) {
        var result = [];

        modulesList.forEach(function(item) {
            result.push(getModulesListItem(item, data));
        });
        return result;
    }

    function getModulesListItem(item, data) {
        var result = {};

        Object.assign(result, item, { data: {} });

        data.modules.forEach(function(module) {
            if (module.name === item.name) {
                Object.assign(result.data, module);

                return result;
            }
        })

        return result;
    }

    function bindAreaModulesList(viewName, data) {
        var $checkboxes = $target.find('[name*="activate-module"]');

        $target.find('.back-to-area-pages').click(function (e) {
            e.preventDefault();

            switchToAreasListTab();
        });

        $checkboxes.change(function(e) {
            var $this = $(this);
            var moduleName = $this.val();
            var setIsActive = $this.is(':checked');

            var moduleData = {
                id: data.id,
            };
            moduleData[moduleName] = {};

            moduleData[moduleName].is_active = setIsActive;

            moduleData[moduleName] = JSON.stringify(moduleData[moduleName]);

            $.ajax({
                contentType: 'application/json',
                url: kvcoreidxAdminConfig.restNamespace + 'area-pages',
                beforeSend: function(jqXHR) {
                    jqXHR.setRequestHeader('X-WP-Nonce', kvcoreidxAdminConfig.nonce);
                },
                method: 'PUT',
                data: JSON.stringify(moduleData),
                success: function(response) {},
            });
        });

        $target.find('.kv-area-module-edit').click(function (e) {
            e.preventDefault();

            var $this = $(this);

            data.module = $this.data('module');

            showModuleEdit(data);
        });
    }

    function bindAreaPagesEditModuleHero($modal, originalData) {
        var $nameInput = $modal.find('#edit-module-hero-name');
        var $titleInput = $modal.find('#edit-module-hero-title');
        var $descriptionInput = $modal.find('#edit-module-hero-description');
        var $cancelButton = $modal.find('.kv-area-module-cancel')
        var $submitButton = $modal.find('.kv-area-module-save');

        $cancelButton.on('click', function(e) {
            e.preventDefault();

            $modal.kvModal('hide');
        });

        $submitButton.on('click', function(e) {
            e.preventDefault();

            var data = {};
            var original = originalData.module_data || {};
            var name = $nameInput.val();
            var title = $titleInput.val();
            var description = $descriptionInput.val();

            data.id = originalData.id;

            if (name !== originalData.name) data.name = name;

            if (!original.description || description !== original.description) {
                data.description = description;
            }

            data.hero = JSON.stringify({
                name: 'hero',
                title: title,
                description: description,
                is_active: true,
            });

            $.ajax({
                contentType: 'application/json',
                url: kvcoreidxAdminConfig.restNamespace + 'area-pages',
                beforeSend: function(jqXHR) {
                    jqXHR.setRequestHeader('X-WP-Nonce', kvcoreidxAdminConfig.nonce);
                },
                method: 'PUT',
                data: JSON.stringify(data),
                success: function(response) {
                    $modal.kvModal('hide');
                    switchToModulesTab(originalData.id);
                },
            });
        });
    }

    $(document).ready(switchToAreasListTab);
}(jQuery, kvCORE));