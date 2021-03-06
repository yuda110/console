<template>
    <div>
        <p-panel-top :title="$t('PROJECT.DETAIL.MAINTENANCE_WINDOW.TITLE')" use-total-count :total-count="totalCount" />

        <p-toolbox-table :loading="loading" :fields="fields" :items="items"
                         searchable selectable sortable
                         search-type="query"
                         :select-index.sync="selectIndex"
                         :query-tags="queryTags"
                         :key-item-sets="keyItemSets"
                         :value-handler-map="valueHandlerMap"
                         :total-count="totalCount"
                         :sort-desc="true"
                         sort-by="state"
                         @change="onChange"
                         @refresh="onChange()"
        >
            <template #toolbox-left>
                <p-button style-type="primary-dark" class="mr-4" :outline="true"
                          :disabled="selectedItems.length !== 1 || selectedItemState === STATE.CLOSED"
                          @click="visibleUpdateModal = true"
                >
                    {{ $t('PROJECT.DETAIL.MAINTENANCE_WINDOW.UPDATE') }}
                </p-button>
                <p-button style-type="primary-dark" :outline="true"
                          :disabled="selectedItems.length !== 1 || selectedItemState === STATE.CLOSED" @click="visibleCloseCheckModal = true"
                >
                    {{ $t('PROJECT.DETAIL.MAINTENANCE_WINDOW.CLOSE') }}
                </p-button>
            </template>
            <template #col-state-format="{value}">
                <p-badge :style-type="STATE[value] === STATE.OPEN ? 'yellow200' : 'gray200'">
                    {{ STATE[value] }}
                </p-badge>
            </template>
            <template #col-start_time-format="{value}">
                {{ iso8601Formatter(value, timezone) }}
            </template>
            <template #col-end_time-format="{value}">
                {{ iso8601Formatter(value, timezone) }}
            </template>
            <template #col-created_at-format="{value}">
                {{ iso8601Formatter(value, timezone) }}
            </template>
        </p-toolbox-table>

        <maintenance-window-form-modal :visible.sync="visibleUpdateModal" edit-mode
                                       :maintenance-window-id="selectedItems[0] && selectedItems[0].maintenance_window_id"
                                       @confirm="getMaintenanceWindows"
        />

        <p-table-check-modal :visible.sync="visibleCloseCheckModal"
                             :header-title="$t('PROJECT.DETAIL.MAINTENANCE_WINDOW.CHECK_MODAL.TITLE_CLOSE')"
                             :sub-title="$t('PROJECT.DETAIL.MAINTENANCE_WINDOW.CHECK_MODAL.DESC_CLOSE')"
                             :fields="fields"
                             :items="selectedItems"
                             :loading="closeLoading"
                             theme-color="alert"
                             size="md"
                             :selectable="false"
                             @confirm="closeMaintenanceWindow"
        />
    </div>
</template>

<script lang="ts">
import {
    ComponentRenderProxy,
    computed, getCurrentInstance, reactive, toRefs, watch,
} from '@vue/composition-api';

import {
    PBadge, PButton,
    PPanelTop, PTableCheckModal, PToolboxTable,
} from '@spaceone/design-system';
import { KeyItemSet } from '@spaceone/design-system/dist/src/inputs/search/query-search/type';

import { SpaceConnector } from '@/core-lib/space-connector';
import { ApiQueryHelper } from '@/core-lib/space-connector/helper';
import { iso8601Formatter } from '@/core-lib/util';
import { showErrorMessage, showSuccessMessage } from '@/core-lib/helper/notice-alert-helper';
import { getApiQueryWithToolboxOptions } from '@/core-lib/component-util/toolbox';
import { makeDistinctValueHandlerMap } from '@/core-lib/component-util/query-search';
import { QueryHelper } from '@/core-lib/query';

import { i18n } from '@/translations';
import { store } from '@/store';

import MaintenanceWindowFormModal from '@/views/project/project/modules/MaintenanceWindowFormModal.vue';
import { replaceUrlQuery } from '@/lib/router-query-string';


const STATE = Object.freeze({
    NONE: 'None',
    OPEN: 'Open',
    CLOSED: 'Closed',
} as const);
type STATE = typeof STATE[keyof typeof STATE]

const keyItemSets: KeyItemSet[] = [
    {
        title: 'Properties',
        items: [
            { name: 'title', label: 'Title' },
            { name: 'state', label: 'State' },
            { name: 'start_time', label: 'Start Time', dataType: 'datetime' },
            { name: 'end_time', label: 'End Time', dataType: 'datetime' },
            { name: 'created_by', label: 'Created By' },
            { name: 'created_at', label: 'Created', dataType: 'datetime' },
        ],
    },
];
const valueHandlerMap = makeDistinctValueHandlerMap(keyItemSets, 'monitoring.MaintenanceWindow');

