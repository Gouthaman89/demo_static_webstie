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
"[project]/src/locales/en/common.json (json)": ((__turbopack_context__) => {

__turbopack_context__.v(JSON.parse("{\"section1\":\" Business Basic Information\",\"section2\":\"Boundary Settings\",\"section3\":\"Emission Source Identification\",\"section4\":\"Activity Data\",\"section5\":\"Quantitative Inventory\",\"section6\":\"Data Quality Management\",\"section7\":\"Uncertainty Quantification Assessment\",\"section8\":\"Summary of Greenhouse Gas Emissions\",\"download_excel\":\"Download Excel\",\"home\":\"Home\",\"profile\":\"Profile\",\"carbon_report\":\"Carbon Report\",\"dashboard\":\"Dashboard\",\"about\":\"About\",\"reportPreview\":\"Report Preview\",\"search\":\"Search\",\"printDate\":\"Print Date\",\"formatTemplate\":\"Format Template\",\"year\":\"Year\",\"requestor\":\"Requestor\",\"organization\":\"Organization\",\"orgName\":\"Organization Name\",\"creationDate\":\"Creation Date\",\"reportName\":\"Report Name\",\"categoryOfAsset\":\"Category of Asset\",\"process\":\"Process\",\"object\":\"Object\",\"gas\":\"Greenhouse Gas #\",\"factorProvider\":\"Factor Provider\",\"version\":\"Version\",\"rate\":\"Rate\",\"action\":\"Action\",\"select\":\"Select\",\"displayChart\":\"Display Chart\",\"addNew\":\"Add New\",\"deleteSelected\":\"Delete Selected\",\"delete\":\"Delete\",\"refresh\":\"Refresh\",\"excelTemplate\":\"Excel Template\",\"exportToExcel\":\"Export to Excel\",\"importFromExcel\":\"Import from Excel\",\"addFactor\":\"Add Factor\",\"carbonInformation\":\"Carbon-Information\",\"objectCode\":\"Object Code\",\"objectName\":\"Object Name\",\"carbonManufacture\":\"Carbon of Manufacture\",\"co2Emission\":\"CO2\",\"requestDate\":\"Request Date\",\"carbonUse\":\"Carbon of Use\",\"additive\":\"Additive\",\"co2eEmission\":\"CO2e Emission\",\"gasCombination\":\"Gas of Combination\",\"greenGas\":\"Gas of Green\",\"factor\":\"Emission Factor / Carbon Emission Factor (4)\",\"organizationrch\":\"Organization\",\"gwpVersion\":\"GWP Version\",\"submit\":\"Submit\",\"totalRecords\":\"Total Records: {{count}} items\",\"changefactor\":\"Change Factor\",\"sum\":\"Sum\",\"rateSumCR\":\"Rate * (Sum * CR)\",\"Co2e-Rate\":\"CO2e Rate\",\"Co2e\":\"CO2e\",\"chooseFactorProvider\":\"Choose Factor Provider\",\"cancel\":\"Cancel\",\"factorDescription\":\"Description of Factor\",\"personManagement\":\"Person Management\",\"downloadExcelSample\":\"Download Excel Sample\",\"uploadExcel\":\"Upload Excel\",\"addNewPerson\":\"+ Add New Person\",\"name\":\"Name\",\"telephone\":\"Telephone\",\"email\":\"Email\",\"employeeID\":\"Employee ID\",\"dateOfStart\":\"Date of Start\",\"status\":\"Status\",\"roleName\":\"Role Name\",\"selectOrganization\":\"Select Organization\",\"noOrganizationsAvailable\":\"No organizations available.\",\"close\":\"Close\",\"asset_upload_page\":\"Asset Upload Page\",\"function\":\"Function\",\"person_mapping\":\"Person Mapping\",\"account_settings\":\"Account Settings\",\"person\":\"Person\",\"scope-3\":\"Scope 3\",\"company_management\":\"Company Management\",\"role_maping\":\"Role Mapping\",\"organization_Edit\":\"Organization Edit\",\"organization_orgadmin\":\"Organization Org Admin\",\"organization_iadmin\":\"Organization IAdmin\",\"report\":\"Report\",\"fetchingOrganizationData\":\"Fetching organization data...\",\"organizationsData\":\"Organizations Data:\",\"errorFetchingOrganizationData\":\"Error fetching organization data.\",\"fetchingYearData\":\"Fetching year data for orgid: {{orgid}}\",\"yearData\":\"Year Data\",\"yearDataNotArray\":\"Year data is not an array.\",\"selectedOrgID\":\"Selected Org ID:\",\"yearAddedSuccessfully\":\"Year {{year}} added successfully!\",\"fieldChange\":\"Field Change - {{name}}: {{value}}\",\"savingOrganizationDetails\":\"Saving organization details:\",\"organizationDetailsUpdatedSuccessfully\":\"Organization details updated successfully!\",\"errorUpdatingOrganization\":\"Error updating organization:\",\"failedToUpdateOrganizationDetails\":\"Failed to update organization details.\",\"organizationDetails\":\"Organization Details\",\"address\":\"Address\",\"taxCode\":\"Tax Code\",\"country\":\"Country\",\"industry\":\"Industry\",\"employees\":\"Employees\",\"edit\":\"Edit\",\"save\":\"Save\",\"addYear\":\"Add Year\",\"bookkeeperCompanyName\":\"Bookkeeper company name\",\"bookkeeperName\":\"Bookkeeper Name\",\"addNewYear\":\"Add New Year\",\"selectYear\":\"Select Year\",\"n/a\":\"N/A\",\"carbonReportHeader\":\"Plant-wide Statistics Table for Seven Major Greenhouse Gases\",\"carbonEmissionsTable1\":\"Carbon Emissions Table 1\",\"carbonEmissionsTable2\":\"Carbon Emissions Table 2\",\"emissions\":\"Emissions (tons/year) (7)\",\"percentage\":\"Gas Category Percentage (%)\",\"totalEmissions\":\"Total Emissions\",\"notes\":\"Note: According to Article 2, Item 1 of the Greenhouse Gas Emission Inventory Registration Management Regulations, greenhouse gas emissions are expressed in metric tons of carbon dioxide equivalent (Metric Tons CO2e) and rounded to three decimal places.\",\"additionalTablesHeader\":\"Summary Table 3: Statistics on Scope 1 Emissions of Seven Major Greenhouse Gases\",\"errorFetchingTable1Data\":\"Error fetching the data for Table 1:\",\"errorFetchingTable2Data\":\"Error fetching the data for Table 2:\",\"scopeBasedEmissionsHeader\":\"Plant-wide Greenhouse Gas Scope Classification Statistics Table\",\"scopeBasedEmissionsTable\":\"Scope-Based Emissions Table\",\"scope\":\"Scope\",\"scope1\":\"Scope 1\",\"scope2\":\"Scope 2\",\"scope3\":\"Scope 3\",\"fixedEmissions\":\"Fixed Emissions\",\"mobileEmissions\":\"Mobile Emissions\",\"processEmissions\":\"Process Emissions\",\"fugitiveEmissions\":\"Fugitive Emissions\",\"energyIndirectEmissions\":\"Energy Indirect Emissions\",\"otherIndirectEmissions\":\"Other Indirect Emissions\",\"errorFetchingReportData\":\"Error fetching the report data:\",\"greenhouseGasScopeAndUncertaintyAssessment\":\"Greenhouse Gas Scope and Uncertainty Assessment\",\"ratingScores\":\"Rating Scores\",\"level\":\"Level\",\"ratingResults\":\"Rating Results\",\"inventoryLevel\":\"Inventory Level\",\"firstLevel\":\"First Level\",\"secondLevel\":\"Second Level\",\"ratingRange\":\"Rating Range\",\"points\":\" points\",\"count\":\"Count\",\"averageScore\":\"Average Score\",\"uncertaintyEvaluation\":\"Uncertainty Evaluation\",\"totalEmissionsForUncertaintyAssessment\":\"Total Emissions for Uncertainty Assessment\",\"uncertaintyAssessmentResults\":\"Uncertainty Assessment Results\",\"totalUncertainty\":\"Total Uncertainty\",\"lowerBound95CI\":\"95% Confidence Interval Lower Bound\",\"upperBound95CI\":\"95% Confidence Interval Upper Bound\",\"assigningOrgAdmin\":\"Assigning OrgAdmin to row ID: {{selectedRowId}} for Organization ID: {{orgId}}\",\"orgAdminAssignedSuccessfully\":\"Org Admin assigned successfully!\",\"invalidPersonID\":\"Invalid person ID\",\"errorFetchingProfileData\":\"Error fetching profile data:\",\"failedToFetchProfileData\":\"Failed to fetch profile data.\",\"phone\":\"Phone\",\"notAvailable\":\"N/A\",\"personID\":\"Person ID\",\"additionalInformation\":\"Additional Information\",\"additionalInformationDescription\":\"This section can be used to display more information or actions related to the user in the future.\",\"newTableHeader\":\"Summary Table 1: Plant-wide Electricity\",\"newTable\":\"New Table\",\"electricity\":\"Plant-wide Electricity (MWh)\",\"steam\":\"Plant-wide Steam\",\"thermalPower\":\"Plant-wide Thermal Power (MWh)\",\"windPower\":\"Wind Power (MWh)\",\"hydropower\":\"Hydropower (MWh)\",\"geothermal\":\"Geothermal (MWh)\",\"tidal\":\"Tidal Power (MWh)\",\"otherRenewable\":\"Other Renewable Energy (MWh)\",\"nuclear\":\"Nuclear Power Generation (MWh)\",\"other\":\"Other Power Generation (MWh)\",\"totalEmissionsNote\":\"Total Emissions Note\",\"scopeSelection\":\"Scope Selection\",\"totalrecords\":\"Total Records\",\"availableScopes\":\"Available Scopes\",\"summaryTable5\":\"Summary Table 5: Plant-wide Greenhouse Gas Data Rating Results\",\"summaryTable6\":\"Summary Table 6: Greenhouse Gas Uncertainty Quantification Assessment Results\",\"totalAbsoluteEmissions\":\"Total Absolute Emissions\",\"totalInventoryUncertainty\":\"Total Inventory Uncertainty\",\"uncertaintyAssessmentPercentage\":\"Proportion of Emissions Subject to Uncertainty Assessment in Total Emissions\",\"summaryTable4\":\"Summary Table 4: Plant-wide Greenhouse Gas Scope and Scope 1 Emission Types Emissions Statistics\",\"summaryTable2\":\"Summary Table 2: Plant-wide Seven Greenhouse Gas Emissions Statistics\",\"otherPowerGeneration\":\"Other Power Generation\",\"plantSteamGeneration\":\"Plant Steam Generation (tons)\",\"carbonyear\":\"Carbon Year\",\"controlno\":\"Control Number\",\"companyname\":\"Company Name\",\"taxcode\":\"Unified Business Number (Head Office)\",\"organizationcode\":\"Factory Unified Number\",\"owner\":\"Responsible Person Name\",\"contactname\":\"Contact Person Name\",\"tel\":\"Contact Telephone\",\"fax\":\"Contact Fax\",\"mobile\":\"Contact Mobile\",\"industrycode\":\"Industry Code\",\"industryname\":\"Industry Name\",\"reason\":\"Registration Reason\",\"accordto\":\"Investigation Basis Standard\",\"ispermit\":\"Certified by EPA-Approved Organization\",\"institution\":\"Verification Organization Name\",\"comment\":\"Remarks*\",\"certificate\":\"Issued Certificate Number\",\"competent\":\"Issuing Authority\",\"city\":\"City/County\",\"area\":\"Township/District\",\"postcode\":\"Postal Code\",\"neighborhood\":\"Neighborhood\",\"village\":\"Village\",\"combinname\":\"Excluded Emission Source #1\",\"combinname2\":\"Excluded Emission Source #2\",\"combinname3\":\"Excluded Emission Source #3\",\"processno\":\"Process Number\",\"processcode\":\"Process Code\",\"processname\":\"Process Name\",\"assetno\":\"Asset Number\",\"assetcode\":\"Asset Code\",\"assetname\":\"Asset Name\",\"objecttype\":\"Material or Product Type\",\"objectcode\":\"Material or Product Code\",\"objectname\":\"Material or Product Name\",\"isbiomess\":\"Biomass Energy\",\"isdirect\":\"Direct/Indirect\",\"scopetype\":\"Emission Type\",\"scopesubtype\":\"Subtype of Emission\",\"hasco2\":\"Generates CO2\",\"hasch4\":\"Generates CH4\",\"hasn2o\":\"Generates N2O\",\"hashfcs\":\"Generates HFCs\",\"haspfcs\":\"Generates PFCs\",\"hassf6\":\"Generates SF6\",\"hasnf3\":\"Generates NF3\",\"ischp\":\"Is CHP (Cogeneration Equipment)\",\"scope2provider\":\"Electricity/Steam Provider Name\",\"amount\":\"Activity Data\",\"unitname\":\"Activity Data Unit\",\"otherunit\":\"Other Unit Name\",\"dsname\":\"Data Source\",\"dep\":\"Preserving Unit\",\"measurefreq\":\"Measurement Frequency\",\"measureequip\":\"Measurement Instrument\",\"correctionfreq\":\"Instrument Calibration Frequency\",\"emissionmethod\":\"Emission Calculation Method\",\"lhv\":\"Lower Heating Value\",\"lhvunit\":\"LHV Unit\",\"moisturepercentage\":\"Moisture Content (%)\",\"carbonpercentage\":\"Carbon Content (%)\",\"hvfactor\":\"Emission Factor per Fuel Unit Heating Value / Carbon Emission Factor per Unit Electricity (3)\",\"hvunitname\":\"Unit of Heating Value or Electricity Factor\",\"factorunit\":\"Emission Factor Unit\",\"factorfrom\":\"Factor Source (5)\",\"levelfactor\":\"Factor Type (6)\",\"GWP\":\"GWP (8)\",\"co2e\":\"CO2e Emissions (tons/year) (9)\",\"gas2\":\"Greenhouse Gas #2\",\"hvfactor2\":\"Emission Factor per Fuel Unit Heating Value / Electricity Carbon Emission Factor\",\"hvunitname2\":\"Heating Value Emission Factor Unit\",\"factor2\":\"Emission Factor / Electricity Carbon Emission Factor\",\"factorunit2\":\"Emission Factor Unit\",\"factorfrom2\":\"Factor Source\",\"levelfactor2\":\"Factor Type\",\"emissions2\":\"Emissions (tons/year)\",\"GWP2\":\"GWP\",\"co2e2\":\"CO2e Emissions (tons/year)\",\"gas3\":\"Greenhouse Gas #3\",\"hvfactor3\":\"Emission Factor per Fuel Unit Heating Value / Electricity Carbon Emission Factor\",\"hvunitname3\":\"Heating Value Emission Factor Unit\",\"factor3\":\"Emission Factor / Electricity Carbon Emission Factor\",\"factorunit3\":\"Emission Factor Unit\",\"factorfrom3\":\"Factor Source\",\"levelfactor3\":\"Factor Type\",\"emissions3\":\"Emissions (tons/year)\",\"GWP3\":\"GWP\",\"co2e3\":\"CO2e Emissions (tons/year)\",\"emissionstotal\":\"Subtotal CO2e Emissions from Single Source (tons/year) (10)\",\"biomesstotal\":\"Subtotal CO2 Emissions from Biomass Fuel (tons/year) (11)\",\"emissionpercentage\":\"Single Source Emissions as % of Total (12)\",\"absco2e\":\"Absolute CO2e Emissions Subtotal from Single Source (tons/year)\",\"errorlevel\":\"Activity Data Error Level (3)\",\"reliability\":\"Activity Data Reliability Type (4 - Instrument Calibration Error Level)\",\"correctionlevel\":\"Instrument Calibration Error Level (5)\",\"credibility\":\"Data Credibility Description (6)\",\"catogoryofds\":\"Emission Factor Type\",\"errorlevel2\":\"Emission Factor Parameter Error Level (8)\",\"errorleveltotal\":\"Single Source Data Error Level (9)\",\"scorerange\":\"Score Range (10)\",\"weightavg\":\"Weighted Average of Emission Proportions\",\"uncertaintydslower\":\"Uncertainty Activity Data Lower Bound\",\"uncertaintydsupper\":\"Uncertainty Activity Data Upper Bound\",\"datafrom\":\"Data Source\",\"dsdep\":\"Data Preservation Unit\",\"uncertaintyfactorlower\":\"Uncertainty Factor Lower Bound 1\",\"uncertaintyfactorupper\":\"Uncertainty Factor Upper Bound 1\",\"uncertaintyfactorfrom\":\"Uncertainty Factor Source 1\",\"factordep\":\"Factor Preservation Unit 1\",\"uncertaintygaslower\":\"Uncertainty Gas Lower Bound 1\",\"uncertaintygasupper\":\"Uncertainty Gas Upper Bound 1\",\"uncertaintyfactorlower2\":\"Uncertainty Factor Lower Bound 2\",\"uncertaintyfactorupper2\":\"Uncertainty Factor Upper Bound 2\",\"uncertaintyfactorfrom2\":\"Uncertainty Factor Source 2\",\"factordep2\":\"Factor Preservation Unit 2\",\"uncertaintygaslower2\":\"Uncertainty Gas Lower Bound 2\",\"uncertaintygasupper2\":\"Uncertainty Gas Upper Bound 2\",\"uncertaintyfactorlower3\":\"Uncertainty Factor Lower Bound 3\",\"uncertaintyfactorupper3\":\"Uncertainty Factor Upper Bound 3\",\"uncertaintyfactorfrom3\":\"Uncertainty Factor Source 3\",\"factordep3\":\"Factor Preservation Unit 3\",\"uncertaintygaslower3\":\"Uncertainty Gas Lower Bound 3\",\"uncertaintygasupper3\":\"Uncertainty Gas Upper Bound 3\",\"uncertaintyemissionlower\":\"Uncertainty Emission Lower Bound\",\"uncertaintyemissionupper\":\"Uncertainty Emission Upper Bound\",\"Employee_Attendance_Page\":\"Employee Attendance Info\",\"Employee_Commute_Page\":\"Employee Commute Master\",\"Vendor_Factor_Page\":\"Vendor Emission Factor Settings\",\"Vendor_Services_Page\":\"Vendor Services\",\"Vendor_Settings_Page\":\"Vendor Configuration\",\"accordTo\":\"According to\",\"controlNo\":\"Control No\",\"factoryNumber\":\"Factory Number\",\"belong\":\"Belonging Unit\",\"assetmanufacturer\":\"Manufacturer\",\"assetserious\":\"Model/Series\",\"noofmanufacturer\":\"Manufacturer Part No.\",\"assetyearofproduction\":\"Year of Production\",\"assetyearofbuy\":\"Year of Purchase\",\"isinactive\":\"Inactive\",\"capacity\":\"Equipment Capacity\",\"dateofinactive\":\"Date of Inactivation\",\"position\":\"Installation Location\",\"unitofcapacity\":\"Activity Data Unit\",\"code\":\"Asset Code\",\"manufacturer\":\"Manufacturer\",\"serious\":\"Model/Series\",\"yearofproduction\":\"Year of Production\",\"yearofbuy\":\"Year of Purchase\",\"inactive\":\"Inactive\",\"actions\":\"Actions\",\"assetList\":\"Asset List\"}"));}),
"[project]/src/locales/zh/common.json (json)": ((__turbopack_context__) => {

__turbopack_context__.v(JSON.parse("{\"section1\":\"事業基本資料\",\"section2\":\"邊界設定\",\"section3\":\"排放源鑑別\",\"section4\":\"活動數據\",\"section5\":\"定量盤查\",\"section6\":\"數據品質管理\",\"section7\":\"不確定性定量評估\",\"section8\":\"溫室氣體排放量彙總\",\"download_excel\":\"下載 Excel\",\"home\":\"首頁\",\"profile\":\"個人資料\",\"carbon_report\":\"碳報告\",\"dashboard\":\"儀表板\",\"about\":\"關於我們\",\"reportPreview\":\"報告預覽\",\"search\":\"搜尋\",\"printDate\":\"列印日期\",\"formatTemplate\":\"格式範本\",\"year\":\"年份\",\"requestor\":\"申請人\",\"organization\":\"組織\",\"orgName\":\"組織名稱\",\"creationDate\":\"創建日期\",\"reportName\":\"報告名稱\",\"categoryOfAsset\":\"資產類別\",\"process\":\"製程\",\"object\":\"對象\",\"gas\":\"溫室氣體\",\"factorProvider\":\"係數提供商\",\"version\":\"版本\",\"rate\":\"係數值\",\"action\":\"操作\",\"select\":\"選擇\",\"displayChart\":\"顯示圖表\",\"addNew\":\"新增\",\"deleteSelected\":\"刪除選取項目\",\"delete\":\"刪除\",\"refresh\":\"重新整理\",\"excelTemplate\":\"Excel 範本\",\"exportToExcel\":\"匯出至 Excel\",\"importFromExcel\":\"從 Excel 匯入\",\"addFactor\":\"新增係數\",\"carbonInformation\":\"產品碳排放資訊\",\"objectCode\":\"產品代碼\",\"objectName\":\"產品名稱\",\"carbonManufacture\":\"生產碳排放\",\"co2Emission\":\"CO₂ 排放量\",\"requestDate\":\"請求日期\",\"carbonUse\":\"使用碳排放\",\"additive\":\"添加物\",\"co2eEmission\":\"CO₂e 排放\",\"gasCombination\":\"溫室氣體組合\",\"greenGas\":\"溫室氣體\",\"factor\":\"排放係數 / 碳排放係數\",\"gwpVersion\":\"全球變暖潛勢版本\",\"submit\":\"提交\",\"totalRecords\":\"總紀錄: {{count}} 項目\",\"changefactor\":\"更改係數\",\"sum\":\"總數\",\"rateSumCR\":\"率 * (總數 * 轉換率)\",\"Co2e-Rate\":\"GWP\",\"Co2e\":\"CO2e\",\"chooseFactorProvider\":\"選擇係數提供商\",\"cancel\":\"取消\",\"factorDescription\":\"係數描述\",\"personManagement\":\"人員管理\",\"downloadExcelSample\":\"下載 Excel 範本\",\"uploadExcel\":\"上傳 Excel\",\"addNewPerson\":\"新增人員\",\"name\":\"姓名\",\"telephone\":\"電話\",\"email\":\"聯絡人電子信箱\",\"employeeID\":\"員工編號\",\"dateOfStart\":\"入職日期\",\"status\":\"狀態\",\"roleName\":\"角色名稱\",\"selectOrganization\":\"選擇組織\",\"noOrganizationsAvailable\":\"沒有可用的組織。\",\"close\":\"關閉\",\"asset_upload_page\":\"資產上傳頁面\",\"function\":\"功能\",\"person_mapping\":\"人員映射\",\"account_settings\":\"帳戶設置\",\"person\":\"人員\",\"scope-3\":\"範疇 3\",\"company_management\":\"公司管理\",\"role_mapping\":\"角色映射\",\"organization_Edit\":\"組織編輯\",\"organization_orgadmin\":\"組織管理員\",\"organization_iadmin\":\"組織 IAdmin\",\"report\":\"報告\",\"fetchingOrganizationData\":\"正在獲取組織數據...\",\"organizationsData\":\"組織數據:\",\"errorFetchingOrganizationData\":\"獲取組織數據時出錯。\",\"fetchingYearData\":\"正在獲取 orgid: {{orgid}} 的年份數據\",\"yearData\":\"年份數據:\",\"yearDataNotArray\":\"年份數據格式不正確。\",\"selectedOrgID\":\"選擇的組織 ID:\",\"yearAddedSuccessfully\":\"年份 {{year}} 新增成功！\",\"fieldChange\":\"欄位變更 - {{name}}: {{value}}\",\"savingOrganizationDetails\":\"正在儲存組織詳情:\",\"organizationDetailsUpdatedSuccessfully\":\"組織詳情更新成功！\",\"errorUpdatingOrganization\":\"組織更新時出錯:\",\"failedToUpdateOrganizationDetails\":\"無法更新組織詳情。\",\"organizationDetails\":\"組織詳情\",\"address\":\"地址\",\"taxCode\":\"稅號\",\"country\":\"國家\",\"industry\":\"行業\",\"employees\":\"員工人數\",\"edit\":\"編輯\",\"save\":\"保存\",\"addYear\":\"新增年份\",\"bookkeeperCompanyName\":\"簿記公司名稱\",\"bookkeeperName\":\"簿記人名稱\",\"addNewYear\":\"新增年度\",\"selectYear\":\"選擇年份\",\"n/a\":\"不適用\",\"carbonReportHeader\":\"全廠七大溫室氣體統計表\",\"carbonEmissionsTable1\":\"碳排放表1\",\"carbonEmissionsTable2\":\"碳排放表2\",\"totalEmissions\":\"總排放量\",\"notes\":\"註：依《溫室氣體排放量盤查登錄管理辦法》第二條第一款規定，溫室氣體排放量以公噸二氧化碳當量（公噸 CO₂e）表示，並四捨五入至小數點後第三位。\",\"additionalTablesHeader\":\"彙整表三：範疇一七大溫室氣體排放量統計表\",\"errorFetchingTable1Data\":\"獲取表1數據時出錯：\",\"errorFetchingTable2Data\":\"獲取表2數據時出錯：\",\"scopeBasedEmissionsHeader\":\"全廠溫室氣體範疇分類統計表\",\"scopeBasedEmissionsTable\":\"範疇別排放統計表\",\"scope\":\"範疇\",\"scope1\":\"直接\",\"scope2\":\"間接\",\"scope3\":\"其他\",\"fixedEmissions\":\"固定排放\",\"mobileEmissions\":\"移動排放\",\"processEmissions\":\"製程排放\",\"fugitiveEmissions\":\"逸散排放\",\"energyIndirectEmissions\":\"能源間接排放\",\"otherIndirectEmissions\":\"其他間接排放\",\"errorFetchingReportData\":\"獲取報告數據時出錯：\",\"greenhouseGasScopeAndUncertaintyAssessment\":\"溫室氣體範疇統計及不確定性評估\",\"ratingScores\":\"評分結果\",\"level\":\"等級\",\"ratingResults\":\"評分結果\",\"inventoryLevel\":\"清冊等級\",\"firstLevel\":\"第一級\",\"secondLevel\":\"第二級\",\"ratingRange\":\"評分範圍\",\"points\":\"分數\",\"count\":\"個數\",\"averageScore\":\"清冊等級總平均分數\",\"uncertaintyEvaluation\":\"不確定性評估\",\"totalEmissionsForUncertaintyAssessment\":\"進行不確定性評估之排放量總值加總\",\"uncertaintyAssessmentResults\":\"排放量不確定性評估結果\",\"totalUncertainty\":\"本清冊之總不確定性\",\"lowerBound95CI\":\"95% 信賴區間下限\",\"upperBound95CI\":\"95% 信賴區間上限\",\"errorFetchingOrgList\":\"獲取組織列表時出錯:\",\"assigningOrgAdmin\":\"將OrgAdmin分配給行ID: {{selectedRowId}} 的組織ID: {{orgId}}\",\"orgAdminAssignedSuccessfully\":\"組織管理員分配成功！\",\"invalidPersonID\":\"無效的個人ID\",\"errorFetchingProfileData\":\"獲取個人資料時出錯：\",\"failedToFetchProfileData\":\"獲取個人資料失敗。\",\"phone\":\"電話\",\"notAvailable\":\"N/A\",\"personID\":\"個人ID\",\"additionalInformation\":\"附加信息\",\"additionalInformationDescription\":\"此部分可用於顯示更多信息或與用戶相關的操作。\",\"emissions\":\"排放量（公噸 CO₂e/年）\",\"percentage\":\"非重大性百分比設定（%）\",\"newTableHeader\":\"彙整表一、全廠電力\",\"newTable\":\"new table\",\"electricity\":\"全廠電力（仟度）\",\"steam\":\"全廠蒸汽\",\"thermalPower\":\"全廠火力電力（仟度）\",\"windPower\":\"風力（仟度）\",\"hydropower\":\"水力（仟度）\",\"geothermal\":\"地熱（仟度）\",\"tidal\":\"潮汐（仟度）\",\"otherRenewable\":\"其他再生能源（仟度）\",\"nuclear\":\"核能發電量（仟度）\",\"other\":\"其他發電量（仟度）\",\"totalEmissions-1\":\"七種溫室氣體年總排放當量\",\"totalEmissions-11\":\"七種溫室氣體年總排放當量\",\"biomassEmissions\":\"生質排放當量\",\"totalEmissionsNote\":\"總排放當量\",\"scopeSelection\":\"範疇選擇\",\"totalrecords\":\"總紀錄\",\"availableScopes\":\"可用範疇\",\"view\":\"查看\",\"finalReport\":\"最終報告\",\"summaryTable5\":\"彙整表五、全廠溫室氣體數據等級評分結果\",\"summaryTable6\":\"彙整表六、溫室氣體不確定性量化評估結果\",\"totalAbsoluteEmissions\":\"排放總量絕對值加總\",\"totalInventoryUncertainty\":\"本清冊之總不確定性\",\"uncertaintyAssessmentPercentage\":\"進行不確定性評估之排放量佔總排放量之比例\",\"summaryTable4\":\"彙整表四、全廠溫室氣體範疇別及範疇一排放形式排放量統計表\",\"summaryTable2\":\"彙整表二、全廠七大溫室氣體排放量統計表\",\"otherPowerGeneration\":\"其他發電量\",\"plantSteamGeneration\":\"全廠蒸汽產生量（公噸)\",\"carbonyear\":\"碳年度\",\"controlno\":\"管制編號\",\"companyname\":\"事業名稱\",\"taxcode\":\"統一編號（總公司統編）\",\"organizationcode\":\"工廠統一編號\",\"owner\":\"負責人姓名\",\"contactname\":\"聯絡人姓名\",\"tel\":\"聯絡人電話\",\"fax\":\"聯絡人傳真*\",\"mobile\":\"聯絡人手機\",\"industrycode\":\"行業代碼\",\"industryname\":\"行業名稱\",\"reason\":\"登錄原因\",\"accordto\":\"盤查依據規範\",\"ispermit\":\"是否經本署許可之查驗機構查驗\",\"institution\":\"查驗機構名稱\",\"comment\":\"備註*\",\"certificate\":\"目的事業主管機關所核發之證書字號\",\"competent\":\"目的事業主管機關\",\"city\":\"縣市別\",\"area\":\"鄉鎮別\",\"postcode\":\"郵遞區號3\",\"neighborhood\":\"里別*\",\"village\":\"鄰別*\",\"combinname\":\"邊界內未納入計算之排放源1*\",\"combinname2\":\"邊界內未納入計算之排放源2*\",\"combinname3\":\"邊界內未納入計算之排放源3*\",\"processno\":\"製程編號\",\"processcode\":\"製程代碼\",\"processname\":\"製程名稱\",\"assetno\":\"設備編號\",\"assetcode\":\"設備代碼\",\"assetname\":\"設備名稱\",\"belong\":\"所屬單位\",\"assetmanufacturer\":\"製造商\",\"assetserious\":\"型號／系列\",\"noofmanufacturer\":\"製造商料號\",\"assetyearofproduction\":\"製造年份\",\"assetyearofbuy\":\"採購年份\",\"isinactive\":\"是否停用\",\"capacity\":\"設備容量\",\"dateofinactive\":\"停用日期\",\"position\":\"安裝地點\",\"unitofcapacity\":\"設備容量單位\",\"objecttype\":\"原(燃)物料或產品類型\",\"objectcode\":\"原(燃)物料或產品代碼\",\"objectname\":\"原(燃)物料或產品名稱\",\"isbiomess\":\"是否為生質能源\",\"isdirect\":\"直接/間接\",\"scopetype\":\"排放類型\",\"scopesubtype\":\"排放型式\",\"hasco2\":\"產生 CO2\",\"hasch4\":\"產生 CH4\",\"hasn2o\":\"產生 N2O\",\"hashfcs\":\"產生 HFCs\",\"haspfcs\":\"產生 PFCs\",\"hassf6\":\"產生 SF6\",\"hasnf3\":\"產生 NF3\",\"ischp\":\"是否CHP(熱電共生)\",\"scope2provider\":\"用電/蒸汽提供單位名稱\",\"amount\":\"活動數據\",\"unitname\":\"設備容量單位\",\"otherunit\":\"其他單位名稱\",\"dsname\":\"數據來源\",\"dep\":\"保存單位\",\"measurefreq\":\"量測頻率\",\"measureequip\":\"量測儀器\",\"correctionfreq\":\"儀器校正頻率\",\"emissionmethod\":\"排放計算方法\",\"lhv\":\"低位發熱值\",\"lhvunit\":\"低位發熱值單位\",\"moisturepercentage\":\"含水率 (%)\",\"carbonpercentage\":\"含碳率 (%)\",\"hvfactor\":\"單位燃料發熱量排放係數 / 單位用電碳排放係數\",\"hvunitname\":\"發熱量或用電係數單位\",\"factorunit\":\"排放係數單位\",\"factorfrom\":\"係數來源\",\"levelfactor\":\"係數類型\",\"GWP\":\"全球變暖潛勢\",\"co2e\":\"CO₂e 排放量 (公噸/年)\",\"gas2\":\"溫室氣體 #2\",\"hvfactor2\":\"單位燃料發熱量排放係數 / 用電碳排放係數\",\"hvunitname2\":\"發熱量排放係數單位\",\"factor2\":\"排放係數 / 用電碳排放係數\",\"factorunit2\":\"排放係數單位\",\"factorfrom2\":\"係數來源\",\"levelfactor2\":\"係數類型\",\"emissions2\":\"排放量 (公噸/年)\",\"GWP2\":\"全球變暖潛勢\",\"co2e2\":\"CO₂e 排放量 (公噸/年)\",\"gas3\":\"溫室氣體 #3\",\"hvfactor3\":\"單位燃料發熱量排放係數 / 用電碳排放係數\",\"hvunitname3\":\"發熱量排放係數單位\",\"factor3\":\"排放係數 / 用電碳排放係數\",\"factorunit3\":\"排放係數單位\",\"factorfrom3\":\"係數來源\",\"levelfactor3\":\"係數類型\",\"emissions3\":\"排放量 (公噸/年)\",\"GWP3\":\"全球變暖潛勢\",\"co2e3\":\"CO₂e 排放量 (公噸/年)\",\"emissionstotal\":\"單一來源排放當量小計 (公噸/年) (10)\",\"biomesstotal\":\"生質燃料 CO₂ 排放小計 (公噸/年) (11)\",\"emissionpercentage\":\"單一來源排放量占總量比 (%) (12)\",\"absco2e\":\"單一來源絕對 CO₂e 排放量小計 (公噸/年)\",\"errorlevel\":\"活動數據誤差等級 (3)\",\"reliability\":\"活動數據可靠度類型 (4 - 儀器校正誤差等級)\",\"correctionlevel\":\"儀器校正誤差等級 (5)\",\"credibility\":\"數據可信度描述 (6)\",\"catogoryofds\":\"排放係數類型\",\"errorlevel2\":\"排放係數參數誤差等級 (8)\",\"errorleveltotal\":\"單一來源數據誤差等級 (9)\",\"scorerange\":\"評分範圍 (10)\",\"weightavg\":\"排放比重加權平均值\",\"uncertaintydslower\":\"活動數據不確定性下限\",\"uncertaintydsupper\":\"活動數據不確定性上限\",\"datafrom\":\"數據來源\",\"dsdep\":\"數據保存單位\",\"uncertaintyfactorlower\":\"95％信賴區間之下限\",\"uncertaintyfactorupper\":\"95％信賴區間之上限\",\"uncertaintyfactorfrom\":\"排放係數不確定性來源 1\",\"factordep\":\"排放係數保存單位 1\",\"uncertaintygaslower\":\"95％信賴區間之下限\",\"uncertaintygasupper\":\"95％信賴區間之上限\",\"uncertaintyfactorlower2\":\"排放係數不確定性下限 2\",\"uncertaintyfactorupper2\":\"排放係數不確定性上限 2\",\"uncertaintyfactorfrom2\":\"排放係數不確定性來源 2\",\"factordep2\":\"排放係數保存單位 2\",\"uncertaintygaslower2\":\"溫室氣體不確定性下限 2\",\"uncertaintygasupper2\":\"溫室氣體不確定性上限 2\",\"uncertaintyfactorlower3\":\"排放係數不確定性下限 3\",\"uncertaintyfactorupper3\":\"排放係數不確定性上限 3\",\"uncertaintyfactorfrom3\":\"排放係數不確定性來源 3\",\"factordep3\":\"排放係數保存單位 3\",\"uncertaintygaslower3\":\"溫室氣體不確定性下限 3\",\"uncertaintygasupper3\":\"溫室氣體不確定性上限 3\",\"uncertaintyemissionlower\":\"排放量不確定性下限\",\"uncertaintyemissionupper\":\"排放量不確定性上限\",\"Employee_Attendance_Page\":\"員工出勤資訊\",\"Employee_Commute_Page\":\"員工通勤主檔\",\"Vendor_Factor_Page\":\"供應商係數設定\",\"Vendor_Services_Page\":\"供應商服務\",\"Vendor_Settings_Page\":\"供應商設定\",\"accordTo\":\"盤查依據規範\",\"controlNo\":\"管理編號\",\"factoryNumber\":\"工廠編號\",\"code\":\"設備代碼\",\"manufacturer\":\"製造商\",\"serious\":\"型號／系列\",\"yearofproduction\":\"製造年份\",\"yearofbuy\":\"採購年份\",\"inactive\":\"是否停用\",\"actions\":\"操作\",\"assetList\":\"設備列表\",\"Asset Upload\":\"設備上傳\",\"Add Asset\":\"新增設備\",\"Refresh\":\"重新整理\",\"Download Sample\":\"下載範本\",\"Upload CSV\":\"上傳 CSV\",\"Unit conversion ratio\":\"單位轉換比率\",\"emission\":\"排放量\",\"heatvalue\":\"低位熱值\",\"Other renewable energy notes\":\"其他再生能源備註\",\"Other power generation notes\":\"其他發電量備註\",\"Outsourcing steam\":\"外購蒸汽\",\"Actions\":\"操作\",\"VendorServiceFactorPage\":\"供應商服務係數頁面\"}"));}),
"[project]/src/locales/jp/common.json (json)": ((__turbopack_context__) => {

__turbopack_context__.v(JSON.parse("{\"home\":\"ホーム\",\"profile\":\"プロフィール\",\"carbon_report\":\"カーボンレポート\",\"dashboard\":\"ダッシュボード\",\"about\":\"約\",\"reportPreview\":\"レポートプレビュー\",\"search\":\"検索\",\"printDate\":\"印刷日\",\"formatTemplate\":\"フォーマットテンプレート\",\"year\":\"年\",\"requestor\":\"依頼者\",\"organization\":\"組織\",\"orgName\":\"組織名\",\"creationDate\":\"作成日\",\"reportName\":\"レポート名\",\"categoryOfAsset\":\"資産カテゴリ\",\"process\":\"プロセス\",\"object\":\"オブジェクト\",\"gas\":\"気体\",\"factorProvider\":\"係数プロバイダー\",\"version\":\"バージョン\",\"rate\":\"率\",\"action\":\"アクション\",\"select\":\"選択\",\"displayChart\":\"チャートを表示\",\"addNew\":\"新規追加\",\"deleteSelected\":\"選択した項目を削除\",\"delete\":\"削除\",\"refresh\":\"リフレッシュ\",\"excelTemplate\":\"Excel テンプレート\",\"exportToExcel\":\"Excel にエクスポート\",\"importFromExcel\":\"Excel からインポート\",\"addFactor\":\"係数を追加\",\"carbonInformation\":\"製品の炭素情報\",\"objectCode\":\"製品コード\",\"objectName\":\"製品名\",\"carbonManufacture\":\"製造時の炭素排出\",\"co2Emission\":\"CO2排出量\",\"requestDate\":\"リクエスト日付\",\"carbonUse\":\"使用時の炭素排出\",\"additive\":\"添加物\",\"co2eEmission\":\"CO2e排出\",\"gasCombination\":\"温室効果ガスの組み合わせ\",\"greenGas\":\"温室効果ガス\",\"factor\":\"係数\",\"organizationrch\":\"組織\",\"gwpVersion\":\"GWP バージョン\",\"submit\":\"送信\",\"totalRecords\":\"合計レコード: {{count}} 件\",\"changefactor\":\"係数の変更\",\"sum\":\"合計\",\"rateSumCR\":\"率 * (合計 * 変換率)\",\"Co2e-Rate\":\"CO2e率\",\"Co2e\":\"CO2e\",\"chooseFactorProvider\":\"係数プロバイダーを選択\",\"cancel\":\"キャンセル\",\"factorDescription\":\"係数の説明\",\"personManagement\":\"人物管理\",\"downloadExcelSample\":\"Excelサンプルをダウンロード\",\"uploadExcel\":\"Excelをアップロード\",\"addNewPerson\":\"+ 新しい人物を追加\",\"name\":\"名前\",\"telephone\":\"電話\",\"email\":\"メール\",\"employeeID\":\"従業員 ID\",\"dateOfStart\":\"開始日\",\"status\":\"ステータス\",\"roleName\":\"役割名\",\"selectOrganization\":\"組織を選択\",\"noOrganizationsAvailable\":\"利用可能な組織はありません。\",\"close\":\"閉じる\",\"asset_upload_page\":\"アセットアップロードページ\",\"function\":\"機能\",\"person_mapping\":\"人物マッピング\",\"account_settings\":\"アカウント設定\",\"person\":\"人物\",\"scope-3\":\"スコープ 3\",\"company_management\":\"会社管理\",\"role_maping\":\"役割マッピング\",\"organization_Edit\":\"組織編集\",\"organization_orgadmin\":\"組織管理者\",\"organization_iadmin\":\"組織 IAdmin\",\"report\":\"レポート\",\"fetchingOrganizationData\":\"組織データを取得しています...\",\"organizationsData\":\"組織データ:\",\"errorFetchingOrganizationData\":\"組織データの取得エラー。\",\"fetchingYearData\":\"orgid: {{orgid}} の年データを取得しています\",\"yearData\":\"年データ\",\"yearDataNotArray\":\"年データが配列ではありません。\",\"selectedOrgID\":\"選択された組織ID:\",\"yearAddedSuccessfully\":\"年 {{year}} が正常に追加されました！\",\"fieldChange\":\"フィールド変更 - {{name}}: {{value}}\",\"savingOrganizationDetails\":\"組織の詳細を保存しています:\",\"organizationDetailsUpdatedSuccessfully\":\"組織の詳細が正常に更新されました！\",\"errorUpdatingOrganization\":\"組織の更新エラー:\",\"failedToUpdateOrganizationDetails\":\"組織の詳細を更新できませんでした。\",\"organizationDetails\":\"組織の詳細\",\"address\":\"住所\",\"taxCode\":\"税コード\",\"country\":\"国\",\"industry\":\"業界\",\"employees\":\"従業員\",\"edit\":\"編集\",\"save\":\"保存\",\"addYear\":\"年を追加\",\"bookkeeperCompanyName\":\"簿記会社名\",\"bookkeeperName\":\"簿記者名\",\"addNewYear\":\"新しい年を追加\",\"selectYear\":\"年を選択\",\"n/a\":\"該当なし\",\"carbonReportHeader\":\"工場全体の7大温室効果ガス統計表\",\"carbonEmissionsTable1\":\"炭素排出量表1\",\"carbonEmissionsTable2\":\"炭素排出量表2\",\"emissions\":\"排出量（トンCO2e/年）\",\"percentage\":\"気体の割合（%）\",\"totalEmissions\":\"総排出量\",\"notes\":\"注：温室効果ガス排出量の調査登録管理規則第2条第1項の規定に基づき、温室効果ガス排出量はトン二酸化炭素換算（トンCO2e）で表示し、小数点以下3桁に四捨五入します。\",\"additionalTablesHeader\":\"統合表3：スコープ1の7大温室効果ガス排出量統計表\",\"errorFetchingTable1Data\":\"表1のデータ取得中にエラーが発生しました：\",\"errorFetchingTable2Data\":\"表2のデータ取得中にエラーが発生しました：\",\"scopeBasedEmissionsHeader\":\"工場全体の温室効果ガス範囲別分類統計表\",\"scopeBasedEmissionsTable\":\"範囲別排出統計表\",\"scope\":\"スコープ\",\"scope1\":\"スコープ1\",\"scope2\":\"スコープ2\",\"scope3\":\"スコープ3\",\"fixedEmissions\":\"固定排出\",\"mobileEmissions\":\"移動排出\",\"processEmissions\":\"プロセス排出\",\"fugitiveEmissions\":\"逃散排出\",\"energyIndirectEmissions\":\"エネルギー間接排出\",\"otherIndirectEmissions\":\"その他の間接排出\",\"errorFetchingReportData\":\"レポートデータの取得エラー：\",\"greenhouseGasScopeAndUncertaintyAssessment\":\"温室効果ガス範囲と不確実性評価\",\"ratingScores\":\"評価スコア\",\"level\":\"レベル\",\"ratingResults\":\"評価結果\",\"inventoryLevel\":\"在庫レベル\",\"firstLevel\":\"第一レベル\",\"secondLevel\":\"第二レベル\",\"ratingRange\":\"評価範囲\",\"points\":\" ポイント\",\"count\":\"カウント\",\"averageScore\":\"平均スコア\",\"uncertaintyEvaluation\":\"不確実性評価\",\"totalEmissionsForUncertaintyAssessment\":\"不確実性評価のための総排出量\",\"uncertaintyAssessmentResults\":\"不確実性評価結果\",\"totalUncertainty\":\"総不確実性\",\"lowerBound95CI\":\"95%信頼区間下限\",\"upperBound95CI\":\"95%信頼区間上限\",\"errorFetchingOrgList\":\"組織リストの取得エラー:\",\"assigningOrgAdmin\":\"行ID: {{selectedRowId}} の組織ID: {{orgId}} にOrgAdminを割り当てています\",\"orgAdminAssignedSuccessfully\":\"組織管理者が正常に割り当てられました！\",\"invalidPersonID\":\"無効な個人ID\",\"errorFetchingProfileData\":\"プロファイルデータの取得エラー：\",\"failedToFetchProfileData\":\"プロファイルデータの取得に失敗しました。\",\"phone\":\"電話\",\"notAvailable\":\"N/A\",\"personID\":\"個人ID\",\"additionalInformation\":\"追加情報\",\"additionalInformationDescription\":\"このセクションは、将来ユーザーに関連する情報やアクションを表示するために使用できます。\",\"newTableHeader\":\"集計表1、全工場の電力\",\"newTable\":\"new table\",\"electricity\":\"全工場の電力（千度）\",\"steam\":\"全工場の蒸気\",\"thermalPower\":\"全工場の火力電力（千度）\",\"windPower\":\"風力（千度）\",\"hydropower\":\"水力（千度）\",\"geothermal\":\"地熱（千度）\",\"tidal\":\"潮汐（千度）\",\"otherRenewable\":\"その他の再生可能エネルギー（千度）\",\"nuclear\":\"原子力発電量（千度）\",\"other\":\"その他の発電量（千度）\",\"totalEmissionsNote\":\"総排放当量註\",\"scopeSelection\":\"スコープ選択\",\"totalrecords\":\"Total Records\",\"availableScopes\":\"Available Scopes\",\"summaryTable5\":\"集計表5：全工場温室効果ガスデータ等級評価結果\",\"summaryTable6\":\"集計表6：温室効果ガス不確実性定量評価結果\",\"totalAbsoluteEmissions\":\"排出総量の絶対値合計\",\"totalInventoryUncertainty\":\"本インベントリの総不確実性\",\"uncertaintyAssessmentPercentage\":\"総排出量に占める不確実性評価対象排出量の割合\",\"summaryTable4\":\"集計表4：全工場温室効果ガスのスコープ別およびスコープ1の排出形式別統計表\",\"summaryTable2\":\"集計表2：全工場7種の温室効果ガス排出量統計表\",\"otherPowerGeneration\":\"その他の発電量\",\"plantSteamGeneration\":\"全工場の蒸気発生量（トン）\",\"Employee_Attendance_Page\":\"従業員出勤情報\",\"Employee_Commute_Page\":\"従業員通勤情報\",\"Vendor_Factor_Page\":\"サプライヤー係数設定\",\"Vendor_Services_Page\":\"サプライヤーサービス\",\"Vendor_Settings_Page\":\"サプライヤー設定\",\"accordTo\":\"盤查依據規範\",\"controlNo\":\"管理番号\",\"factoryNumber\":\"工場番号\",\"CODE\":\"設備代碼\"}"));}),
"[project]/src/i18n.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$i18next$2f$dist$2f$esm$2f$i18next$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/i18next/dist/esm/i18next.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/react-i18next/dist/es/index.js [client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$initReactI18next$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-i18next/dist/es/initReactI18next.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$locales$2f$en$2f$common$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/src/locales/en/common.json (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$locales$2f$zh$2f$common$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/src/locales/zh/common.json (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$locales$2f$jp$2f$common$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/src/locales/jp/common.json (json)");
;
;
;
;
;
// Language resources
const resources = {
    en: {
        translation: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$locales$2f$en$2f$common$2e$json__$28$json$29$__["default"]
    },
    zh: {
        translation: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$locales$2f$zh$2f$common$2e$json__$28$json$29$__["default"]
    },
    jp: {
        translation: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$locales$2f$jp$2f$common$2e$json__$28$json$29$__["default"]
    }
};
// Initialize i18next
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$i18next$2f$dist$2f$esm$2f$i18next$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$initReactI18next$2e$js__$5b$client$5d$__$28$ecmascript$29$__["initReactI18next"]).init({
    resources,
    lng: 'zh-TW',
    fallbackLng: 'zh-TW',
    interpolation: {
        escapeValue: false
    }
});
const __TURBOPACK__default__export__ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$i18next$2f$dist$2f$esm$2f$i18next$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"];
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
"[project]/src/pages/Chat.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Box/Box.js [client] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/Paper.js [client] (ecmascript) <export default as Paper>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/Typography.js [client] (ecmascript) <export default as Typography>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IconButton$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/IconButton/IconButton.js [client] (ecmascript) <export default as IconButton>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TextField/TextField.js [client] (ecmascript) <export default as TextField>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Tooltip$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tooltip$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Tooltip/Tooltip.js [client] (ecmascript) <export default as Tooltip>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Send$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/esm/Send.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$ChatBubble$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/esm/ChatBubble.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Minimize$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/esm/Minimize.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$ClearAll$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/esm/ClearAll.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
const Chat = (param)=>{
    let { user } = param;
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false); // Controls whether the chat window is open
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [input, setInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const messagesEndRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const query = async (data)=>{
        try {
            const response = await fetch("http://130.33.75.207:3000/api/v1/prediction/c13db90b-b452-416d-b9e6-434c9f35a917", {
                headers: {
                    Authorization: "Bearer eTqFs7NoUAg0ehVEjRpa0Au1qPkQSRl8i3dmSJHPcZg",
                    "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify(data)
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error("Error:", error);
            return {
                text: "Error connecting to chat server."
            };
        }
    };
    // Auto-scroll to the bottom when messages update
    const scrollToBottom = ()=>{
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: "smooth"
            });
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Chat.useEffect": ()=>{
            scrollToBottom();
        }
    }["Chat.useEffect"], [
        messages
    ]);
    const sendMessage = async ()=>{
        if (!input.trim()) return;
        // Append user message
        const newMessages = [
            ...messages,
            {
                sender: "user",
                text: input
            }
        ];
        setMessages(newMessages);
        setInput("");
        // Get bot response and append
        const response = await query({
            question: input
        });
        setMessages([
            ...newMessages,
            {
                sender: "bot",
                text: response.text
            }
        ]);
    };
    const handleKeyPress = (e)=>{
        if (e.key === "Enter") {
            sendMessage();
        }
    };
    // Clear chat messages
    const clearChat = ()=>{
        setMessages([]);
    };
    // Minimize chat window
    const minimizeChat = ()=>{
        setOpen(false);
    };
    // When chat is closed, show only the chat icon
    if (!open) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
            sx: {
                position: "fixed",
                bottom: 20,
                right: 20
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Tooltip$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tooltip$3e$__["Tooltip"], {
                title: "Open Chat",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IconButton$3e$__["IconButton"], {
                    onClick: ()=>setOpen(true),
                    sx: {
                        backgroundColor: "#1976d2",
                        color: "#fff"
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$ChatBubble$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/src/pages/Chat.js",
                        lineNumber: 83,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/src/pages/Chat.js",
                    lineNumber: 80,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/pages/Chat.js",
                lineNumber: 79,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/src/pages/Chat.js",
            lineNumber: 78,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0));
    }
    // When chat is open, show the full chat window
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
        elevation: 4,
        sx: {
            position: "fixed",
            bottom: 20,
            right: 20,
            width: 350,
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            borderRadius: 2
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                sx: {
                    backgroundColor: "#1976d2",
                    color: "#fff",
                    p: 1,
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                        variant: "h6",
                        children: "Chat Support"
                    }, void 0, false, {
                        fileName: "[project]/src/pages/Chat.js",
                        lineNumber: 113,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Tooltip$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tooltip$3e$__["Tooltip"], {
                                title: "Clear Chat",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IconButton$3e$__["IconButton"], {
                                    onClick: clearChat,
                                    sx: {
                                        color: "#fff"
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$ClearAll$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                        fontSize: "small"
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/Chat.js",
                                        lineNumber: 117,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/pages/Chat.js",
                                    lineNumber: 116,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/pages/Chat.js",
                                lineNumber: 115,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Tooltip$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tooltip$3e$__["Tooltip"], {
                                title: "Minimize",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IconButton$3e$__["IconButton"], {
                                    onClick: minimizeChat,
                                    sx: {
                                        color: "#fff"
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Minimize$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                        fontSize: "small"
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/Chat.js",
                                        lineNumber: 122,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/pages/Chat.js",
                                    lineNumber: 121,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/pages/Chat.js",
                                lineNumber: 120,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/pages/Chat.js",
                        lineNumber: 114,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/Chat.js",
                lineNumber: 103,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                sx: {
                    flexGrow: 1,
                    p: 2,
                    overflowY: "auto",
                    backgroundColor: "#f9f9f9"
                },
                children: [
                    messages.map((msg, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                            sx: {
                                display: "flex",
                                justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                                mb: 1
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                                sx: {
                                    p: 1.5,
                                    borderRadius: 2,
                                    backgroundColor: msg.sender === "user" ? "#1976d2" : "#e0e0e0",
                                    color: msg.sender === "user" ? "#fff" : "#000",
                                    maxWidth: "80%"
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                    variant: "body2",
                                    children: msg.text
                                }, void 0, false, {
                                    fileName: "[project]/src/pages/Chat.js",
                                    lineNumber: 143,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/pages/Chat.js",
                                lineNumber: 136,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, index, false, {
                            fileName: "[project]/src/pages/Chat.js",
                            lineNumber: 131,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: messagesEndRef
                    }, void 0, false, {
                        fileName: "[project]/src/pages/Chat.js",
                        lineNumber: 147,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/Chat.js",
                lineNumber: 129,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                sx: {
                    display: "flex",
                    p: 1,
                    borderTop: "1px solid #ddd"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                        variant: "outlined",
                        placeholder: "Type a message...",
                        size: "small",
                        value: input,
                        onChange: (e)=>setInput(e.target.value),
                        onKeyPress: handleKeyPress,
                        sx: {
                            flexGrow: 1
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/pages/Chat.js",
                        lineNumber: 152,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IconButton$3e$__["IconButton"], {
                        color: "primary",
                        onClick: sendMessage,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Send$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                            fileName: "[project]/src/pages/Chat.js",
                            lineNumber: 162,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/pages/Chat.js",
                        lineNumber: 161,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/Chat.js",
                lineNumber: 151,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/Chat.js",
        lineNumber: 92,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Chat, "aW+kqXu8Vt/prZ0UdyKFInTuA+0=");
_c = Chat;
const __TURBOPACK__default__export__ = Chat;
var _c;
__turbopack_context__.k.register(_c, "Chat");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/Layout.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dynamic$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dynamic.js [client] (ecmascript)"); // Import dynamic from Next.js
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/react-i18next/dist/es/index.js [client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-i18next/dist/es/useTranslation.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$AppBar$2f$AppBar$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/AppBar/AppBar.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Toolbar$2f$Toolbar$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Toolbar/Toolbar.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/IconButton/IconButton.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/Typography.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Menu$2f$Menu$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Menu/Menu.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/MenuItem/MenuItem.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$List$2f$List$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/List/List.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$ListItem$2f$ListItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/ListItem/ListItem.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$ListItemText$2f$ListItemText$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/ListItemText/ListItemText.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Box/Box.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Translate$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/esm/Translate.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$AccountCircle$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/esm/AccountCircle.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Menu$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/esm/Menu.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/link.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/i18n.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/AuthContext.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/GlobalContext.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$PageControllers$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/controllers/PageControllers.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$Chat$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/Chat.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$FormControl$2f$FormControl$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/FormControl/FormControl.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Select$2f$Select$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Select/Select.js [client] (ecmascript)");
;
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
const BubbleChat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dynamic$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"])(_c = ()=>__turbopack_context__.r("[project]/node_modules/flowise-embed-react/dist/index.js [client] (ecmascript, next/dynamic entry, async loader)")(__turbopack_context__.i).then((mod)=>mod.BubbleChat), {
    loadableGenerated: {
        modules: [
            "[project]/node_modules/flowise-embed-react/dist/index.js [client] (ecmascript, next/dynamic entry)"
        ]
    },
    ssr: false
});
_c1 = BubbleChat;
const Layout = (param)=>{
    let { children } = param;
    _s();
    const { t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useTranslation"])();
    const { token, logout, profile, personId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const { globalCompanyId, setGlobalCompanyId, globalOrgId, setGlobalOrgId, companyList, setCompanyList, organizationList, setOrganizationList } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useGlobalContext"])();
    const [languageAnchor, setLanguageAnchor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [currentLanguage, setCurrentLanguage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].language);
    const [menuItems, setMenuItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]); // Initialize menuItems as an empty array
    const [rows, setRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // ---- Persist selections across refresh (per user) ----
    const isBrowser = "object" !== 'undefined';
    const getLS = (key)=>("TURBOPACK compile-time truthy", 1) ? window.localStorage.getItem(key) : "TURBOPACK unreachable";
    const setLS = (key, val)=>{
        if ("TURBOPACK compile-time truthy", 1) window.localStorage.setItem(key, val);
    };
    const rmLS = (key)=>{
        if ("TURBOPACK compile-time truthy", 1) window.localStorage.removeItem(key);
    };
    const storagePrefix = "eztracker:".concat(personId || 'anon');
    const COMPANY_KEY = "".concat(storagePrefix, ":companyId");
    const ORG_KEY = "".concat(storagePrefix, ":orgId");
    const endpoint = "/api/menu?personid=".concat(personId);
    const handleLanguageMenuOpen = (event)=>{
        setLanguageAnchor(event.currentTarget);
    };
    const handleLanguageMenuClose = ()=>{
        setLanguageAnchor(null);
    };
    const handleLanguageChange = (lng)=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].changeLanguage(lng);
        setCurrentLanguage(lng);
        handleLanguageMenuClose();
    };
    const fetchOrganizations = async function(companyId) {
        let { tryRestoreOrg = false } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$PageControllers$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getData"]("/f000110e30/organizations?personid=".concat(personId, "&companyId=").concat(companyId), (data)=>{
                const list = data || [];
                setOrganizationList(list);
                if (tryRestoreOrg) {
                    const storedOrg = getLS(ORG_KEY);
                    if (storedOrg && list.some((o)=>o.organizationid === storedOrg)) {
                        setGlobalOrgId(storedOrg);
                    } else if (!globalOrgId && list.length > 0) {
                        setGlobalOrgId(list[0].organizationid);
                    }
                }
            }, {
                companyId,
                personid: personId
            });
        } catch (err) {
            console.error('Failed to fetch organizations:', err);
        }
    };
    const fetchCompanies = async ()=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$PageControllers$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getData"]("/f000110e30/companies?personid=".concat(personId), (data)=>{
                const list = data || [];
                setCompanyList(list);
                // Try to restore company selection from LS if none selected
                const storedCompany = getLS(COMPANY_KEY);
                if (!globalCompanyId && list.length > 0) {
                    if (storedCompany && list.some((c)=>c.companyid === storedCompany)) {
                        setGlobalCompanyId(storedCompany);
                        // Also fetch orgs and try to restore org
                        fetchOrganizations(storedCompany, {
                            tryRestoreOrg: true
                        });
                    } else {
                        const firstCompany = list[0];
                        setGlobalCompanyId(firstCompany.companyid);
                        fetchOrganizations(firstCompany.companyid, {
                            tryRestoreOrg: true
                        });
                    }
                }
            }, {
                personid: personId
            });
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        }
    };
    const fetchMenuItems = async ()=>{
        if (!token) return;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$controllers$2f$PageControllers$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getData"](endpoint, (data)=>{
                if (!data || data.length === 0) {
                    logout();
                    return;
                }
                setRows(data);
                setMenuItems(data);
            });
        } catch (error) {
            console.error('Error fetching menu items:', error);
        }
    };
    // Initial load: fetch menu + companies (restores saved company/org if present)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Layout.useEffect": ()=>{
            if (!token) return;
            const initialize = {
                "Layout.useEffect.initialize": async ()=>{
                    await fetchMenuItems();
                    await fetchCompanies(); // handles restore + org fetch internally
                }
            }["Layout.useEffect.initialize"];
            initialize();
        }
    }["Layout.useEffect"], [
        token,
        personId
    ]);
    // Persist selections when they change
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Layout.useEffect": ()=>{
            if (globalCompanyId) {
                setLS(COMPANY_KEY, globalCompanyId);
            }
        }
    }["Layout.useEffect"], [
        globalCompanyId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Layout.useEffect": ()=>{
            if (globalOrgId) {
                setLS(ORG_KEY, globalOrgId);
            }
        }
    }["Layout.useEffect"], [
        globalOrgId
    ]);
    // If the company list changes and current selection is invalid, fix it
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Layout.useEffect": ()=>{
            if (companyList === null || companyList === void 0 ? void 0 : companyList.length) {
                if (!globalCompanyId || !companyList.some({
                    "Layout.useEffect": (c)=>c.companyid === globalCompanyId
                }["Layout.useEffect"])) {
                    var _companyList_;
                    const stored = getLS(COMPANY_KEY);
                    const next = stored && companyList.some({
                        "Layout.useEffect": (c)=>c.companyid === stored
                    }["Layout.useEffect"]) ? stored : (_companyList_ = companyList[0]) === null || _companyList_ === void 0 ? void 0 : _companyList_.companyid;
                    if (next && next !== globalCompanyId) {
                        setGlobalCompanyId(next);
                        fetchOrganizations(next, {
                            tryRestoreOrg: true
                        });
                    }
                }
            }
        }
    }["Layout.useEffect"], [
        companyList
    ]);
    // If the org list changes and current selection is invalid, fix it
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Layout.useEffect": ()=>{
            if ((organizationList === null || organizationList === void 0 ? void 0 : organizationList.length) && globalCompanyId) {
                if (!globalOrgId || !organizationList.some({
                    "Layout.useEffect": (o)=>o.organizationid === globalOrgId
                }["Layout.useEffect"])) {
                    var _organizationList_;
                    const stored = getLS(ORG_KEY);
                    const next = stored && organizationList.some({
                        "Layout.useEffect": (o)=>o.organizationid === stored
                    }["Layout.useEffect"]) ? stored : (_organizationList_ = organizationList[0]) === null || _organizationList_ === void 0 ? void 0 : _organizationList_.organizationid;
                    if (next && next !== globalOrgId) {
                        setGlobalOrgId(next);
                    }
                }
            }
        }
    }["Layout.useEffect"], [
        organizationList,
        globalCompanyId
    ]);
    // Guard Select values against out-of-range values
    const safeCompanyValue = (companyList || []).some((c)=>c.companyid === globalCompanyId) ? globalCompanyId : '';
    const safeOrgValue = (organizationList || []).some((o)=>o.organizationid === globalOrgId) ? globalOrgId : '';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$AppBar$2f$AppBar$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                position: "static",
                sx: {
                    backgroundColor: '#FFFFFF',
                    color: '#000000'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Toolbar$2f$Toolbar$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                            edge: "start",
                            color: "inherit",
                            "aria-label": "menu",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Menu$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/src/components/Layout.js",
                                lineNumber: 211,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/src/components/Layout.js",
                            lineNumber: 210,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                            variant: "h6",
                            sx: {
                                mr: 2
                            },
                            children: "EZ Tracker"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Layout.js",
                            lineNumber: 213,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                            sx: {
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: 'auto'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$FormControl$2f$FormControl$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                    size: "small",
                                    sx: {
                                        minWidth: 150,
                                        mr: 2
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Select$2f$Select$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                        displayEmpty: true,
                                        value: safeCompanyValue,
                                        onChange: (e)=>{
                                            const nextCompany = e.target.value;
                                            setGlobalCompanyId(nextCompany);
                                            setLS(COMPANY_KEY, nextCompany);
                                            // Reset org selection (and its LS) because company changed
                                            setGlobalOrgId('');
                                            rmLS(ORG_KEY);
                                            setOrganizationList([]);
                                            fetchOrganizations(nextCompany, {
                                                tryRestoreOrg: true
                                            });
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                                value: "",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                                                    children: t('Select Company')
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Layout.js",
                                                    lineNumber: 233,
                                                    columnNumber: 36
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Layout.js",
                                                lineNumber: 233,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            (companyList || []).map((comp)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                                    value: comp.companyid,
                                                    children: comp.companyname
                                                }, comp.companyid, false, {
                                                    fileName: "[project]/src/components/Layout.js",
                                                    lineNumber: 235,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/Layout.js",
                                        lineNumber: 219,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Layout.js",
                                    lineNumber: 218,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$FormControl$2f$FormControl$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                    size: "small",
                                    sx: {
                                        minWidth: 150,
                                        mr: 2
                                    },
                                    disabled: !globalCompanyId,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Select$2f$Select$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                        displayEmpty: true,
                                        value: safeOrgValue,
                                        onChange: (e)=>{
                                            setGlobalOrgId(e.target.value);
                                            setLS(ORG_KEY, e.target.value);
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                                value: "",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                                                    children: t('Select Organization')
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Layout.js",
                                                    lineNumber: 251,
                                                    columnNumber: 36
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Layout.js",
                                                lineNumber: 251,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            (organizationList || []).map((org)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                                    value: org.organizationid,
                                                    children: org.organization
                                                }, org.organizationid, false, {
                                                    fileName: "[project]/src/components/Layout.js",
                                                    lineNumber: 253,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/Layout.js",
                                        lineNumber: 243,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Layout.js",
                                    lineNumber: 242,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                    color: "inherit",
                                    onClick: handleLanguageMenuOpen,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$Translate$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                        fileName: "[project]/src/components/Layout.js",
                                        lineNumber: 261,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Layout.js",
                                    lineNumber: 260,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                    variant: "body1",
                                    sx: {
                                        ml: 1
                                    },
                                    children: currentLanguage.toUpperCase()
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Layout.js",
                                    lineNumber: 263,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Menu$2f$Menu$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                    anchorEl: languageAnchor,
                                    open: Boolean(languageAnchor),
                                    onClose: handleLanguageMenuClose,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            onClick: ()=>handleLanguageChange('zh-TW'),
                                            children: "中文 (Chinese)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Layout.js",
                                            lineNumber: 271,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            onClick: ()=>handleLanguageChange('en-US'),
                                            children: "English"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Layout.js",
                                            lineNumber: 272,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            onClick: ()=>handleLanguageChange('ja-JP'),
                                            children: "日本語 (Japanese)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Layout.js",
                                            lineNumber: 273,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Layout.js",
                                    lineNumber: 266,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                    sx: {
                                        display: 'flex',
                                        alignItems: 'center'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            edge: "end",
                                            color: "inherit",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$esm$2f$AccountCircle$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                                fileName: "[project]/src/components/Layout.js",
                                                lineNumber: 278,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Layout.js",
                                            lineNumber: 277,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            variant: "body1",
                                            sx: {
                                                ml: 1
                                            },
                                            children: (profile === null || profile === void 0 ? void 0 : profile.name) || 'User'
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Layout.js",
                                            lineNumber: 280,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Layout.js",
                                    lineNumber: 276,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                    onClick: logout,
                                    variant: "outlined",
                                    color: "primary",
                                    sx: {
                                        ml: 2
                                    },
                                    children: "Logout"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Layout.js",
                                    lineNumber: 285,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Layout.js",
                            lineNumber: 217,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Layout.js",
                    lineNumber: 208,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/components/Layout.js",
                lineNumber: 207,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    minHeight: '100vh'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '180px',
                            backgroundColor: '#0000000D',
                            padding: '20px'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$List$2f$List$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                            children: menuItems.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: item.path,
                                    passHref: true,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$ListItem$2f$ListItem$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                        button: true,
                                        component: "a",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$ListItemText$2f$ListItemText$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            primary: t(item.label),
                                            primaryTypographyProps: {
                                                sx: {
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: 'block'
                                                }
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Layout.js",
                                            lineNumber: 300,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Layout.js",
                                        lineNumber: 299,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, index, false, {
                                    fileName: "[project]/src/components/Layout.js",
                                    lineNumber: 298,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)))
                        }, void 0, false, {
                            fileName: "[project]/src/components/Layout.js",
                            lineNumber: 296,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/components/Layout.js",
                        lineNumber: 295,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            flexGrow: 1,
                            padding: '20px'
                        },
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/src/components/Layout.js",
                        lineNumber: 318,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Layout.js",
                lineNumber: 293,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$Chat$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                user: (profile === null || profile === void 0 ? void 0 : profile.name) || "Guest"
            }, void 0, false, {
                fileName: "[project]/src/components/Layout.js",
                lineNumber: 324,
                columnNumber: 1
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Layout.js",
        lineNumber: 206,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Layout, "G9PeeJcFQo4YOCNyonYxakqsY9Y=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useTranslation"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useGlobalContext"]
    ];
});
_c2 = Layout;
const __TURBOPACK__default__export__ = Layout;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "BubbleChat$dynamic");
__turbopack_context__.k.register(_c1, "BubbleChat");
__turbopack_context__.k.register(_c2, "Layout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/components/theme.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// theme.js
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$createTheme$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__$3c$export__default__as__createTheme$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/styles/createTheme.js [client] (ecmascript) <locals> <export default as createTheme>");
;
const theme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$createTheme$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__$3c$export__default__as__createTheme$3e$__["createTheme"])({
    typography: {
        h1: {
            fontSize: '2.5rem'
        },
        h2: {
            fontSize: '2rem'
        },
        h3: {
            fontSize: '1.75rem'
        },
        h4: {
            fontSize: '1.5rem'
        },
        h5: {
            fontSize: '1.25rem'
        },
        h6: {
            fontSize: '1rem'
        },
        subtitle1: {
            fontSize: '0.875rem'
        },
        subtitle2: {
            fontSize: '0.75rem'
        },
        body1: {
            fontSize: '0.875rem'
        },
        body2: {
            fontSize: '0.75rem'
        }
    }
});
const __TURBOPACK__default__export__ = theme;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/pages/_app.js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Layout$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Layout.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$i18next$2f$dist$2f$esm$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/next-i18next/dist/esm/index.js [client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$i18next$2f$dist$2f$esm$2f$appWithTranslation$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-i18next/dist/esm/appWithTranslation.js [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/i18n.js [client] (ecmascript)"); // Ensure the correct path for i18n configuration
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/AuthContext.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/GlobalContext.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$ThemeProvider$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ThemeProvider$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/styles/ThemeProvider.js [client] (ecmascript) <export default as ThemeProvider>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$CssBaseline$2f$CssBaseline$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/CssBaseline/CssBaseline.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$theme$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/theme.js [client] (ecmascript)"); // Make sure the theme path is correct
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
function AuthRedirect(param) {
    let { children } = param;
    _s();
    const { token, loading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthRedirect.useEffect": ()=>{
            if (!loading) {
                if (!token && router.pathname !== '/login') {
                    // Redirect to login if not authenticated
                    router.push('/login');
                } else if (token && router.pathname === '/') {
                    // Redirect to profile page if authenticated and on the root page
                    router.push('/profile');
                }
            }
        }
    }["AuthRedirect.useEffect"], [
        token,
        loading,
        router
    ]);
    if (loading) {
        // Use a more user-friendly loading indicator, like a spinner
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            },
            children: "Loading..."
        }, void 0, false, {
            fileName: "[project]/src/pages/_app.js",
            lineNumber: 32,
            columnNumber: 7
        }, this);
    }
    return children; // Render children when not loading
}
_s(AuthRedirect, "KHp1rIwM3aPMR6YJu579DDDCw98=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = AuthRedirect;
function MyApp(param) {
    let { Component, pageProps } = param;
    const getLayout = Component.getLayout || ((page)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Layout$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
            children: page
        }, void 0, false, {
            fileName: "[project]/src/pages/_app.js",
            lineNumber: 42,
            columnNumber: 55
        }, this));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["AuthProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GlobalContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["GlobalProvider"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$ThemeProvider$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ThemeProvider$3e$__["ThemeProvider"], {
                theme: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$theme$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$CssBaseline$2f$CssBaseline$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/src/pages/_app.js",
                        lineNumber: 48,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthRedirect, {
                        children: getLayout(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Component, {
                            ...pageProps
                        }, void 0, false, {
                            fileName: "[project]/src/pages/_app.js",
                            lineNumber: 50,
                            columnNumber: 24
                        }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/pages/_app.js",
                        lineNumber: 49,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/_app.js",
                lineNumber: 47,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/pages/_app.js",
            lineNumber: 46,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/pages/_app.js",
        lineNumber: 45,
        columnNumber: 5
    }, this);
}
_c1 = MyApp;
const __TURBOPACK__default__export__ = _c2 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$i18next$2f$dist$2f$esm$2f$appWithTranslation$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["appWithTranslation"])(MyApp);
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "AuthRedirect");
__turbopack_context__.k.register(_c1, "MyApp");
__turbopack_context__.k.register(_c2, "%default%");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/_app.js [client] (ecmascript)\" } [client] (ecmascript)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const PAGE_PATH = "/_app";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/src/pages/_app.js [client] (ecmascript)");
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
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/src/pages/_app\" }": ((__turbopack_context__) => {
"use strict";

var { m: module } = __turbopack_context__;
{
__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/_app.js [client] (ecmascript)\" } [client] (ecmascript)");
}}),
}]);

//# sourceMappingURL=%5Broot-of-the-server%5D__9d9348ec._.js.map