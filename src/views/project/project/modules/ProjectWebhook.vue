<template>
    <div class="project-webhook">
        <p-toolbox-table
            search-type="query"
            selectable
            sortable
            exportable
            :multi-select="false"
            :loading="loading"
            :total-count="totalCount"
            :items="items"
            :fields="fields"
            :select-index.sync="selectIndex"
            :query-tags="tags"
            :key-item-sets="handlers.keyItemSets"
            :value-handler-map="handlers.valueHandlerMap"
            :timezone="timezone"
            @change="onChange"
            @refresh="onChange()"
            @export="onExport"
        >
            <template #toolbox-top>
                <p-panel-top
                    use-total-count
                    :total-count="totalCount"
                    :title="$t('PROJECT.DETAIL.SUBTAB_WEBHOOK')"
                />
            </template>
            <template #toolbox-left>
                <p-icon-text-button
                    class="mr-4 add-btn"
                    style-type="primary-dark"
                    name="ic_plus_bold"
                    @click="onClickAdd"
                >
                    {{ $t('PROJECT.DETAIL.ADD') }}
                </p-icon-text-button>
                <p-select-dropdown :items="dropdown" @select="onSelectDropdown">
                    {{ $t('PROJECT.DETAIL.WEBHOOK_ACTION') }}
                </p-select-dropdown>
            </template>
            <template #col-plugin_info.plugin_id-format="{index, field, item}">
                <p-lazy-img :src="item.plugin_icon"
                            error-icon="ic_webhook"
                            width="1.5rem" height="1.5rem" class="mr-2"
                />
                {{ item.plugin_name }}
            </template>
            <template #col-state-format="{ value }">
                <p-status
                    class="capitalize"
                    v-bind="userStateFormatter(value)"
                />
            </template>
            <template #col-webhook_url-format="{ value }">
                <p-copy-button>{{ value }}</p-copy-button>
            </template>
        </p-toolbox-table>

        <webhook-add-form-modal
            :visible.sync="addModalVisible"
            :project-id="projectId"
            @confirm="listWebhooks()"
        />
        <webhook-update-form-modal
            v-if="updateModalVisible"
            :visible.sync="updateModalVisible"
            :webhook-info="selectedItems[0]"
            @confirm="listWebhooks()"
        />
        <delete-modal
            :header-title="$t('PROJECT.DETAIL.MODAL_DELETE_WEBHOOK_TITLE')"
            :confirm-text="$t('PROJECT.DETAIL.MODAL_DELETE_WEBHOOK')"
            :visible.sync="deleteModalVisible"
            :disabled="!isNameValid"
            @confirm="onDeleteConfirm"
        >
            <template #default>
                <p class="desc">
                    <strong>{{ $t('PROJECT.DETAIL.MODAL_DELETE_WEBHOOK_CONTENT_1') }}</strong>
                    <span> {{ $t('PROJECT.DETAIL.MODAL_DELETE_WEBHOOK_CONTENT_2') }}</span>
                </p>
                <i18n path="PROJECT.DETAIL.MODAL_DELETE_WEBHOOK_CONTENT_3">
                    <template #webhookName>
                        <strong>{{ selectedItems[0].name }}</strong>
                    </template>
                </i18n>
                <p-text-input v-model="inputWebhookName" />
            </template>
        </delete-modal>
    </div>
</template>

<script lang="ts">
/* eslint-disable camelcase */
import {
    reactive, toRefs, ComponentRenderProxy, computed, getCurrentInstance,
} from '@vue/composition-api';

import {
    PToolboxTable,
    PPanelTop,
    PIconTextButton,
    PStatus,
    PLazyImg,
    PTextInput,
    PCopyButton,
    PSelectDropdown,
} from '@spaceone/design-system';
import WebhookAddFormModal from '@/views/project/project/modules/WebhookAddFormModal.vue';
import WebhookUpdateFormModal from '@/views/project/project/modules/WebhookUpdateFormModal.vue';
import DeleteModal from '@/common/modules/delete-modal/DeleteModal.vue';

import { MenuItem } from '@spaceone/design-system/dist/src/inputs/context-menu/type';
import { SpaceConnector } from '@/core-lib/space-connector';
import { ApiQueryHelper } from '@/core-lib/space-connector/helper';

