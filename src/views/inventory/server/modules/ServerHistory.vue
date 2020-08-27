<template>
    <div>
        <p-panel-top title="History" :total-count="totalCount" />
        <p-search-table :fields="fields"
                        :items="items"
                        :loading="loading"
                        :total-count="totalCount"
                        :selectable="false"
                        @init="onChange"
                        @change="onChange"
                        @export="onExport"
        >
            <template #col-labels-format="{value}">
                <p-text-list :items="value" delimiter=" ">
                    <p-badge v-slot:default="{value: d}">
                        {{ d }}
                    </p-badge>
                </p-text-list>
            </template>
        </p-search-table>
    </div>
</template>

<script lang="ts">
import PSearchTable from '@/components/organisms/tables/search-table/PSearchTable.vue';
import { reactive, toRefs, watch } from '@vue/composition-api';
import { Options, SearchTableListeners } from '@/components/organisms/tables/search-table/type';
import { QueryHelper, SpaceConnector } from '@/lib/space-connector';
import { getPageStart } from '@/lib/component-utils/pagination';
import PTextList from '@/components/molecules/lists/text-list/PTextList.vue';
import PBadge from '@/components/atoms/badges/PBadge.vue';
import PPanelTop from '@/components/molecules/panel/panel-top/PPanelTop.vue';
import config from '@/lib/config';
import { getTimezone } from '@/lib/util';

export default {
    name: 'ServerHistory',
    components: {
        PPanelTop, PBadge, PTextList, PSearchTable,
    },
    props: {
        serverId: {
            type: String,
            default: '',
            required: true,
        },
    },
    setup(props) {
        const state = reactive({
            fields: [
                { label: 'Key', name: 'key' },
                { label: 'Job ID', name: 'job_id' },
                { label: 'Updated By', name: 'updated_by' },
                { label: 'Updated', name: 'updated_at' },
            ],
            items: [],
            loading: true,
            totalCount: 0,
            options: {} as Options,
        });

        const getParams = () => ({
            // eslint-disable-next-line camelcase
            server_id: props.serverId,
            // eslint-disable-next-line camelcase
            key_path: 'collection_info.change_history',
            query: new QueryHelper()
                .setSort(state.options.sortBy, state.options.sortDesc)
                .setPage(
                    getPageStart(state.options.thisPage, state.options.pageSize),
                    state.options.pageSize,
                )
                .setKeyword(state.options.searchText)
                .data,
        });


        const api = SpaceConnector.client.inventory.server.getData;
        const listHistory = async () => {
            state.loading = true;

            try {
                const res = await api(getParams());

                state.items = res.results;
                state.totalCount = res.total_count;
            } catch (e) {
                console.error(e);
            } finally {
                state.loading = false;
            }
        };

        const onChange: SearchTableListeners['change'] = async (options) => {
            state.options = options;
            await listHistory();
        };

        const exportApi = SpaceConnector.client.addOns.excel.export;
        const onExport = async () => {
            try {
                const res = await exportApi({
                    source: {
                        url: '/inventory/server/get-data',
                        param: getParams(),
                    },
                    template: {
                        options: {
                            fileType: 'xlsx',
                            timezone: getTimezone(),
                        },
                        // eslint-disable-next-line camelcase
                        data_source: [
                            { name: 'Key', key: 'key' },
                            { name: 'Job ID', key: 'job_id' },
                            { name: 'Updated By', key: 'updated_by' },
                            {
                                name: 'Updated',
                                key: 'updated_at',
                                type: 'datetime',
                                options: {
                                    // eslint-disable-next-line camelcase
                                    source_type: 'timestamp',
                                    // eslint-disable-next-line camelcase
                                    source_format: 'seconds',
                                },
                            },
                        ],
                    },
                });
                window.open(config.get('VUE_APP_API.ENDPOINT') + res.file_link);
            } catch (e) {
                console.error(e);
            }
        };

        watch(() => props.serverId, (after, before) => {
            if (after !== before) listHistory();
        });

        return {
            ...toRefs(state),
            onChange,
            onExport,
        };
    },
};
</script>

<style lang="postcss" scoped>
>>> .p-search-table {
    border-width: 0;
}
</style>