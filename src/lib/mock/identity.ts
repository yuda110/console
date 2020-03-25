/* eslint-disable camelcase */
import { makeArrayResults, MockData } from '@/lib/mock/toolset';
import {arrayOf} from "@/lib/casual";
import casual from "@/lib/mock/casual";

export const DOMAIN_INFO = {
    domain_id: 'domain_test_id',
};

export const USER_INFO = {
    user_id: 'user_test_id',
    user_name: 'testUser',
    language: 'en',
    timezone: 'UTC',
};

export default [
    new MockData('/identity/domain/list', () => (makeArrayResults([DOMAIN_INFO]))),
    new MockData('/identity/service-account/list', () => makeArrayResults(arrayOf(15, casual._serviceAccount), 20)),

    new MockData('/identity/user/get', () => USER_INFO),
    new MockData('/identity/domain-owner/get', () => USER_INFO),
    new MockData('/identity/token/issue', () => ({
        access_token: 'asdf.asdf.asdf',
        refresh_token: 'asdf.asdf.asdf',
    })),
];