import { store } from '@/store';
import { userStateFormatter } from '@/views/identity/user/lib/helper';
import { replaceUrlQuery } from '@/lib/router-query-string';
import { iso8601Formatter } from '@/core-lib/util';
import { showErrorMessage, showSuccessMessage, showLoadingMessage } from '@/core-lib/helper/notice-alert-helper';
import {
    makeDistinctValueHandler, makeEnumValueHandler,
} from '@/core-lib/component-util/query-search';
import { FILE_NAME_PREFIX } from '@/lib/excel-export';
import { WEBHOOK_STATE } from '@/views/monitoring/alert-manager/lib/config';
import { i18n } from '@/translations';
import { getApiQueryWithToolboxOptions } from '@/core-lib/component-util/toolbox';
import { KeyItemSet } from '@spaceone/design-system/dist/src/inputs/search/query-search/type';

export default {
    name: 'ProjectWebhook',
    components: {
        WebhookAddFormModal,
        WebhookUpdateFormModal,
        DeleteModal,
        PToolboxTable,
        PPanelTop,
        PIconTextButton,
        PSelectDropdown,
        PStatus,
        PLazyImg,
        PTextInput,
        PCopyButton,
    },
    props: {
        projectId: {
            type: String,
            default: undefined,
        },
    },
    setup(props, { root }) {
        const vm = getCurrentInstance() as ComponentRenderProxy;
        const handlers = {
            keyItemSets: [{
                title: 'Properties',
                items: [
                    { name: 'name', label: 'Name' },
                    { name: 'state', label: 'State' },
                    { name: 'plugin_info.plugin_id', label: 'Plugin' },
                    { name: 'plugin_info.version', label: 'Version' },
                    { name: 'webhook_url', label: 'Webhook URL' },
                    { name: 'created_at', label: 'Created', dataType: 'datetime' },
                ],
            }]as KeyItemSet[],
            valueHandlerMap: {
                name: makeDistinctValueHandler('monitoring.Webhook', 'name'),
                state: makeEnumValueHandler(WEBHOOK_STATE),
                'plugin_info.plugin_id': makeDistinctValueHandler('monitoring.Webhook', 'plugin_info.plugin_id'),
                webhook_url: makeDistinctValueHandler('monitoring.Webhook', 'webhook_url'),
                created_at: makeDistinctValueHandler('monitoring.Webhook', 'created_at'),
            },
        };
        const webhookListApiQueryHelper = new ApiQueryHelper()
            .setPageStart(1).setPageLimit(15)
            .setSort('created_at', true)
            .setFiltersAsRawQueryString(vm.$route.query.filters);
        const state = reactive({
            loading: true,
            timezone: computed(() => store.state.user.timezone),
            plugins: computed(() => store.state.resource.plugin.items),
            dropdown: computed(() => ([
                {
                    type: 'item',
                    name: 'update',
                    label: i18n.t('PROJECT.DETAIL.WEBHOOK_UPDATE'),
                    disabled: state.selectedItems.length !== 1,
                },
                {
                    type: 'item',
                    name: 'delete',
                    label: i18n.t('PROJECT.DETAIL.WEBHOOK_DELETE'),
                    disabled: state.selectedItems.length !== 1,
                },
            ] as MenuItem[])),
            fields: [
                { name: 'name', label: 'Name' },
                { name: 'state', label: 'State' },
                { name: 'plugin_info.plugin_id', label: 'Type' },
                { name: 'plugin_info.version', label: 'Version' },
                { name: 'webhook_url', label: 'Webhook URL' },
                { name: 'created_at', label: 'Created' },
            ],
            items: [],
            selectIndex: [],
            selectedItems: computed(() => state.selectIndex.map(i => state.items[i])),
            totalCount: 0,
            tags: webhookListApiQueryHelper.setKeyItemSets(handlers.keyItemSets).queryTags,
            inputWebhookName: '',
            isNameValid: computed(() => {
                const selectedWebhook = state.selectedItems[0];
                if (!selectedWebhook) return false;
                if (state.inputWebhookName === selectedWebhook.name) return true;
                return false;
            }),
        });
        const formState = reactive({
            addModalVisible: false,
            updateModalVisible: false,
            deleteModalVisible: false,
            visibleCustomFieldModal: false,
        });

        /* api */
        let webhookListApiQuery = webhookListApiQueryHelper.data;
        const listWebhooks = async () => {
            state.loading = true;
            try {
                const { results, total_count } = await SpaceConnector.client.monitoring.webhook.list({
                    project_id: props.projectId,
                    query: webhookListApiQuery,
                });
                state.items = results.map(d => ({
                    ...d,
                    plugin_name: state.plugins[d.plugin_info.plugin_id]?.label,
                    plugin_icon: state.plugins[d.plugin_info.plugin_id]?.icon,
                    created_at: iso8601Formatter(d.created_at, state.timezone),
                }));
                state.totalCount = total_count;
                state.selectIndex = [];
            } catch (e) {
                state.items = [];
                state.totalCount = 0;
                console.error(e);
            } finally {
                state.loading = false;
            }
        };

        /* event */
        const onClickAdd = () => {
            formState.addModalVisible = true;
        };
        const onClickUpdate = () => {
            formState.updateModalVisible = true;
        };
        const onClickDelete = () => {
            state.inputWebhookName = '';
            formState.deleteModalVisible = true;
        };
        const onSelectDropdown = (name) => {
            switch (name) {
            case 'update': onClickUpdate(); break;
            case 'delete': onClickDelete(); break;
            default: break;
            }
        };
        const onDeleteConfirm = async () => {
            try {
                await SpaceConnector.client.monitoring.webhook.delete({
                    webhook_id: state.selectedItems[0].webhook_id,
                });
                showSuccessMessage(i18n.t('PROJECT.DETAIL.ALT_S_DELETE_WEBHOOK'), '', root);
                await listWebhooks();
            } catch (e) {
                console.error(e);
                showErrorMessage(i18n.t('PROJECT.DETAIL.ALT_E_DELETE_WEBHOOK'), e, root);
            } finally {
                formState.deleteModalVisible = false;
            }
        };
        const onExport = async () => {
            try {
                showLoadingMessage(i18n.t('COMMON.EXCEL.ALT_L_READY_FOR_FILE_DOWNLOAD'), '', root);
                await store.dispatch('file/downloadExcel', {
                    url: '/monitoring/webhook/list',
                    param: { query: webhookListApiQuery },
                    fields: [
                        { name: 'Name', key: 'name' },
                        { name: 'State', key: 'state' },
                        { name: 'Plugin', key: 'plugin_info.plugin_id' },
                        { name: 'WebhookURL', key: 'webhook_url' },
                        { name: 'Created', key: 'created_at', type: 'datetime' },
                    ],
                    file_name_prefix: FILE_NAME_PREFIX.projectWebhook,
                });
            } catch (e) {
                console.error(e);
            }
        };
        const onChange = async (options: any = {}) => {
            webhookListApiQuery = getApiQueryWithToolboxOptions(webhookListApiQueryHelper, options) ?? webhookListApiQuery;
            if (options.queryTags !== undefined) {
                await replaceUrlQuery('filters', webhookListApiQueryHelper.rawQueryStrings);
            }
            await listWebhooks();
        };

        /* init */
        (async () => {
            await store.dispatch('resource/plugin/load');
            await listWebhooks();
        })();

        return {
            ...toRefs(state),
            ...toRefs(formState),
            handlers,
            userStateFormatter,
            listWebhooks,
            onClickAdd,
            onSelectDropdown,
            onDeleteConfirm,
            onExport,
            onChange,
        };
    },
};
</script>

<style lang="postcss" scoped>
.project-webhook {
    .p-pane-layout {
        border-width: 0;
    }
    .p-toolbox-table::v-deep {
        .p-toolbox {
            padding-top: 0;
        }
    }
    .p-button-modal::v-deep {
        .delete-modal-content {
            @apply text-gray-900;
            margin-bottom: 1rem;
            .desc {
                margin: 2rem 0;
            }
            .p-text-input {
                @apply w-full;
                margin-top: 1rem;
            }
        }
    }
}
</style>