const fields = [
    { name: 'title', label: 'Title', width: '437px' },
    { name: 'state', label: 'State' },
    { name: 'start_time', label: 'Start Time' },
    { name: 'end_time', label: 'End Time' },
    { name: 'created_by', label: 'Created By' },
    { name: 'created_at', label: 'Created' },
];

export default {
    name: 'ProjectMaintenanceWindowPage',
    components: {
        PPanelTop,
        PToolboxTable,
        PTableCheckModal,
        PBadge,
        PButton,
        MaintenanceWindowFormModal,
    },
    props: {
        id: {
            type: String,
            default: undefined,
        },
    },
    setup(props, { root }) {
        const vm = getCurrentInstance() as ComponentRenderProxy;

        const maintenanceWindowApiQueryHelper = new ApiQueryHelper()
            .setOnly(...fields.map(d => d.name), 'maintenance_window_id')
            .setPageStart(1).setPageLimit(15)
            .setSort('state', true)
            .setKeyItemSets(keyItemSets)
            .setFiltersAsRawQueryString(vm.$route.query.filters);
        let maintenanceWindowQuery = maintenanceWindowApiQueryHelper.data;

        const state = reactive({
            totalCount: 0,
            loading: true,
            items: [] as any[],
            timezone: computed(() => store.state.user.timezone),
            selectIndex: [] as number[],
            selectedItems: computed<any[]>(() => state.selectIndex.map(d => state.items[d])),
            selectedItemState: computed(() => STATE[state.selectedItems[0]?.state]),
            queryTags: maintenanceWindowApiQueryHelper.queryTags,
            visibleUpdateModal: false,
            visibleCloseCheckModal: false,
            closeLoading: false,
        });


        const getMaintenanceWindows = async () => {
            state.loading = true;
            try {
                const { total_count, results } = await SpaceConnector.client.monitoring.maintenanceWindow.list({
                    query: maintenanceWindowQuery,
                });

                state.totalCount = total_count;
                state.items = results;
            } catch (e) {
                state.totalCount = 0;
                state.items = [];
                console.error(e);
            } finally {
                state.loading = false;
            }
        };

        const onChange = async (options: any = {}) => {
            maintenanceWindowQuery = getApiQueryWithToolboxOptions(maintenanceWindowApiQueryHelper, options) ?? maintenanceWindowQuery;
            if (options.queryTags) {
                replaceUrlQuery('filters', maintenanceWindowApiQueryHelper.rawQueryStrings);
            }
            await getMaintenanceWindows();
        };

        const closeMaintenanceWindow = async () => {
            state.closeLoading = true;
            try {
                await SpaceConnector.client.monitoring.maintenanceWindow.close({
                    maintenance_window_id: state.selectedItems[0]?.maintenance_window_id,
                });
                state.visibleCloseCheckModal = false;

                showSuccessMessage(i18n.t('PROJECT.DETAIL.MAINTENANCE_WINDOW.ALT_S_CLOSE_MAINTENANCE_WINDOW'), '', root);
                getMaintenanceWindows();
            } catch (e) {
                showErrorMessage(i18n.t('PROJECT.DETAIL.MAINTENANCE_WINDOW.ALT_E_CLOSE_MAINTENANCE_WINDOW'), e, root);
                console.error(e);
            } finally {
                state.closeLoading = false;
            }
        };


        const urlQueryHandler = new QueryHelper();
        watch(() => vm.$route.query, async (query) => {
            urlQueryHandler.setFiltersAsRawQueryString(query.filters);
            if (urlQueryHandler.rawQueryString !== maintenanceWindowApiQueryHelper.rawQueryString) {
                maintenanceWindowQuery = maintenanceWindowApiQueryHelper.setFilters(urlQueryHandler.filters).data;
                state.queryTags = maintenanceWindowApiQueryHelper.queryTags;
                await getMaintenanceWindows();
            }
        });

        /* Init */
        (async () => {
            await getMaintenanceWindows();
        })();

        return {
            ...toRefs(state),
            closeMaintenanceWindow,
            onChange,
            iso8601Formatter,
            getMaintenanceWindows,
            STATE,
            fields,
            keyItemSets,
            valueHandlerMap,
        };
    },
};
</script>

<style lang="postcss" scoped>
.p-toolbox-table::v-deep {
    @apply border-0 h-full;
}
</style>
