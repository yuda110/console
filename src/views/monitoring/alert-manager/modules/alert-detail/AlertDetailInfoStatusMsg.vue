<template>
    <p v-if="!isEditMode" class="content-wrapper">
        <span class="description">{{ alertData.status_message }}</span>
        <button class="edit-btn" @click="startEdit(EDIT_MODE.STATUS_MSG)">
            <p-i name="ic_edit" width="1rem" height="1rem"
                 color="inherit" class="edit-icon"
            />
            {{ $t('IDENTITY.USER.NOTIFICATION.EDIT') }}
        </button>
    </p>
    <div v-else class="content-wrapper">
        <p-textarea v-model="dataForUpdate" />
        <div class="button-group">
            <p-button :outline="true" class="text-button"
                      size="sm" @click="cancelEdit(EDIT_MODE.STATUS_MSG)"
            >
                {{ $t('COMMON.TAGS.CANCEL') }}
            </p-button>
            <p-button
                style-type="primary"
                size="sm"
                class="text-button"
                @click="onClickSave(EDIT_MODE.STATUS_MSG)"
            >
                {{ $t('COMMON.TAGS.SAVE') }}
            </p-button>
        </div>
    </div>
</template>

<script lang="ts">
import { PTextarea, PButton, PI } from '@spaceone/design-system';
import { reactive, toRefs } from '@vue/composition-api';
import { useAlertDetailItem } from '@/views/monitoring/alert-manager/modules/alert-detail/hooks';
import { EDIT_MODE } from '@/views/monitoring/alert-manager/lib/config';

export default {
    name: 'AlertDetailInfoStatusMsg',
    components: {
        PTextarea,
        PButton,
        PI,
    },
    props: {
        id: {
            type: String,
            default: undefined,
        },
        alertData: {
            type: Object,
            default: () => ({}),
        },
    },
    setup(props, { emit }) {
        const {
            state: alertDetailItemState,
            cancelEdit,
            startEdit,
            updateAlert,
            onClickSave,
        } = useAlertDetailItem({
            alertId: props.id,
            isEditMode: false,
            // eslint-disable-next-line camelcase
            dataForUpdate: props.alertData?.status_message,
        });

        return {
            EDIT_MODE,
            ...toRefs(alertDetailItemState),
            cancelEdit,
            startEdit,
            updateAlert,
            onClickSave,
        };
    },
};
</script>

<style lang="postcss" scoped>
@import './styles/alertDetailItem.pcss';
</style>
