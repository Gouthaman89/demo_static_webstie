(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s({
    "connect": ()=>connect,
    "setHooks": ()=>setHooks,
    "subscribeToUpdate": ()=>subscribeToUpdate
});
function connect(param) {
    let { addMessageListener, sendMessage, onUpdateError = console.error } = param;
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: (param)=>{
            let [chunkPath, callback] = param;
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        var _updateA_modules;
        const deletedModules = new Set((_updateA_modules = updateA.modules) !== null && _updateA_modules !== void 0 ? _updateA_modules : []);
        var _updateB_modules;
        const addedModules = new Set((_updateB_modules = updateB.modules) !== null && _updateB_modules !== void 0 ? _updateB_modules : []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        var _updateA_added, _updateB_added;
        const added = new Set([
            ...(_updateA_added = updateA.added) !== null && _updateA_added !== void 0 ? _updateA_added : [],
            ...(_updateB_added = updateB.added) !== null && _updateB_added !== void 0 ? _updateB_added : []
        ]);
        var _updateA_deleted, _updateB_deleted;
        const deleted = new Set([
            ...(_updateA_deleted = updateA.deleted) !== null && _updateA_deleted !== void 0 ? _updateA_deleted : [],
            ...(_updateB_deleted = updateB.deleted) !== null && _updateB_deleted !== void 0 ? _updateB_deleted : []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        var _updateA_modules1, _updateB_added1;
        const modules = new Set([
            ...(_updateA_modules1 = updateA.modules) !== null && _updateA_modules1 !== void 0 ? _updateA_modules1 : [],
            ...(_updateB_added1 = updateB.added) !== null && _updateB_added1 !== void 0 ? _updateB_added1 : []
        ]);
        var _updateB_deleted1;
        for (const moduleId of (_updateB_deleted1 = updateB.deleted) !== null && _updateB_deleted1 !== void 0 ? _updateB_deleted1 : []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        var _updateB_modules1;
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set((_updateB_modules1 = updateB.modules) !== null && _updateB_modules1 !== void 0 ? _updateB_modules1 : []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error("Invariant: ".concat(message));
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/src/controllers/EmployeeAttendanceController.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
const EmployeeAttendanceController = {
    async getRecords (orgId, year, month) {
        const response = await fetch("".concat(("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"), "/icx_scope3_get_attendance"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                orgId,
                year,
                month
            })
        });
        return await response.json();
    },
    async addRecord (record) {
        const response = await fetch("".concat(("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"), "/icx_scope3_add_attendance"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(record)
        });
        return await response.json();
    },
    async updateRecord (data) {
        const res = await fetch("".concat(("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"), "/icx_scope3_update_attendance"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    async deleteRecord (row) {
        const response = await fetch("".concat(("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"), "/icx_scope3_delete_attendance"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(row)
        });
        return await response.json();
    },
    async syncScope3Commuting (orgId, year, month) {
        const response = await fetch("".concat(("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"), "/icx_scope3_commuting"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                orgId,
                year,
                month
            })
        });
        return await response.json();
    },
    async checkSyncedPdf (orgId, year, month) {
        const response = await fetch("".concat(("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"), "/scope3_commuting_getcurrentpdf"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                orgId,
                year,
                month
            })
        });
        return await response.json();
    },
    async checkSyncedProcessing (orgId, year, month) {
        const response = await fetch("".concat(("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"), "/scope3_commuting_getcurrentprocessing"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                orgId,
                year,
                month
            })
        });
        return await response.json();
    }
};
const __TURBOPACK__default__export__ = EmployeeAttendanceController;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/EditAttendanceModal.module.css [client] (css module)": ((__turbopack_context__) => {

__turbopack_context__.v({
  "button": "EditAttendanceModal-module__EvZBQG__button",
  "closeButton": "EditAttendanceModal-module__EvZBQG__closeButton",
  "errorInput": "EditAttendanceModal-module__EvZBQG__errorInput",
  "errorMessage": "EditAttendanceModal-module__EvZBQG__errorMessage",
  "fadeIn": "EditAttendanceModal-module__EvZBQG__fadeIn",
  "formGroup": "EditAttendanceModal-module__EvZBQG__formGroup",
  "fullscreenImage": "EditAttendanceModal-module__EvZBQG__fullscreenImage",
  "fullscreenImageOverlay": "EditAttendanceModal-module__EvZBQG__fullscreenImageOverlay",
  "input": "EditAttendanceModal-module__EvZBQG__input",
  "label": "EditAttendanceModal-module__EvZBQG__label",
  "mapImageContainer": "EditAttendanceModal-module__EvZBQG__mapImageContainer",
  "mapPreview": "EditAttendanceModal-module__EvZBQG__mapPreview",
  "modalActions": "EditAttendanceModal-module__EvZBQG__modalActions",
  "modalBody": "EditAttendanceModal-module__EvZBQG__modalBody",
  "modalContent": "EditAttendanceModal-module__EvZBQG__modalContent",
  "modalHeader": "EditAttendanceModal-module__EvZBQG__modalHeader",
  "modalOverlay": "EditAttendanceModal-module__EvZBQG__modalOverlay",
  "modalTitle": "EditAttendanceModal-module__EvZBQG__modalTitle",
  "primaryButton": "EditAttendanceModal-module__EvZBQG__primaryButton",
  "row": "EditAttendanceModal-module__EvZBQG__row",
  "secondaryButton": "EditAttendanceModal-module__EvZBQG__secondaryButton",
  "slideIn": "EditAttendanceModal-module__EvZBQG__slideIn",
});
}),
"[project]/src/utils/apiclient.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// src/utils/apiClient.js
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [client] (ecmascript)");
;
const apiClient = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: ("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"),
    headers: {
        'Content-Type': 'application/json'
    }
});
// Add request interceptor for common configurations
apiClient.interceptors.request.use((config)=>{
    const token = localStorage.getItem('token'); // Retrieve token from localStorage
    const personId = localStorage.getItem('personId'); // Retrieve personId from localStorage or fallback
    if (token) {
        config.headers.Authorization = "Bearer ".concat(token); // Add token to Authorization header
    }
    if (personId) {
        config.headers['X-Person-Id'] = personId; // Add personId as a custom header
    }
    return config;
}, (error)=>Promise.reject(error));
// Add response interceptor for error handling
apiClient.interceptors.response.use((response)=>response.data, (error)=>{
    console.error('API Error:', error.response || error.message);
    return Promise.reject(error);
});
const __TURBOPACK__default__export__ = apiClient;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/models/pagemodel.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// src/models/PageModel.js
__turbopack_context__.s({
    "apDeleteAsset": ()=>apDeleteAsset,
    "apDeleteAssetImage": ()=>apDeleteAssetImage,
    "apFetchAssetsByOrg": ()=>apFetchAssetsByOrg,
    "apGetAssetImages": ()=>apGetAssetImages,
    "apGetUnits": ()=>apGetUnits,
    "apPublishAssetData": ()=>apPublishAssetData,
    "apSaveAsset": ()=>apSaveAsset,
    "apUploadAssetImage": ()=>apUploadAssetImage,
    "createData": ()=>createData,
    "deleteData": ()=>deleteData,
    "fetchData": ()=>fetchData,
    "get1Data": ()=>get1Data,
    "postPayload": ()=>postPayload,
    "updateData": ()=>updateData
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/apiclient.js [client] (ecmascript)");
;
const fetchData = async function(endpoint) {
    let params = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].post(endpoint, {
            params
        });
        return response;
    } catch (error) {
        console.error("Error fetching data from ".concat(endpoint, ":"), error);
        throw error;
    }
};
const get1Data = async function(endpoint) {
    let params = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].get(endpoint, {
            params
        });
        return response;
    } catch (error) {
        console.error("Error fetching data from ".concat(endpoint, ":"), error);
        throw error;
    }
};
const createData = async (endpoint, payload)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].post(endpoint, payload);
        return response.data;
    } catch (error) {
        console.error("Error creating data at ".concat(endpoint, ":"), error);
        throw error;
    }
};
const updateData = async (endpoint, id, payload)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].put("".concat(endpoint), payload);
        return response.data;
    } catch (error) {
        console.error("Error updating data at ".concat(endpoint, "/").concat(id, ":"), error);
        throw error;
    }
};
const deleteData = async (endpoint, id)=>{
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].delete("".concat(endpoint, "/").concat(id));
    } catch (error) {
        console.error("Error deleting data from ".concat(endpoint, "/").concat(id, ":"), error);
        throw error;
    }
};
const postPayload = async (endpoint, payload)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].post(endpoint, payload, {
            responseType: 'blob'
        });
        return response;
    } catch (error) {
        console.error("Error posting payload to ".concat(endpoint, ":"), error);
        throw error;
    }
};
const apGetUnits = async ()=>{
    return await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].get('/capcity_f300045e30_unit');
};
const apFetchAssetsByOrg = async (orgId)=>{
    return await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].post('/getassetlistbyorg', {
        orgId
    });
};
const apGetAssetImages = async (assetId)=>{
    return await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].get('/getAssetImages', {
        params: {
            assetId
        }
    });
};
const apUploadAssetImage = async (file, assetId, personID)=>{
    const formData = new FormData();
    formData.append('image', file, file.name); // or 'file' if your API expects that
    formData.append('assetId', assetId);
    if (personID) formData.append('personID', personID);
    return await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].post('/uploadAssetImages', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};
