import "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as createServerFn } from "./ssr.mjs";
import { t as createSsrRpc } from "./createSsrRpc-C1p7zOu_.mjs";
import "./client-GruXRyhu.mjs";
import "./use-current-user-CsON5Gdz.mjs";
import "./use-staff-profile-CtJQjgds.mjs";
import "./button-rM46W5TP.mjs";
import "./card-xTYX9pTS.mjs";
import { t as require_lib } from "../_libs/qrcode.mjs";
require_react();
require_jsx_runtime();
require_lib();
createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("81651d552f545c58260a53aa0b7463876284192233f5b62e24f4b6efe55d5655"));
//#endregion
export {};
