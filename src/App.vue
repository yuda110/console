<template>
    <div v-cloak id="app">
        <!--        <button style="position: fixed; z-index: 9999999; left: 20px; top: 20px;" class="bg-coral font-bold px-4 py-2 rounded" @click="flush">-->
        <!--            flush session-->
        <!--        </button>-->
        <template v-if="$store.state.display.isInitialized">
            <p-notice-alert group="noticeTopLeft" position="top left" />
            <p-notice-alert group="noticeTopRight" position="top right" />
            <p-notice-alert group="noticeBottomLeft" position="bottom left" />
            <p-notice-alert group="noticeBottomRight" position="bottom right" />
            <p-toast-alert group="toastTopCenter" position="top center" />
            <top-notification v-if="!$store.getters['user/hasPermission']">
                <i18n path="APP.TOP_NOTI.HAS_NO_ROLE">
                    <template #needRole>
                        <strong>{{ $t('APP.TOP_NOTI.NEED_ROLE') }}</strong>
                    </template>
                </i18n>
            </top-notification>
            <template v-if="showGNB">
                <GNB class="gnb" />
                <div class="app-body">
                    <p-sidebar :visible="$store.state.display.visibleSidebar"
                               :style-type="$store.state.display.sidebarType"
                               @close="$store.dispatch('display/hideSidebar')"
                    >
                        <main class="main">
                            <portal-target name="top-notification" />
                            <router-view />
                        </main>
                        <template #title>
                            <portal-target v-if="$store.state.display.sidebarType === SIDEBAR_TYPE.info" name="info-title" />
                            <portal-target v-else name="handbook-title" />
                        </template>
                        <template #sidebar>
                            <portal-target v-if="$store.state.display.sidebarType === SIDEBAR_TYPE.info" name="info-contents" />
                            <portal-target v-else name="handbook-contents" />
                        </template>
                    </p-sidebar>
                </div>
            </template>
            <router-view v-else />
            <p-icon-modal :visible="isExpired"
                          emoji
                          :header-title="$t('COMMON.SESSION_MODAL.SESSION_EXPIRED')"
                          :button-text="$t('COMMON.SESSION_MODAL.SIGNIN')"
                          button-type="primary-dark"
                          :outline="false"
                          @clickButton="goToSignIn"
            />
        </template>

        <!-- Iframe for file download -->
        <iframe class="hidden"
                :src="$store.state.file.downloadSource" width="1" height="1"
        />
    </div>
</template>

<script lang="ts">
import {
    ComponentRenderProxy, computed,
    defineComponent, getCurrentInstance, reactive, toRefs, watch,
} from '@vue/composition-api';

import {
    PNoticeAlert, PToastAlert, PIconModal, PSidebar, PLottie,
} from '@spaceone/design-system';

import GNB from '@/common/modules/gnb/GNB.vue';
import { Location } from 'vue-router';
import router from '@/routes';
import TopNotification from '@/common/components/TopNotification.vue';
import { SIDEBAR_TYPE } from '@/store/modules/display/config';
import { hideLoadingMessage, showSuccessMessage } from '@/core-lib/helper/notice-alert-helper';
import { IDENTITY_ROUTE } from '@/routes/identity/identity-route';

export default defineComponent({
    name: 'App',
    components: {
        TopNotification,
        GNB: GNB as any,
        PNoticeAlert,
        PToastAlert,
        PIconModal: PIconModal as any,
        PSidebar,
        PLottie,
    },
    setup() {
        const vm = getCurrentInstance() as ComponentRenderProxy;

        const state = reactive({
            showGNB: computed(() => vm.$route.matched[0]?.name === 'root'),
            isExpired: computed(() => vm.$store.state.user.isSessionExpired === true && !vm.$route.meta.excludeAuth),
        });

        const goToSignIn = async () => {
            const res: Location = {
                name: 'SignOut',
            };
            await router.push(res);
        };

        watch([() => vm.$store.getters['user/hasPermission'], () => vm.$route], async ([hasPermission, route]) => {
            if (!route.meta.excludeAuth && !hasPermission && vm.$route.name !== IDENTITY_ROUTE.USER.ACCOUNT._NAME) {
                await router.replace({ name: IDENTITY_ROUTE.USER.ACCOUNT._NAME });
            }
        }, { immediate: true });

        watch(() => vm.$store.state.display.isDownloaded, async (after) => {
            if (after) {
                hideLoadingMessage(vm.$root);
                setTimeout(() => {
                    showSuccessMessage(vm.$t('COMMON.EXCEL.ALT_S_DOWNLOAD_SUCCESS'), '', vm.$root);
                }, 500);
            }
        });

        return {
            ...toRefs(state),
            goToSignIn,
            SIDEBAR_TYPE,
            // flush() {
            //     SpaceConnector.flushToken();
            //     vm.$store.dispatch('user/setIsSessionExpired', true);
            // },
        };
    },
});

</script>

<style lang="postcss">
#app {
    @apply bg-white;
    display: flex;
    flex-direction: column;
    overflow-y: hidden;
    width: 100vw;
    height: 100vh;

    .gnb {
        position: fixed;
        width: 100%;
        height: $gnb-height;
        z-index: 100;
        flex-shrink: 0;
        top: 0;
    }
    .app-body {
        display: flex;
        flex-wrap: wrap;
        flex-direction: column;
        overflow-y: hidden;
        width: 100%;
        height: calc(100vh - $(gnb-height));
        margin-top: $gnb-height;
        flex-grow: 1;
        .p-sidebar .non-sidebar-wrapper {
            min-height: 100%;
        }
        .main {
            display: flex;
            flex-direction: column;
            height: 100%;
            margin: 0;
            overflow-x: hidden;
            overflow-y: auto;
        }
    }
}
</style>