const apDeleteAssetImage = async (imageUrl, assetId)=>{
    return await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].delete('/deleteAssetImage', {
        data: {
            imageUrl,
            assetId
        }
    });
};
const apDeleteAsset = async (id)=>{
    return await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].delete('/deleteAsset', {
        data: {
            id
        }
    });
};
const apSaveAsset = async (payload, isEditing)=>{
    if (isEditing) {
        return await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].put('/updateAsset', payload);
    }
    return await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].post('/addAsset', payload);
};
const apPublishAssetData = async (orgId, assets)=>{
    return await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$apiclient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].post('/publishAssetData', {
        orgId,
        assets
    });
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/controllers/PageControllers.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// src/controllers/PageController.js
__turbopack_context__.s({
    "deleteRecord": ()=>deleteRecord,
    "getData": ()=>getData,
    "loadData": ()=>loadData,
    "postData": ()=>postData,
    "saveData": ()=>saveData,
    "updateRecord": ()=>updateRecord
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$pagemodel$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/models/pagemodel.js [client] (ecmascript)");
;
const loadData = async (endpoint, setData)=>{
    try {
        const data = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$pagemodel$2e$js__$5b$client$5d$__$28$ecmascript$29$__["fetchData"](endpoint);
        setData(data);
    } catch (error) {
        console.error('Error loading data:', error);
    }
};
const getData = async (endpoint, setData)=>{
    try {
        const data = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$pagemodel$2e$js__$5b$client$5d$__$28$ecmascript$29$__["get1Data"](endpoint);
        setData(data);
    } catch (error) {
        console.error('Error loading data:', error);
    }
};
const saveData = async (endpoint, data, resetForm, refreshData)=>{
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$pagemodel$2e$js__$5b$client$5d$__$28$ecmascript$29$__["createData"](endpoint, data);
        resetForm();
        refreshData();
    } catch (error) {
        console.error('Error saving data:', error);
    }
};
const updateRecord = async (endpoint, id, data, refreshData)=>{
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$pagemodel$2e$js__$5b$client$5d$__$28$ecmascript$29$__["updateData"](endpoint, id, data);
        refreshData();
    } catch (error) {
        console.error('Error updating record:', error);
    }
};
const deleteRecord = async (endpoint, id, refreshData)=>{
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$pagemodel$2e$js__$5b$client$5d$__$28$ecmascript$29$__["deleteData"](endpoint, id);
        refreshData();
    } catch (error) {
        console.error('Error deleting record:', error);
    }
};
const postData = async (endpoint, payload)=>{
    try {
        const data = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$pagemodel$2e$js__$5b$client$5d$__$28$ecmascript$29$__["postPayload"](endpoint, payload);
        return data;
    } catch (error) {
        console.error("Error posting data to ".concat(endpoint, ":"), error);
        return null;
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/EditAttendanceModal.jsx [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// src/components/EditAttendanceModal.jsx
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/prop-types/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/controllers/EmployeeAttendanceController.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/components/EditAttendanceModal.module.css [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$PageControllers$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/controllers/PageControllers.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
const EditAttendanceModal = (param)=>{
    let { show, record, onClose, refresh } = param;
    var _record_status, _record_status_split_;
    _s();
    const [mapImageBase64, setMapImageBase64] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        codeofemp: '',
        employeename: '',
        dateofcomm: '',
        timeofstart: '',
        timeofend: '',
        dateofstart: '',
        dateofend: '',
        transportation: '',
        startaddress: '',
        destinationaddress: '',
        vendrservicecid: '',
        distance: '',
        linkofmap: ''
    });
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [transportationOptions, setTransportationOptions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const fetchMapImage = async (filename)=>{
        if (!filename) {
            // No map for this record; ensure previous preview is cleared
            setMapImageBase64('');
            return;
        }
        try {
            console.log('Fetching map image for filename:', filename);
            const data = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$PageControllers$2e$js__$5b$client$5d$__$28$ecmascript$29$__["postData"]('/get_image_data', {
                filename
            });
            console.log('get_image_data response:', data);
            const blob = data;
            const reader = new FileReader();
            reader.onloadend = ()=>{
                setMapImageBase64(reader.result || '');
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.error('Failed to load map image:', err);
            // On error, also clear to avoid showing stale image
            setMapImageBase64('');
        }
    };
    // --- field-level error helper ---------------------------------------------
    // MODIFIED: Handles multiple error columns (e.g., "X | column1, column2")
    const errorColumns = (record === null || record === void 0 ? void 0 : (_record_status = record.status) === null || _record_status === void 0 ? void 0 : _record_status.startsWith('X |')) ? (_record_status_split_ = record.status.split('|')[1]) === null || _record_status_split_ === void 0 ? void 0 : _record_status_split_.trim().split(',').map((s)=>s.trim()) : [];
    // Only keep error flags for fields that are STILL empty now
    const activeErrorColumns = Array.isArray(errorColumns) ? errorColumns.filter((f)=>{
        var _ref;
        const v = (_ref = formData && formData[f]) !== null && _ref !== void 0 ? _ref : '';
        return String(v).trim() === '';
    }) : [];
    // --- fetch transportation dropdown ----------------------------------------
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditAttendanceModal.useEffect": ()=>{
            const fetchTransportationOptions = {
                "EditAttendanceModal.useEffect.fetchTransportationOptions": async ()=>{
                    try {
                        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$PageControllers$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getData"]('/transportation_options', {
                            "EditAttendanceModal.useEffect.fetchTransportationOptions": (data)=>{
                                setTransportationOptions(data || []);
                            }
                        }["EditAttendanceModal.useEffect.fetchTransportationOptions"]);
                    } catch (err) {
                        console.error('Failed to fetch transportation options:', err);
                    }
                }
            }["EditAttendanceModal.useEffect.fetchTransportationOptions"];
            fetchTransportationOptions();
        }
    }["EditAttendanceModal.useEffect"], []);
    // --- populate form when record changes ------------------------------------
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditAttendanceModal.useEffect": ()=>{
            if (record) {
                console.log('EditAttendanceModal record:', record);
                setFormData({
                    codeofemp: record.codeofemp || '',
                    employeename: record.employeename || '',
                    dateofcomm: record.dateofcomm ? record.dateofcomm.split('T')[0] : '',
                    timeofstart: record.timeofstart || '',
                    timeofend: record.timeofend || '',
                    dateofstart: record.dateofstart ? record.dateofstart.split('T')[0] : '',
                    dateofend: record.dateofend ? record.dateofend.split('T')[0] : '',
                    transportation: record.transportation || '',
                    startaddress: record.startaddress || '',
                    destinationaddress: record.destinationaddress || '',
                    vendrservicecid: record.objectid || '',
                    distance: record.distance || '',
                    linkofmap: record.linkofmap || ''
                });
                setError('');
            }
            fetchMapImage((record === null || record === void 0 ? void 0 : record.linkofmap) || '');
        }
    }["EditAttendanceModal.useEffect"], [
        record
    ]);
    // --- ESC key closes modal -------------------------------------------------
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditAttendanceModal.useEffect": ()=>{
            const handleEscKey = {
                "EditAttendanceModal.useEffect.handleEscKey": (e)=>{
                    if (e.key === 'Escape') onClose();
                }
            }["EditAttendanceModal.useEffect.handleEscKey"];
            if (show) window.addEventListener('keydown', handleEscKey);
            return ({
                "EditAttendanceModal.useEffect": ()=>window.removeEventListener('keydown', handleEscKey)
            })["EditAttendanceModal.useEffect"];
        }
    }["EditAttendanceModal.useEffect"], [
        show,
        onClose
    ]);
    const handleChange = (e)=>{
        const { name, value } = e.target;
        setFormData((prev)=>{
            const updated = {
                ...prev,
                [name]: value
            };
            if (name === 'transportation') {
                const selected = transportationOptions.find((opt)=>opt.venderservicename === value);
                updated.vendrservicecid = selected ? selected.venderserviceid : '';
            }
            return updated;
        });
    };
    // --- form validation flags ------------------------------------------
    const requiredFields = [
        'codeofemp',
        'employeename',
        'dateofcomm',
        'dateofstart',
        'dateofend',
        'transportation',
        'startaddress',
        'destinationaddress'
    ];
    const missingFields = requiredFields.filter((f)=>!formData[f]);
    const isFormValid = missingFields.length === 0;
    const [showFullImage, setShowFullImage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleSubmit = async (e)=>{
        e.preventDefault();
        setIsLoading(true);
        setError('');
        if (missingFields.length) {
            setError('請填寫所有欄位！');
            setIsLoading(false);
            return;
        }
        try {
            const updated = {
                ...record,
                ...formData
            };
            updated.vendrservicecid = formData.vendrservicecid;
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].updateRecord(updated);
            refresh();
            onClose();
        } catch (err) {
            console.error(err);
            setError('更新失敗，請稍後再試。');
        } finally{
            setIsLoading(false);
        }
    };
    if (!show) return null;
    /* ------------------------------------------------------------------ */ return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalOverlay,
        onClick: onClose,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalContent,
            onClick: (e)=>e.stopPropagation(),
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "modal-title",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalHeader,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            id: "modal-title",
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalTitle,
                            children: "編輯出勤資料"
                        }, void 0, false, {
                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                            lineNumber: 181,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].closeButton,
                            onClick: onClose,
                            "aria-label": "Close",
                            children: "×"
                        }, void 0, false, {
                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                            lineNumber: 184,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                    lineNumber: 180,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSubmit,
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalBody,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].row,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].formGroup,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "codeofemp",
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].label,
                                            children: "員編："
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 192,
                                            columnNumber: 5
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            id: "codeofemp",
                                            name: "codeofemp",
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].input,
                                            value: formData.codeofemp,
                                            readOnly: true
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 193,
                                            columnNumber: 5
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                    lineNumber: 191,
                                    columnNumber: 3
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].formGroup,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "employeename",
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].label,
                                            children: "姓名："
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 203,
                                            columnNumber: 5
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            id: "employeename",
                                            name: "employeename",
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].input,
                                            value: formData.employeename,
                                            readOnly: true
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 204,
                                            columnNumber: 5
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                    lineNumber: 202,
                                    columnNumber: 3
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                            lineNumber: 190,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].row,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].formGroup,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].label,
                                            children: "開始日期："
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 218,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "date",
                                            name: "dateofstart",
                                            className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].input, " ").concat(!formData.dateofstart || activeErrorColumns.includes('dateofstart') ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].errorInput : ''),
                                            value: formData.dateofstart,
                                            onChange: handleChange,
                                            disabled: isLoading
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 219,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                    lineNumber: 217,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].formGroup,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].label,
                                            children: "結束日期："
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 233,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "date",
                                            name: "dateofend",
                                            className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].input, " ").concat(!formData.dateofend || activeErrorColumns.includes('dateofend') ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].errorInput : ''),
                                            value: formData.dateofend,
                                            onChange: handleChange,
                                            disabled: isLoading
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 234,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                    lineNumber: 232,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                            lineNumber: 216,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].row,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].formGroup,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].label,
                                            children: "交通工具："
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 250,
                                            columnNumber: 5
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            name: "transportation",
                                            className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].input, " ").concat(!formData.transportation || activeErrorColumns.includes('transportation') ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].errorInput : ''),
                                            value: formData.transportation,
                                            onChange: handleChange,
                                            disabled: isLoading,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "請選擇"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                                    lineNumber: 262,
                                                    columnNumber: 7
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                transportationOptions.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: opt.venderservicename,
                                                        children: opt.venderservicename
                                                    }, opt.venderserviceid, false, {
                                                        fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                                        lineNumber: 264,
                                                        columnNumber: 9
                                                    }, ("TURBOPACK compile-time value", void 0)))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 251,
                                            columnNumber: 5
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                    lineNumber: 249,
                                    columnNumber: 3
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].formGroup,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].label,
                                            children: "距離："
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 272,
                                            columnNumber: 5
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].input,
                                            value: formData.distance,
                                            readOnly: true
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                            lineNumber: 273,
                                            columnNumber: 5
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                    lineNumber: 271,
                                    columnNumber: 3
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                            lineNumber: 248,
                            columnNumber: 1
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].row,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].formGroup,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].label,
                                        children: "出發地："
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                        lineNumber: 283,
                                        columnNumber: 5
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        name: "startaddress",
                                        className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].input, " ").concat(!formData.startaddress || activeErrorColumns.includes('startaddress') ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].errorInput : ''),
                                        value: formData.startaddress,
                                        onChange: handleChange,
                                        disabled: isLoading
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                        lineNumber: 284,
                                        columnNumber: 5
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                lineNumber: 282,
                                columnNumber: 3
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                            lineNumber: 281,
                            columnNumber: 1
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].row,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].formGroup,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].label,
                                        children: "目的地："
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                        lineNumber: 300,
                                        columnNumber: 5
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        name: "destinationaddress",
                                        className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].input, " ").concat(!formData.destinationaddress || activeErrorColumns.includes('destinationaddress') ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].errorInput : ''),
                                        value: formData.destinationaddress,
                                        onChange: handleChange,
                                        disabled: isLoading
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                        lineNumber: 301,
                                        columnNumber: 5
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                lineNumber: 299,
                                columnNumber: 3
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                            lineNumber: 298,
                            columnNumber: 1
                        }, ("TURBOPACK compile-time value", void 0)),
                        mapImageBase64 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].mapImageContainer,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: mapImageBase64,
                                        alt: "Google Map",
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].mapPreview,
                                        onClick: ()=>setShowFullImage(true)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                        lineNumber: 318,
                                        columnNumber: 7
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                    lineNumber: 317,
                                    columnNumber: 5
                                }, ("TURBOPACK compile-time value", void 0)),
                                showFullImage && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].fullscreenImageOverlay,
                                    onClick: ()=>setShowFullImage(false),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: mapImageBase64,
                                        alt: "Full Map",
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].fullscreenImage
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                        lineNumber: 327,
                                        columnNumber: 9
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                    lineNumber: 326,
                                    columnNumber: 7
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true),
                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].errorMessage,
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                            lineNumber: 333,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalActions,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].button, " ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].secondaryButton),
                                    onClick: onClose,
                                    disabled: isLoading,
                                    children: "取消"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                    lineNumber: 336,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                isFormValid && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].button, " ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].primaryButton),
                                    disabled: isLoading,
                                    children: isLoading ? '儲存中...' : '儲存'
                                }, void 0, false, {
                                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                                    lineNumber: 345,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/EditAttendanceModal.jsx",
                            lineNumber: 335,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/EditAttendanceModal.jsx",
                    lineNumber: 189,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EditAttendanceModal.jsx",
            lineNumber: 173,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/src/components/EditAttendanceModal.jsx",
        lineNumber: 172,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(EditAttendanceModal, "X6zTvsrRh4Rx31tBsLz9jmTH1Vg=");
_c = EditAttendanceModal;
EditAttendanceModal.propTypes = {
    show: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].bool.isRequired,
    record: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].shape({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].string,
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].number
        ]),
        codeofemp: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].string,
        dateofcomm: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].string,
        dateofstart: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].string,
        dateofend: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].string,
        transportation: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].string,
        startaddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].string,
        destinationaddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].string,
        status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].string
    }),
    onClose: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].func.isRequired,
    refresh: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].func.isRequired
};
EditAttendanceModal.defaultProps = {
    record: null
};
const __TURBOPACK__default__export__ = EditAttendanceModal;
var _c;
__turbopack_context__.k.register(_c, "EditAttendanceModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/EmployeeAttendanceTable.jsx [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**********************************************************************
 * EmployeeAttendanceTable.jsx  –  with header-sorting
 *********************************************************************/ __turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fa$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/fa/index.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/controllers/EmployeeAttendanceController.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/EditAttendanceModal.jsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
const EmployeeAttendanceTable = (param)=>{
    let { data = [], refresh } = param;
    _s();
    /* ---------- local state ---------- */ const [deletingRow, setDeletingRow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editingRow, setEditingRow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    /* ---------- pagination ---------- */ const [currentPage, setCurrentPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [pageSize, setPageSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(10);
    const [searchTerm, setSearchTerm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    /* ---------- sorting ---------- */ const [sortKey, setSortKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sortDir, setSortDir] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('asc'); // 'asc' | 'desc' | null
    /* ---------- column definition ---------- */ const columns = [
        {
            key: 'codeofemp',
            label: '員編'
        },
        {
            key: 'employeename',
            label: '姓名'
        },
        {
            key: 'dateofcomm',
            label: '日期'
        },
        {
            key: 'transportation',
            label: '交通方式'
        },
        {
            key: 'startaddress',
            label: '出發地'
        },
        {
            key: 'destinationaddress',
            label: '目的地'
        },
        {
            key: 'dateofstart',
            label: '開始日'
        },
        {
            key: 'dateofend',
            label: '結束日'
        },
        {
            key: 'status',
            label: '狀態'
        },
        {
            key: 'co2e',
            label: 'co2e'
        }
    ];
    /* ---------- filtering ---------- */ const filteredData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EmployeeAttendanceTable.useMemo[filteredData]": ()=>{
            const keywords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
            return data.filter({
                "EmployeeAttendanceTable.useMemo[filteredData]": (row)=>keywords.every({
                        "EmployeeAttendanceTable.useMemo[filteredData]": (kw)=>Object.values(row).some({
                                "EmployeeAttendanceTable.useMemo[filteredData]": (v)=>String(v).toLowerCase().includes(kw)
                            }["EmployeeAttendanceTable.useMemo[filteredData]"])
                    }["EmployeeAttendanceTable.useMemo[filteredData]"])
            }["EmployeeAttendanceTable.useMemo[filteredData]"]);
        }
    }["EmployeeAttendanceTable.useMemo[filteredData]"], [
        data,
        searchTerm
    ]);
    /* ---------- sorting ---------- */ const sortedData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EmployeeAttendanceTable.useMemo[sortedData]": ()=>{
            if (!sortKey) return filteredData;
            return [
                ...filteredData
            ].sort({
                "EmployeeAttendanceTable.useMemo[sortedData]": (a, b)=>{
                    let aVal = a[sortKey];
                    let bVal = b[sortKey];
                    // treat empty as largest
                    if (aVal === null || aVal === undefined || aVal === '') aVal = 'zz';
                    if (bVal === null || bVal === undefined || bVal === '') bVal = 'zz';
                    // dates
                    if (sortKey.includes('date')) {
                        aVal = new Date(aVal);
                        bVal = new Date(bVal);
                    }
                    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
                    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
                    return 0;
                }
            }["EmployeeAttendanceTable.useMemo[sortedData]"]);
        }
    }["EmployeeAttendanceTable.useMemo[sortedData]"], [
        filteredData,
        sortKey,
        sortDir
    ]);
    /* ---------- pagination ---------- */ const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
    const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    /* ---------- handlers ---------- */ const handleSort = (key)=>{
        if (sortKey !== key) {
            setSortKey(key);
            setSortDir('asc');
        } else {
            if (sortDir === 'asc') setSortDir('desc');
            else if (sortDir === 'desc') {
                setSortKey(null);
                setSortDir('asc');
            }
        }
        setCurrentPage(1);
    };
    const handleConfirmDelete = async ()=>{
        if (!deletingRow) return;
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].deleteRecord(deletingRow);
        setDeletingRow(null);
        refresh();
    };
    /* ---------- helpers ---------- */ const getErrorCol = (status)=>{
        var _status_split_;
        return (status === null || status === void 0 ? void 0 : status.startsWith('X |')) ? (_status_split_ = status.split('|')[1]) === null || _status_split_ === void 0 ? void 0 : _status_split_.trim() : null;
    };
    /* ---------- render ---------- */ return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                    flexWrap: 'wrap'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        placeholder: "搜尋...",
                        value: searchTerm,
                        onChange: (e)=>{
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        },
                        style: {
                            padding: '4px 8px',
                            width: 200
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                        lineNumber: 119,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                        value: pageSize,
                        onChange: (e)=>{
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        },
                        style: {
                            padding: '4px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: 10,
                                children: "10"
                            }, void 0, false, {
                                fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                lineNumber: 137,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: 25,
                                children: "25"
                            }, void 0, false, {
                                fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                lineNumber: 138,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: 50,
                                children: "50"
                            }, void 0, false, {
                                fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                lineNumber: 139,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                lineNumber: 109,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    overflowX: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: 4
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    style: {
                        width: '100%',
                        minWidth: 900,
                        borderCollapse: 'collapse'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                style: {
                                    background: '#fafafa'
                                },
                                children: [
                                    columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            onClick: ()=>handleSort(col.key),
                                            style: {
                                                padding: 8,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                userSelect: 'none'
                                            },
                                            children: [
                                                col.label,
                                                sortKey === col.key && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        marginLeft: 4,
                                                        fontSize: 12
                                                    },
                                                    children: sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : ''
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                                    lineNumber: 173,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, col.key, true, {
                                            fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                            lineNumber: 161,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        style: {
                                            position: 'sticky',
                                            right: 0,
                                            background: '#fafafa',
                                            zIndex: 2,
                                            whiteSpace: 'nowrap'
                                        },
                                        children: "操作"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                        lineNumber: 179,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                lineNumber: 159,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                            lineNumber: 158,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            children: paginatedData.map((row)=>{
                                const errorCol = getErrorCol(row.status);
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    children: [
                                        columns.map((col)=>{
                                            let value = row[col.key];
                                            let bg = errorCol === col.key ? '#ffd6d6' : undefined;
                                            if (col.key.includes('date') && value) value = value.split('T')[0];
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: 8,
                                                    backgroundColor: bg
                                                },
                                                children: col.key === 'status' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: (value === null || value === void 0 ? void 0 : value.startsWith('X')) ? 'red' : (value === null || value === void 0 ? void 0 : value.startsWith('V')) ? 'green' : undefined
                                                    },
                                                    children: (value === null || value === void 0 ? void 0 : value.startsWith('X')) ? '✖' : (value === null || value === void 0 ? void 0 : value.startsWith('V')) ? '✔' : value
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                                    lineNumber: 205,
                                                    columnNumber: 27
                                                }, ("TURBOPACK compile-time value", void 0)) : value
                                            }, col.key, false, {
                                                fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                                lineNumber: 203,
                                                columnNumber: 23
                                            }, ("TURBOPACK compile-time value", void 0));
                                        }),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            style: {
                                                position: 'sticky',
                                                right: 0,
                                                background: '#fff',
                                                zIndex: 1,
                                                whiteSpace: 'nowrap'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>setEditingRow(row),
                                                    style: {
                                                        border: 'none',
                                                        background: 'none',
                                                        cursor: 'pointer',
                                                        marginRight: 6
                                                    },
                                                    title: "編輯",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fa$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["FaPencilAlt"], {
                                                        color: "#007bff"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                                        lineNumber: 245,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                                    lineNumber: 235,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>setDeletingRow(row),
                                                    style: {
                                                        border: 'none',
                                                        background: 'none',
                                                        cursor: 'pointer'
                                                    },
                                                    title: "刪除",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fa$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["FaTrashAlt"], {
                                                        color: "#dc3545"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                                        lineNumber: 252,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                                    lineNumber: 247,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                            lineNumber: 226,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, row.uuid, true, {
                                    fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                    lineNumber: 197,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0));
                            })
                        }, void 0, false, {
                            fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                            lineNumber: 193,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                    lineNumber: 151,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                lineNumber: 144,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    marginTop: 12,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 10
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            marginRight: 'auto'
                        },
                        children: [
                            "共 ",
                            sortedData.length,
                            " 筆資料"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                        lineNumber: 272,
                        columnNumber: 3
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setCurrentPage((p)=>Math.max(p - 1, 1)),
                        disabled: currentPage === 1,
                        children: "上一頁"
                    }, void 0, false, {
                        fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                        lineNumber: 275,
                        columnNumber: 3
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            "第 ",
                            currentPage,
                            " / ",
                            totalPages,
                            " 頁"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                        lineNumber: 278,
                        columnNumber: 3
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setCurrentPage((p)=>Math.min(p + 1, totalPages)),
                        disabled: currentPage === totalPages,
                        children: "下一頁"
                    }, void 0, false, {
                        fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                        lineNumber: 281,
                        columnNumber: 3
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                lineNumber: 263,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            deletingRow && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        backgroundColor: '#fff',
                        padding: 20,
                        borderRadius: 6,
                        width: 300,
                        textAlign: 'center'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: "確定要刪除此出勤資料？"
                        }, void 0, false, {
                            fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                            lineNumber: 311,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginTop: 20
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleConfirmDelete,
                                    style: {
                                        marginRight: 10,
                                        color: '#fff',
                                        background: '#dc3545',
                                        border: 'none',
                                        padding: '6px 12px',
                                        cursor: 'pointer'
                                    },
                                    children: "確定刪除"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                    lineNumber: 313,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setDeletingRow(null),
                                    style: {
                                        padding: '6px 12px',
                                        cursor: 'pointer'
                                    },
                                    children: "取消"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                                    lineNumber: 326,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                            lineNumber: 312,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                    lineNumber: 302,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                lineNumber: 291,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                show: !!editingRow,
                record: editingRow,
                onClose: ()=>setEditingRow(null),
                refresh: refresh
            }, void 0, false, {
                fileName: "[project]/src/components/EmployeeAttendanceTable.jsx",
                lineNumber: 338,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true);
};
_s(EmployeeAttendanceTable, "PLOzSU+EVzyfMXGN50QKfXt7EW4=");
_c = EmployeeAttendanceTable;
const __TURBOPACK__default__export__ = EmployeeAttendanceTable;
var _c;
__turbopack_context__.k.register(_c, "EmployeeAttendanceTable");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/GlobalContext.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// GlobalContext.js
__turbopack_context__.s({
    "GlobalProvider": ()=>GlobalProvider,
    "useGlobalContext": ()=>useGlobalContext
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
const GlobalContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["createContext"])();
const GlobalProvider = (param)=>{
    let { children } = param;
    _s();
    const [globalReportId, setGlobalReportId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [globalOrgId, setGlobalOrgId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [globalYear, setGlobalYear] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [globalYearid, setGlobalYearid] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [globalCompanyId, setGlobalCompanyId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [companyList, setCompanyList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [organizationList, setOrganizationList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(GlobalContext.Provider, {
        value: {
            globalReportId,
            setGlobalReportId,
            globalCompanyId,
            setGlobalCompanyId,
            globalOrgId,
            setGlobalOrgId,
            globalYear,
            setGlobalYear,
            globalYearid,
            setGlobalYearid,
            companyList,
            setCompanyList,
            organizationList,
            setOrganizationList
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/GlobalContext.js",
        lineNumber: 15,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(GlobalProvider, "ZlWPCo09m06y0hwzrF2GIAeYlG4=");
_c = GlobalProvider;
const useGlobalContext = ()=>{
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useContext"])(GlobalContext);
};
_s1(useGlobalContext, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "GlobalProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/AuthContext.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "AuthProvider": ()=>AuthProvider,
    "useAuth": ()=>useAuth
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["createContext"])();
const useAuth = ()=>{
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
};
_s(useAuth, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
function AuthProvider(param) {
    let { children } = param;
    _s1();
    const [token, setToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [personId, setPersonId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [profile, setProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [reportId, setReportId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true); // To manage loading state for profile fetching
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            const savedToken = localStorage.getItem('token');
            const savedPersonId = localStorage.getItem('personId');
            const savedReportId = localStorage.getItem('reportId');
            if (savedToken && savedPersonId) {
                setToken(savedToken);
                setPersonId(savedPersonId);
                setReportId(savedReportId);
                // Fetch profile only if it is not already loaded
                if (!profile) {
                    fetchProfile(savedToken, savedPersonId);
                } else {
                    setLoading(false); // Avoid fetching if already available
                }
            } else {
                setLoading(false);
                if (router.pathname !== '/login') {
                    router.push('/login');
                }
            }
        }
    }["AuthProvider.useEffect"], [
        router,
        profile
    ]); // Add `profile` as a dependency
    const fetchProfile = async (token, personId)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].post("".concat(("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"), "/profile"), {
                personid: personId
            }, {
                headers: {
                    Authorization: "Bearer ".concat(token)
                }
            });
            setProfile(response.data[0]);
        } catch (error) {
            console.error('Error fetching profile:', error);
            logout(); // Logout the user if fetching the profile fails (e.g., token is invalid)
        } finally{
            setLoading(false);
        }
    };
    const login = (newToken, newPersonId)=>{
        setToken(newToken);
        setPersonId(newPersonId);
        localStorage.setItem('token', newToken);
        localStorage.setItem('personId', newPersonId);
        fetchProfile(newToken, newPersonId);
        router.push('/profile');
    };
    const setGlobalReportId = (newReportId)=>{
        setReportId(newReportId);
        localStorage.setItem('reportId', newReportId);
    };
    const logout = ()=>{
        setToken(null);
        setPersonId(null);
        setProfile(null);
        setReportId(null);
        localStorage.removeItem('token');
        localStorage.removeItem('personId');
        localStorage.removeItem('reportId');
        router.push('/login');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            token,
            personId,
            profile,
            reportId,
            login,
            logout,
            setGlobalReportId,
            loading
        },
        children: [
            !loading ? children : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/src/components/AuthContext.js",
                lineNumber: 99,
                columnNumber: 30
            }, this),
            " "
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/AuthContext.js",
        lineNumber: 87,
        columnNumber: 5
    }, this);
}
_s1(AuthProvider, "b41U/QVhjLUp3o608XxfzeJNpNA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = AuthProvider;
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/AddAttendanceModal.jsx [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/prop-types/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/controllers/EmployeeAttendanceController.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/components/EditAttendanceModal.module.css [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/GlobalContext.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/AuthContext.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
const AddAttendanceModal = (param)=>{
    let { open, onClose, refresh } = param;
    _s();
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        codeofemp: "",
        dateofcomm: "",
        idofcommutingemp: ""
    });
    const { personId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [employeeOptions, setEmployeeOptions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const { globalOrgId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useGlobalContext"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AddAttendanceModal.useEffect": ()=>{
            const handleEscKey = {
                "AddAttendanceModal.useEffect.handleEscKey": (event)=>{
                    if (event.key === "Escape") {
                        onClose();
                    }
                }
            }["AddAttendanceModal.useEffect.handleEscKey"];
            if (open) {
                window.addEventListener("keydown", handleEscKey);
            }
            return ({
                "AddAttendanceModal.useEffect": ()=>{
                    window.removeEventListener("keydown", handleEscKey);
                }
            })["AddAttendanceModal.useEffect"];
        }
    }["AddAttendanceModal.useEffect"], [
        open,
        onClose
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AddAttendanceModal.useEffect": ()=>{
            if (open) {
                fetch("".concat(("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"), "/icx_dropdown_employee")).then({
                    "AddAttendanceModal.useEffect": (res)=>res.json()
                }["AddAttendanceModal.useEffect"]).then(setEmployeeOptions).catch({
                    "AddAttendanceModal.useEffect": (err)=>console.error("Failed to fetch employee options", err)
                }["AddAttendanceModal.useEffect"]);
            }
        }
    }["AddAttendanceModal.useEffect"], [
        open
    ]);
    const handleChange = (e)=>{
        const { name, value } = e.target;
        setForm((prev)=>({
                ...prev,
                [name]: value
            }));
    };
    const handleCodeChange = (e)=>{
        const value = e.target.value;
        const selected = employeeOptions.find((opt)=>opt.codeofemp === value);
        setForm((prev)=>({
                ...prev,
                codeofemp: value,
                idofcommutingemp: selected ? selected.employeeid : ""
            }));
    };
    const handleSubmit = async (e)=>{
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            const payload = {
                codeofemp: form.codeofemp,
                dateofcomm: form.dateofcomm,
                idoforg: globalOrgId,
                idofperson: personId
            };
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].addRecord(payload);
            refresh();
            onClose();
        } catch (err) {
            console.error("Failed to add record:", err);
            setError("新增失敗，請稍後再試。");
        } finally{
            setIsLoading(false);
        }
    };
    if (!open) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalOverlay,
        onClick: onClose,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalContent,
            onClick: (e)=>e.stopPropagation(),
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "modal-title",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalHeader,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            id: "modal-title",
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalTitle,
                            children: "新增出勤資料"
                        }, void 0, false, {
                            fileName: "[project]/src/components/AddAttendanceModal.jsx",
                            lineNumber: 96,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].closeButton,
                            onClick: onClose,
                            "aria-label": "Close",
                            children: "×"
                        }, void 0, false, {
                            fileName: "[project]/src/components/AddAttendanceModal.jsx",
                            lineNumber: 97,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/AddAttendanceModal.jsx",
                    lineNumber: 95,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSubmit,
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalBody,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].formGroup,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    htmlFor: "codeofemp",
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].label,
                                    children: "員編："
                                }, void 0, false, {
                                    fileName: "[project]/src/components/AddAttendanceModal.jsx",
                                    lineNumber: 102,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    list: "employeeList",
                                    id: "codeofemp",
                                    name: "codeofemp",
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].input,
                                    value: form.codeofemp,
                                    onChange: handleCodeChange,
                                    disabled: isLoading
                                }, void 0, false, {
                                    fileName: "[project]/src/components/AddAttendanceModal.jsx",
                                    lineNumber: 103,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("datalist", {
                                    id: "employeeList",
                                    children: employeeOptions.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: opt.codeofemp
                                        }, opt.codeofemp, false, {
                                            fileName: "[project]/src/components/AddAttendanceModal.jsx",
                                            lineNumber: 114,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/AddAttendanceModal.jsx",
                                    lineNumber: 112,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/AddAttendanceModal.jsx",
                            lineNumber: 101,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].formGroup,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    htmlFor: "dateofcomm",
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].label,
                                    children: "日期："
                                }, void 0, false, {
                                    fileName: "[project]/src/components/AddAttendanceModal.jsx",
                                    lineNumber: 120,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "date",
                                    id: "dateofcomm",
                                    name: "dateofcomm",
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].input,
                                    value: form.dateofcomm,
                                    onChange: handleChange,
                                    disabled: isLoading
                                }, void 0, false, {
                                    fileName: "[project]/src/components/AddAttendanceModal.jsx",
                                    lineNumber: 121,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/AddAttendanceModal.jsx",
                            lineNumber: 119,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].errorMessage,
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/src/components/AddAttendanceModal.jsx",
                            lineNumber: 134,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].modalActions,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].button, " ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].secondaryButton),
                                    onClick: onClose,
                                    disabled: isLoading,
                                    children: "取消"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/AddAttendanceModal.jsx",
                                    lineNumber: 137,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].button, " ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EditAttendanceModal$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].primaryButton),
                                    disabled: isLoading,
                                    children: isLoading ? "新增中..." : "新增"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/AddAttendanceModal.jsx",
                                    lineNumber: 145,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/AddAttendanceModal.jsx",
                            lineNumber: 136,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/AddAttendanceModal.jsx",
                    lineNumber: 100,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/AddAttendanceModal.jsx",
            lineNumber: 87,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/src/components/AddAttendanceModal.jsx",
        lineNumber: 86,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(AddAttendanceModal, "6ZTYrK6W5sEM2gwm7afWQ7PNlME=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useGlobalContext"]
    ];
});
_c = AddAttendanceModal;
AddAttendanceModal.propTypes = {
    open: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].bool.isRequired,
    onClose: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].func.isRequired,
    refresh: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].func.isRequired
};
const __TURBOPACK__default__export__ = AddAttendanceModal;
var _c;
__turbopack_context__.k.register(_c, "AddAttendanceModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/AttendanceCsvUploader.jsx [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/GlobalContext.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/AuthContext.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
const AttendanceCsvUploader = (param)=>{
    let { onSuccess } = param;
    _s();
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])();
    const { personId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const { globalOrgId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useGlobalContext"])();
    const handleUploadClick = ()=>{
        fileInputRef.current.value = null;
        fileInputRef.current.click();
    };
    const handleFileChange = async (e)=>{
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event)=>{
            const csvText = event.target.result;
            const lines = csvText.split("\n").filter(Boolean);
            if (lines.length < 2) return;
            const headers = lines[0].split(",").map((h)=>h.trim());
            const requiredHeaders = [
                "員工編號",
                "出勤日期"
            ];
            const missingHeaders = requiredHeaders.filter((h)=>!headers.includes(h));
            if (missingHeaders.length > 0) {
                alert("❌ 檔案格式錯誤，請確認欄位名稱是否正確：\n" + missingHeaders.join(", "));
                return;
            }
            const rows = lines.slice(1).map((line)=>{
                const values = line.split(",").map((v)=>v.trim());
                const row = {};
                headers.forEach((header, i)=>{
                    switch(header){
                        case "員工編號":
                            row["codeofemp"] = values[i];
                            break;
                        case "出勤日期":
                            row["dateofcomm"] = values[i];
                            break;
                        case "姓名":
                            row["name"] = values[i];
                            break;
                        default:
                            break;
                    }
                });
                // ✅ Add personId and orgId to every record
                row["idofperson"] = personId;
                row["idoforg"] = globalOrgId;
                return row;
            });
            try {
                const res = await fetch("".concat(("TURBOPACK compile-time value", "https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api"), "/icx_scope3_import_attendance_csv"), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        data: rows
                    })
                });
                // Handle non-2xx early with useful diagnostics
                if (!res.ok) {
                    const errText = await res.text().catch(()=>"");
                    console.error("❌ 匯入失敗 (HTTP):", res.status, res.statusText, errText);
                    alert("❌ 匯入失敗：HTTP ".concat(res.status, " ").concat(res.statusText) + (errText ? "\n".concat(errText) : ""));
                    return;
                }
                // Some backends return text, some JSON. Try JSON first; fall back to raw text.
                const rawText = await res.text();
                let result;
                try {
                    result = rawText ? JSON.parse(rawText) : {};
                } catch (_) {
                    // Not valid JSON; keep the raw text for debugging but still treat as success if HTTP 200
                    result = {
                        raw: rawText
                    };
                }
                console.log("✅ 出勤紀錄匯入完成，回應：", result);
                var _result_success;
                const success = (_result_success = result === null || result === void 0 ? void 0 : result.success) !== null && _result_success !== void 0 ? _result_success : true; // assume success on HTTP 200 unless backend says otherwise
                var _result_count, _ref, _ref1, _ref2, _ref3;
                const count = (_ref3 = (_ref2 = (_ref1 = (_ref = (_result_count = result === null || result === void 0 ? void 0 : result.count) !== null && _result_count !== void 0 ? _result_count : result === null || result === void 0 ? void 0 : result.inserted) !== null && _ref !== void 0 ? _ref : result === null || result === void 0 ? void 0 : result.insertedCount) !== null && _ref1 !== void 0 ? _ref1 : result === null || result === void 0 ? void 0 : result.rowCount) !== null && _ref2 !== void 0 ? _ref2 : Array.isArray(result === null || result === void 0 ? void 0 : result.data) ? result.data.length : undefined) !== null && _ref3 !== void 0 ? _ref3 : rows.length; // fallback to attempted rows
                if (success) {
                    alert("✅ 匯入成功，共 ".concat(count, " 筆資料"));
                } else {
                    const msg = (result === null || result === void 0 ? void 0 : result.message) || (result === null || result === void 0 ? void 0 : result.error) || "未知錯誤";
                    alert("❌ 匯入失敗：".concat(msg));
                }
                if (typeof onSuccess === 'function') onSuccess();
            } catch (err) {
                console.error("❌ 出勤紀錄匯入失敗:", err);
                alert("❌ 匯入失敗：請稍後再試或聯繫系統管理員");
            }
        };
        reader.readAsText(file);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: handleUploadClick,
                children: "從 CSV 匯入"
            }, void 0, false, {
                fileName: "[project]/src/components/AttendanceCsvUploader.jsx",
                lineNumber: 104,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "file",
                accept: ".csv",
                ref: fileInputRef,
                style: {
                    display: "none"
                },
                onChange: handleFileChange
            }, void 0, false, {
                fileName: "[project]/src/components/AttendanceCsvUploader.jsx",
                lineNumber: 105,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true);
};
_s(AttendanceCsvUploader, "psULJbV8O2TV4OBttpWHf2ZIYbc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useGlobalContext"]
    ];
});
_c = AttendanceCsvUploader;
const __TURBOPACK__default__export__ = AttendanceCsvUploader;
var _c;
__turbopack_context__.k.register(_c, "AttendanceCsvUploader");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/DeleteAttendanceModal.jsx [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-toastify/dist/index.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$PageControllers$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/controllers/PageControllers.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Dialog$2f$Dialog$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Dialog$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Dialog/Dialog.js [client] (ecmascript) <export default as Dialog>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogTitle$2f$DialogTitle$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogTitle$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/DialogTitle/DialogTitle.js [client] (ecmascript) <export default as DialogTitle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogContent$2f$DialogContent$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogContent$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/DialogContent/DialogContent.js [client] (ecmascript) <export default as DialogContent>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogActions$2f$DialogActions$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogActions$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/DialogActions/DialogActions.js [client] (ecmascript) <export default as DialogActions>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TextField/TextField.js [client] (ecmascript) <export default as TextField>");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
const DeleteAttendanceModal = (param)=>{
    let { open, onClose, onSuccess, year, month } = param;
    _s();
    const [isSubmitting, setIsSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleDelete = async ()=>{
        if (!year || !month) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["toast"].warning('⚠️ 請選擇年份與月份');
            return;
        }
        setIsSubmitting(true);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$PageControllers$2e$js__$5b$client$5d$__$28$ecmascript$29$__["updateRecord"])('/delete_employe_attendance', null, {
                year,
                month
            });
            onClose();
            if (typeof onSuccess === 'function') {
                onSuccess();
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["toast"].success('✅ 刪除成功');
            }
        } catch (err) {
            console.error('❌ 刪除時發生錯誤:', err);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["toast"].error('❌ 刪除失敗，請稍後再試');
        } finally{
            setIsSubmitting(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Dialog$2f$Dialog$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Dialog$3e$__["Dialog"], {
        open: open,
        onClose: onClose,
        maxWidth: "xs",
        fullWidth: true,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogTitle$2f$DialogTitle$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogTitle$3e$__["DialogTitle"], {
                children: "選擇年份與月份"
            }, void 0, false, {
                fileName: "[project]/src/components/DeleteAttendanceModal.jsx",
                lineNumber: 42,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogContent$2f$DialogContent$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogContent$3e$__["DialogContent"], {
                sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    px: 4,
                    py: 3
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                        label: "年份",
                        value: year,
                        fullWidth: true,
                        InputProps: {
                            readOnly: true
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/DeleteAttendanceModal.jsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                        label: "月份",
                        value: month,
                        fullWidth: true,
                        InputProps: {
                            readOnly: true
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/DeleteAttendanceModal.jsx",
                        lineNumber: 50,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/DeleteAttendanceModal.jsx",
                lineNumber: 43,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogActions$2f$DialogActions$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogActions$3e$__["DialogActions"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                        onClick: onClose,
                        disabled: isSubmitting,
                        children: "取消"
                    }, void 0, false, {
                        fileName: "[project]/src/components/DeleteAttendanceModal.jsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                        onClick: handleDelete,
                        disabled: isSubmitting,
                        color: "error",
                        children: "確認刪除"
                    }, void 0, false, {
                        fileName: "[project]/src/components/DeleteAttendanceModal.jsx",
                        lineNumber: 59,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/DeleteAttendanceModal.jsx",
                lineNumber: 57,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/DeleteAttendanceModal.jsx",
        lineNumber: 41,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(DeleteAttendanceModal, "oafqrj090+oRf5bsyDQJHsshgoc=");
_c = DeleteAttendanceModal;
const __TURBOPACK__default__export__ = DeleteAttendanceModal;
var _c;
__turbopack_context__.k.register(_c, "DeleteAttendanceModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/Loader/loader.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
;
;
;
const Loader = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        class: "socket",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel center-gel",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 8,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 9,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 10,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 7,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c1 r1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 13,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 14,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 15,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 12,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c2 r1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 18,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 19,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 20,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 17,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c3 r1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 23,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 24,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 25,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 22,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c4 r1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 28,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 29,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 30,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 27,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c5 r1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 33,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 34,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 35,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 32,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c6 r1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 38,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 39,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 40,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 37,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c7 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 44,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 45,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 46,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 43,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c8 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 50,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 51,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 52,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 49,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c9 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 55,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 56,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 57,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 54,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c10 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 60,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 61,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 62,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 59,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c11 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 65,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 66,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 67,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 64,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c12 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 70,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 71,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 72,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 69,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c13 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 75,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 76,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 77,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 74,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c14 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 80,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 81,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 82,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 79,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c15 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 85,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 86,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 87,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 84,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c16 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 90,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 91,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 92,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 89,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c17 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 95,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 96,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 97,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 94,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c18 r2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 100,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 101,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 102,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 99,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c19 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 105,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 106,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 107,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 104,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c20 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 110,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 111,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 112,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 109,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c21 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 115,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 116,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 117,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 114,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c22 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 120,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 121,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 122,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 119,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c23 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 125,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 126,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 127,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 124,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c24 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 130,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 131,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 132,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 129,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c25 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 135,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 136,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 137,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 134,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c26 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 140,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 141,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 142,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 139,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c28 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 145,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 146,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 147,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 144,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c29 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 150,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 151,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 152,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 149,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c30 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 155,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 156,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 157,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 154,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c31 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 160,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 161,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 162,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 159,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c32 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 165,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 166,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 167,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 164,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c33 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 170,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 171,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 172,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 169,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c34 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 175,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 176,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 177,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 174,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c35 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 180,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 181,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 182,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 179,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c36 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 185,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 186,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 187,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 184,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                class: "gel c37 r3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h1"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 190,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h2"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 191,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        class: "hex-brick h3"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Loader/loader.js",
                        lineNumber: 192,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Loader/loader.js",
                lineNumber: 189,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Loader/loader.js",
        lineNumber: 6,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Loader;
const __TURBOPACK__default__export__ = Loader;
var _c;
__turbopack_context__.k.register(_c, "Loader");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/pages/EmployeeAttendancePage.jsx [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Box/Box.js [client] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Container$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Container/Container.js [client] (ecmascript) <export default as Container>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/Paper.js [client] (ecmascript) <export default as Paper>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/Typography.js [client] (ecmascript) <export default as Typography>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Alert$2f$Alert$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Alert$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Alert/Alert.js [client] (ecmascript) <export default as Alert>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TextField/TextField.js [client] (ecmascript) <export default as TextField>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/MenuItem/MenuItem.js [client] (ecmascript) <export default as MenuItem>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Refresh$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/esm/Refresh.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/controllers/EmployeeAttendanceController.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EmployeeAttendanceTable$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/EmployeeAttendanceTable.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AddAttendanceModal$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/AddAttendanceModal.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AttendanceCsvUploader$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/AttendanceCsvUploader.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$DeleteAttendanceModal$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/DeleteAttendanceModal.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Loader$2f$loader$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Loader/loader.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/GlobalContext.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/react-i18next/dist/es/index.js [client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-i18next/dist/es/useTranslation.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Sync$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/esm/Sync.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$CircularProgress$2f$CircularProgress$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircularProgress$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/CircularProgress/CircularProgress.js [client] (ecmascript) <export default as CircularProgress>");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const EmployeeAttendancePage = ()=>{
    _s();
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [showModal, setShowModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showDeleteModal, setShowDeleteModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const { globalOrgId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useGlobalContext"])();
    const { t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useTranslation"])();
    const [year, setYear] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(new Date().getFullYear());
    const [month, setMonth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(new Date().getMonth() + 1);
    const years = Array.from({
        length: 6
    }, (_, i)=>new Date().getFullYear() - i);
    const months = Array.from({
        length: 12
    }, (_, i)=>i + 1);
    const disableSync = data.length === 0 && data.some((d)=>{
        var _d_status;
        return (_d_status = d.status) === null || _d_status === void 0 ? void 0 : _d_status.startsWith('X');
    });
    const [hasSyncedPdf, setHasSyncedPdf] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [hasSyncedProcessing, setHasSyncedProcessing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const checkSyncedProcessing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "EmployeeAttendancePage.useCallback[checkSyncedProcessing]": async ()=>{
            try {
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].checkSyncedProcessing(globalOrgId, year, month);
                setHasSyncedProcessing(Array.isArray(res) && res.length > 0);
                console.log('Sync processing status:', res);
            } catch (error) {
                console.error('Failed to check existing Sync:', error);
            }
        }
    }["EmployeeAttendancePage.useCallback[checkSyncedProcessing]"], [
        globalOrgId,
        year,
        month
    ]);
    const loadRecords = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "EmployeeAttendancePage.useCallback[loadRecords]": async function(orgId) {
            let yearParam = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : year, monthParam = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : month;
            if (!orgId) return;
            setLoading(true);
            setError(null);
            try {
                const result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].getRecords(orgId, yearParam, monthParam);
                setData(result);
            } catch (err) {
                console.error(err);
            } finally{
                setLoading(false);
            }
        }
    }["EmployeeAttendancePage.useCallback[loadRecords]"], [
        year,
        month
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EmployeeAttendancePage.useEffect": ()=>{
            loadRecords(globalOrgId, year, month);
        }
    }["EmployeeAttendancePage.useEffect"], [
        globalOrgId,
        year,
        month,
        loadRecords
    ]);
    const showSync = data.length > 0 && // table is not empty
    !data.some((d)=>{
        var _d_status;
        return (_d_status = d.status) === null || _d_status === void 0 ? void 0 : _d_status.startsWith('X');
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EmployeeAttendancePage.useEffect": ()=>{
            const checkSyncedPdf = {
                "EmployeeAttendancePage.useEffect.checkSyncedPdf": async ()=>{
                    try {
                        const res = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].checkSyncedPdf(globalOrgId, year, month);
                        setHasSyncedPdf(Array.isArray(res) && res.length > 0);
                    } catch (error) {
                        console.error('Failed to check existing PDF:', error);
                    }
                }
            }["EmployeeAttendancePage.useEffect.checkSyncedPdf"];
            checkSyncedPdf();
        }
    }["EmployeeAttendancePage.useEffect"], [
        globalOrgId,
        year,
        month
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EmployeeAttendancePage.useEffect": ()=>{
            checkSyncedProcessing();
        }
    }["EmployeeAttendancePage.useEffect"], [
        checkSyncedProcessing
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Container$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__["Container"], {
        maxWidth: "xl",
        sx: {
            py: 3
        },
        children: [
            loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Loader$2f$loader$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                lineNumber: 80,
                columnNumber: 19
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
                sx: {
                    p: 3
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                        sx: {
                            display: 'flex',
                            flexDirection: {
                                xs: 'column',
                                sm: 'row'
                            },
                            justifyContent: 'space-between',
                            alignItems: {
                                xs: 'flex-start',
                                sm: 'center'
                            },
                            mb: 2,
                            pb: 1,
                            borderBottom: 1,
                            borderColor: 'divider'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                variant: "h5",
                                fontWeight: "bold",
                                children: "員工出勤資訊"
                            }, void 0, false, {
                                fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                lineNumber: 95,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                                sx: {
                                    display: 'flex',
                                    gap: 1,
                                    mt: {
                                        xs: 2,
                                        sm: 0
                                    },
                                    flexWrap: 'wrap'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                        select: true,
                                        size: "small",
                                        label: "年份",
                                        value: year,
                                        onChange: (e)=>setYear(e.target.value),
                                        sx: {
                                            minWidth: 100
                                        },
                                        children: years.map((y)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                                                value: y,
                                                children: y
                                            }, y, false, {
                                                fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                                lineNumber: 108,
                                                columnNumber: 7
                                            }, ("TURBOPACK compile-time value", void 0)))
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                        lineNumber: 99,
                                        columnNumber: 3
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                        select: true,
                                        size: "small",
                                        label: "月份",
                                        value: month,
                                        onChange: (e)=>setMonth(e.target.value),
                                        sx: {
                                            minWidth: 90
                                        },
                                        children: months.map((m)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                                                value: m,
                                                children: m
                                            }, m, false, {
                                                fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                                lineNumber: 123,
                                                columnNumber: 7
                                            }, ("TURBOPACK compile-time value", void 0)))
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                        lineNumber: 114,
                                        columnNumber: 3
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        variant: "outlined",
                                        startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Refresh$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                            fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                            lineNumber: 133,
                                            columnNumber: 16
                                        }, void 0),
                                        onClick: async ()=>{
                                            await loadRecords(globalOrgId, year, month);
                                            await checkSyncedProcessing();
                                        },
                                        children: "重新整理"
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                        lineNumber: 131,
                                        columnNumber: 3
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        variant: "outlined",
                                        onClick: ()=>window.location.href = '/attendance_template.csv',
                                        children: t('Download Sample')
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                        lineNumber: 142,
                                        columnNumber: 3
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AttendanceCsvUploader$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                        onSuccess: ()=>loadRecords(globalOrgId)
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                        lineNumber: 149,
                                        columnNumber: 3
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        variant: "outlined",
                                        color: "error",
                                        onClick: ()=>setShowDeleteModal(true),
                                        children: "刪除出勤資料"
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                        lineNumber: 151,
                                        columnNumber: 3
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        variant: "outlined",
                                        color: "primary",
                                        startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Sync$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                            fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                            lineNumber: 162,
                                            columnNumber: 14
                                        }, void 0),
                                        disabled: !showSync || hasSyncedProcessing,
                                        onClick: async ()=>{
                                            if (hasSyncedProcessing) return;
                                            try {
                                                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$EmployeeAttendanceController$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].syncScope3Commuting(globalOrgId, year, month);
                                                console.log('Synchronization completed');
                                                loadRecords(globalOrgId, year, month);
                                                await checkSyncedProcessing();
                                            } catch (error) {
                                                console.error('Synchronization failed:', error);
                                            }
                                        },
                                        children: hasSyncedProcessing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$CircularProgress$2f$CircularProgress$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircularProgress$3e$__["CircularProgress"], {
                                                    size: 18,
                                                    sx: {
                                                        mr: 1
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                                    lineNumber: 178,
                                                    columnNumber: 7
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                "處理中..."
                                            ]
                                        }, void 0, true) : '產生碳排活動數據'
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                        lineNumber: 159,
                                        columnNumber: 1
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    hasSyncedPdf && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                        variant: "body2",
                                        color: "text.secondary",
                                        sx: {
                                            mt: 1
                                        },
                                        children: "已產生報告，無需再次同步。"
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                        lineNumber: 186,
                                        columnNumber: 7
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                                lineNumber: 98,
                                columnNumber: 1
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                        lineNumber: 83,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Alert$2f$Alert$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Alert$3e$__["Alert"], {
                        severity: "error",
                        sx: {
                            mb: 2
                        },
                        children: error
                    }, void 0, false, {
                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                        lineNumber: 195,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EmployeeAttendanceTable$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        data: data,
                        refresh: ()=>loadRecords(globalOrgId, year, month)
                    }, void 0, false, {
                        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                        lineNumber: 200,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                lineNumber: 82,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AddAttendanceModal$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                open: showModal,
                onClose: ()=>setShowModal(false),
                refresh: ()=>loadRecords(globalOrgId)
            }, void 0, false, {
                fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                lineNumber: 203,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$DeleteAttendanceModal$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                open: showDeleteModal,
                onClose: ()=>setShowDeleteModal(false),
                onSuccess: ()=>loadRecords(globalOrgId),
                year: year,
                month: month
            }, void 0, false, {
                fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
                lineNumber: 208,
                columnNumber: 2
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/EmployeeAttendancePage.jsx",
        lineNumber: 79,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(EmployeeAttendancePage, "X0JXsOCuzx8rlVYMywPJs/j25uU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useGlobalContext"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useTranslation"]
    ];
});
_c = EmployeeAttendancePage;
const __TURBOPACK__default__export__ = EmployeeAttendancePage;
var _c;
__turbopack_context__.k.register(_c, "EmployeeAttendancePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/EmployeeAttendancePage.jsx [client] (ecmascript)\" } [client] (ecmascript)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const PAGE_PATH = "/EmployeeAttendancePage";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/src/pages/EmployeeAttendancePage.jsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/src/pages/EmployeeAttendancePage\" }": ((__turbopack_context__) => {
"use strict";

var { m: module } = __turbopack_context__;
{
__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/EmployeeAttendancePage.jsx [client] (ecmascript)\" } [client] (ecmascript)");
}}),
}]);

//# sourceMappingURL=%5Broot-of-the-server%5D__194b0ded._.js.map