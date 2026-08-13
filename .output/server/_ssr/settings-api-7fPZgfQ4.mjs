import { n as createServerFn } from "./ssr.mjs";
import { t as createSsrRpc } from "./createSsrRpc-C1p7zOu_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-api-7fPZgfQ4.js
var fetchSettingsBundle = createServerFn({ method: "GET" }).handler(createSsrRpc("58e40e28be1c07ac58d2e28371a30a821f8eee26af85658aed6835d1b8dfd720"));
var saveSqlConnections = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("fe5e358b8db02d1858d530fbba60d9d4bf259ff30bcddbbbe67fddb564a4e3b3"));
createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("17344401878010a15e1e05a83873847e42f68bc9cdede376754820b13fd2f6e9"));
var testSqlConnection = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("ff7f93a0a6d214ae1c30719cdc467ba31563d216753b8a7a1e4887dd1b9bb568"));
/** Read-only SQL explorer — SELECT/WITH only, single batch, row cap */
var runSqlQuery = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("84a61ab9e54742c267ae90708648d8e5f3ca5dd7e24f7a195f3827fe9d318595"));
createServerFn({ method: "GET" }).handler(createSsrRpc("e346678ce4d1c40d58acf8eea7d3b838c1ad131a9a09d970365c961365284d8c"));
createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("88d196eac8c27dea565e67c3ec0965562bbbe0f2acecfbae6e99322411df66fe"));
createServerFn({ method: "POST" }).handler(createSsrRpc("e4cc34ac404a923705a2775cef64d4276288ad274bee1364c5094ba929d36a82"));
createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("79a2f398972f9fc5229e18ad025181a7f611977f75b6a160e5a101639f233488"));
createServerFn({ method: "POST" }).validator((data) => data ?? {}).handler(createSsrRpc("b7a147e4c65eabaefa08f85aa80915d8557bd049e0696f870ec57558bf152be3"));
createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("c14a8b9e79c11b299abada98d12ca72db22a5056be37f01c24f779edfbb27c85"));
createServerFn({ method: "POST" }).validator((data) => data ?? {}).handler(createSsrRpc("d17ce60656ef8bfaafd6707ece0cecf55d0784ce568277b2f71adba743a6a49b"));
var saveRagSettings = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("5129309f413cade2ca14df47a702fd6f1a9bc8debd22e51a5ed7b67bda140274"));
var saveAlertSettings = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("b4d203b2fa3ac8338846f581680fef535ab66a3359fa93bac7e96b421415fd65"));
var saveDashboardSettings = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("a792fdbf518dfb39d042af6c2e06d95556058ae88e2701c21ca61a1e147e8c08"));
var fetchCollectInventory = createServerFn({ method: "GET" }).handler(createSsrRpc("d0b916ca8f2beb5e5c66fe496b269dba185de3390d2551fd0c93951d56a98a65"));
var fetchIntegrations = createServerFn({ method: "GET" }).handler(createSsrRpc("e16a9519b068f1e7954c5c132801bc0d54b097934604e5227709d20163057750"));
var fetchAdminAuditLog = createServerFn({ method: "GET" }).validator((data) => data ?? {}).handler(createSsrRpc("110aea48c5df815dcbda5d038773a6408884ddcad335d7d22d72c74f6006ea72"));
var runAlertEvaluation = createServerFn({ method: "POST" }).validator((data) => data ?? {}).handler(createSsrRpc("2aab97066ef504973d547689e958380723abccf4ef4c8b8c4305231f7cfdacb2"));
var suggestRagFromLive = createServerFn({ method: "GET" }).handler(createSsrRpc("f4811077a5f8b39f5077d8c08efaf437715743aff9b70c3e9572e9731518679f"));
var fetchSslSettings = createServerFn({ method: "GET" }).handler(createSsrRpc("a5e9c80bea74a7ec5f71ec7794f4f521a4cada5e8b8fe0de27e98407f20fedf9"));
var saveSslSettings = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("dfebb239d6cb138f5a945fae2dd86e91a7378e7b2c26229ff59654d828ba12dd"));
var uploadSslCertificate = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("d6f34dc33ee2f81f5bb38b9598a73083a18185362058f2c69dea388d62658ccb"));
var applySslConfig = createServerFn({ method: "POST" }).validator((data) => data ?? {}).handler(createSsrRpc("04752fdc659b0c75b82b53ef09f6d1cb696a174d21b14d84c4739d8ca260e85a"));
var clearSslCertificate = createServerFn({ method: "POST" }).handler(createSsrRpc("304b4eec83c664de6f0c6d25b64b1bba8aa555f698b1ff06f9ac99b9cd151c6a"));
//#endregion
export { uploadSslCertificate as _, fetchIntegrations as a, runAlertEvaluation as c, saveDashboardSettings as d, saveRagSettings as f, testSqlConnection as g, suggestRagFromLive as h, fetchCollectInventory as i, runSqlQuery as l, saveSslSettings as m, clearSslCertificate as n, fetchSettingsBundle as o, saveSqlConnections as p, fetchAdminAuditLog as r, fetchSslSettings as s, applySslConfig as t, saveAlertSettings as u };
