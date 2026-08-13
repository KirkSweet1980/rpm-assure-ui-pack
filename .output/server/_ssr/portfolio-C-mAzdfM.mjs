import { n as createServerFn } from "./ssr.mjs";
import { t as createSsrRpc } from "./createSsrRpc-C1p7zOu_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/portfolio-C-mAzdfM.js
var fetchPortfolio = createServerFn({ method: "GET" }).handler(createSsrRpc("c6deb86d8c8bbc3a7406d249b1a1fe5914b060a2380c4ae637e5bf32032ec2ca"));
var fetchCustomerDetail = createServerFn({ method: "GET" }).validator((data) => data).handler(createSsrRpc("725b757130e54f94873c36c1161ce6e3dc1adef88fa98d97cdb88754cf8966d2"));
var fetchDataSourceStatus = createServerFn({ method: "GET" }).handler(createSsrRpc("5bbc4c3aeaa13925fb4356600f3df13cf20606af24141cd6133e3ce90712be55"));
//#endregion
export { fetchDataSourceStatus as n, fetchPortfolio as r, fetchCustomerDetail as t };
