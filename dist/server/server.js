import { AsyncLocalStorage } from "node:async_hooks";
import { H3Event, toResponse, getRequestIP } from "h3-v2";
import { rootRouteId, parseRedirect, isRedirect, defaultSerovalPlugins, makeSerovalPlugin, createRawStreamRPCPlugin, invariant, isNotFound, resolveManifestAssetLink, createSerializationAdapter, isResolvedRedirect, executeRewriteInput } from "@tanstack/router-core";
import { toCrossJSONStream, fromJSON, toCrossJSONAsync } from "seroval";
import { createMemoryHistory } from "@tanstack/history";
import { mergeHeaders } from "@tanstack/router-core/ssr/client";
import { getNormalizedURL, getOrigin, attachRouterServerSsrUtils } from "@tanstack/router-core/ssr/server";
import "react";
import { RouterProvider } from "@tanstack/react-router";
import { jsx } from "react/jsx-runtime";
import { defineHandlerCallback, renderRouterToStream } from "@tanstack/react-router/ssr/server";
function StartServer(props) {
  return /* @__PURE__ */ jsx(RouterProvider, { router: props.router });
}
var defaultStreamHandler = defineHandlerCallback(({ request, router, responseHeaders }) => renderRouterToStream({
  request,
  router,
  responseHeaders,
  children: /* @__PURE__ */ jsx(StartServer, { router })
}));
var GLOBAL_EVENT_STORAGE_KEY = /* @__PURE__ */ Symbol.for("tanstack-start:event-storage");
var globalObj$1 = globalThis;
if (!globalObj$1[GLOBAL_EVENT_STORAGE_KEY]) globalObj$1[GLOBAL_EVENT_STORAGE_KEY] = new AsyncLocalStorage();
var eventStorage = globalObj$1[GLOBAL_EVENT_STORAGE_KEY];
function isPromiseLike(value) {
  return typeof value.then === "function";
}
function getSetCookieValues(headers) {
  const headersWithSetCookie = headers;
  if (typeof headersWithSetCookie.getSetCookie === "function") return headersWithSetCookie.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}
function mergeEventResponseHeaders(response, event) {
  if (response.ok) return;
  const eventSetCookies = getSetCookieValues(event.res.headers);
  if (eventSetCookies.length === 0) return;
  const responseSetCookies = getSetCookieValues(response.headers);
  response.headers.delete("set-cookie");
  for (const cookie of responseSetCookies) response.headers.append("set-cookie", cookie);
  for (const cookie of eventSetCookies) response.headers.append("set-cookie", cookie);
}
function attachResponseHeaders(value, event) {
  if (isPromiseLike(value)) return value.then((resolved) => {
    if (resolved instanceof Response) mergeEventResponseHeaders(resolved, event);
    return resolved;
  });
  if (value instanceof Response) mergeEventResponseHeaders(value, event);
  return value;
}
function requestHandler(handler) {
  return (request, requestOpts) => {
    let h3Event;
    try {
      h3Event = new H3Event(request);
    } catch (error) {
      if (error instanceof URIError) return new Response(null, {
        status: 400,
        statusText: "Bad Request"
      });
      throw error;
    }
    return toResponse(attachResponseHeaders(eventStorage.run({ h3Event }, () => handler(request, requestOpts)), h3Event), h3Event);
  };
}
function getH3Event() {
  const event = eventStorage.getStore();
  if (!event) throw new Error(`No StartEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`);
  return event.h3Event;
}
function getRequestIP$1(opts) {
  return getRequestIP(getH3Event(), opts);
}
function getResponse() {
  return getH3Event().res;
}
var HEADERS = { TSS_SHELL: "X-TSS_SHELL" };
async function getStartManifest(matchedRoutes) {
  const { tsrStartManifest } = await import("./assets/_tanstack-start-manifest_v-DhpGlJMB.js");
  const startManifest = tsrStartManifest();
  const rootRoute = startManifest.routes[rootRouteId] = startManifest.routes[rootRouteId] || {};
  rootRoute.assets = rootRoute.assets || [];
  let injectedHeadScripts;
  return {
    manifest: { routes: Object.fromEntries(Object.entries(startManifest.routes).flatMap(([k, v]) => {
      const result = {};
      let hasData = false;
      if (v.preloads && v.preloads.length > 0) {
        result["preloads"] = v.preloads;
        hasData = true;
      }
      if (v.assets && v.assets.length > 0) {
        result["assets"] = v.assets;
        hasData = true;
      }
      if (!hasData) return [];
      return [[k, result]];
    })) },
    clientEntry: startManifest.clientEntry,
    injectedHeadScripts
  };
}
const manifest = {
  "2bfeee87903e4e8c0006779de0f385348ee7c23394b757226d4e2949ff07d10f": {
    functionName: "loadSeoConfig_createServerFn_handler",
    importer: () => import("./assets/publishServer-CeMBoFeu.js")
  },
  "0d234e9817436d2c7e29533f66d1f8bb236ed72efa7698abe81b73752341abea": {
    functionName: "loadHomepageConfig_createServerFn_handler",
    importer: () => import("./assets/publishServer-CeMBoFeu.js")
  },
  "725df7688608b79fe1bd4fff76b6c8d0b2da6ad706eeec1260d441037cac73bc": {
    functionName: "savePublishConfig_createServerFn_handler",
    importer: () => import("./assets/publishServer-CeMBoFeu.js")
  },
  "ee79ca67965882c0929be3f4752c7831e75750a551a84c064a4ba51a5d06092d": {
    functionName: "generateSitemap_createServerFn_handler",
    importer: () => import("./assets/publishServer-CeMBoFeu.js")
  },
  "827c1a948924faac9d80bc809fdba6fbae032472e37d1f7fe48fbf921572c693": {
    functionName: "saveRobotsTxt_createServerFn_handler",
    importer: () => import("./assets/publishServer-CeMBoFeu.js")
  },
  "6cdff83579d1b6c871daa33e3f58529ce74f5af2895d96f6c612518adfe4a5c2": {
    functionName: "loadRobotsTxt_createServerFn_handler",
    importer: () => import("./assets/publishServer-CeMBoFeu.js")
  },
  "46d26c3385af9d72b60d4c04783b28da24f314c21a0e771be32feca4da21ba2b": {
    functionName: "loadSitemapXml_createServerFn_handler",
    importer: () => import("./assets/publishServer-CeMBoFeu.js")
  },
  "fb2978d20fe1134bdea5fda77c3454ab7fe06d6f8f25ce5810087b934cbf6d9d": {
    functionName: "loadAllData_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "122baba04c16401cfafde375ba7ad6643336700c3ea9139163e16817a4f8ac87": {
    functionName: "flushStoresToDisk_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "0f21d5fdd8f8b02ab92db2f5563ffd9b0553c088bf6063ab1d5342805db5aa83": {
    functionName: "fetchRepoStatus_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "f091b0a50c4636f6d4743812dc2225adc39a83cc84df7f264588bcf750d92a5b": {
    functionName: "validateAllData_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "d84fa3675279ea0e17dad40462b2750bb2e4b616c1839fd9e9bb25478a5244e2": {
    functionName: "checkGitHubConnection_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "0968b9e500194cfc5a1fddeda76061dfcfe12f83a9d08509cdd9df86c7aca7c9": {
    functionName: "getTokenInfo_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "2abf3e9a8c1b7b7a11f8de5823636e8c40964237c69abf25ad72f518545fdcdd": {
    functionName: "testGitHubToken_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "1f7579febd4fab86592a3e93539f3f565f9671b1c540b25d737c8e8bff462a95": {
    functionName: "saveGitHubToken_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "10ecc1d9c6f957038b8e29917d4a89402354e0da002cf941902f2aaad6df7a58": {
    functionName: "clearGitHubToken_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "73ea4a3c38df80c388f7c8b4ef3cad8833eefa1ea9accb2cd6242733cab06d2f": {
    functionName: "fetchCommitHistory_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "791f5fb5291d52d6022c2fdeba15d0eb794ed38b4d702cfc3068a4ed7403776c": {
    functionName: "restoreToCommit_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "336f16e34d562f78275aa7a3cc022fe8ca0edac416f1900768a9c6ffb285a4af": {
    functionName: "getGitDiagnostics_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "caaa9e2b5c5ad43cde33788c51c45fa7f3c1baa017e74bc1d8e096b2dd152807": {
    functionName: "fixGitDivergence_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "d100192c84dbdf2c323ec92fe16f12f83d269027f1a297e59ca03eef4c8e8d09": {
    functionName: "backupMiningData_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "2e6f0c521503f8024b01a97c2dd6e90b2082c3432492d548bb47ca64a739e11c": {
    functionName: "fetchSyncHistory_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "ab83cb7f457836d6f74c694d5cfeadda8b1f3d4efb517cdda82dc99dd72f810d": {
    functionName: "addSyncHistoryEntry_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "56cb769110f118349cdf266ed2c7834cb8154bfed52328cd3c8ed51d80b5ab91": {
    functionName: "compareLocalToRemote_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "e821b6439e82f7d8bfbe6b1b0d983c1f3e9be135a8c03517106cd7d1e6087322": {
    functionName: "pullRemoteFiles_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "0a0026775ec41c07ff6fce56a504939f56b9fff933b5e8375d7e1697dbb34629": {
    functionName: "previewRepairPlayers_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "20254cac3591853b5c6524a2d69bd49a61d924ce0dff10ed2eb00eafd3a0e653": {
    functionName: "repairPlayers_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "de6707771acf05f33f3f80de52b00b542ba882a03e38764710467ce74988f0e7": {
    functionName: "adminLoadUsers_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "c58b9d75bcc21687bdb01aa8732acbf31ba9ba509383e0b562d75dd5664ce9f3": {
    functionName: "adminCreateUser_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "6d81718f1d6afbe57ef5e2a5807d8f527818d2b133218776c76788af33e21e3a": {
    functionName: "adminUpdateUserPlayer_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "1e2c7ac3337193608c8b38cf66939454d885804b0cc0371e0dbe7f26e4c25c3d": {
    functionName: "adminUpdateUserCred_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "9a7797558969ec6ab39b9a0a106453ff24fd40e5d8dfb39d46da89655e270655": {
    functionName: "adminUpdateUserMining_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "a3482b5d0e0b8bbb058a12f6893630a221cea2ebe0c186f48ef2b6917f1280fd": {
    functionName: "adminCreateMiningForPlayer_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "36c54b2f321d22e3b47f5348ed255687dce04bd1f85a6b0eefe85e5c44a93110": {
    functionName: "adminRenameMiningUser_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "8b1f9c1b45467a38c696fe005b4d5b65163dc553d2104f6804f0494aa848fdbf": {
    functionName: "adminDeleteUser_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "fd27b53ba645f057b63ba6c3fc845d86f9fc2e67ee93bfe4e2467486c46afc01": {
    functionName: "adminBulkDeleteUsers_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "8a8b336fe65eb1a2e8629b73f2badc985dd6ab823a0e411b3e9c3d6120c51a0f": {
    functionName: "getBackupStatusFn_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "ea6082cc957e00016cbedcb2b7376e9e76f2cdc47857ea2b79a07a6f695a1a9e": {
    functionName: "setAutoBackupEnabled_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "2deb2e018fcfe19b7588e8378bbb22d97eeae36e030c9b7892bfd951502a31a3": {
    functionName: "setBackupDebounce_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "2e5a86306780c713e09960b6674d29e921669e575d347e82484fd839a21fa174": {
    functionName: "triggerBackupNow_createServerFn_handler",
    importer: () => import("./assets/dataFiles-BimNO10n.js")
  },
  "9f3c31e88fa1dee173ea06b9582248fd7ee4180a9a0b7963633607284a9e0d9f": {
    functionName: "getTournamentData_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "dbced905a634ef7c5bb2a83b2634a776cca737f979e54211edd66306e2568768": {
    functionName: "createTournament_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "121f9159a4d0e4bfcabdfc34526c81d2267baf979f42ff893cc77d96685c5450": {
    functionName: "updateTournament_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "bc8e2f55893ff25b7a20ffb276b5353f2f509f03e7951ad10b9ac3a760e7067f": {
    functionName: "deleteTournament_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "8bde410c414b4bdd05289d750f4a36586b78a106a52e17079ca6db8772ff081e": {
    functionName: "setActiveTournament_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "cfef4f6f62c7ffd16bec0f981079bd01e4e58a67cf057297a6d296085a12dc3b": {
    functionName: "archiveTournament_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "0945cb194bd5b5e925113942c2b7d3ed8fae8117a84c35d407c21835be8da21d": {
    functionName: "registerTeam_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "f9e96b9a78bbbfcc1a4ed07f2eba5da3f735e1b70a2d1ea221b4c58dbdb3797c": {
    functionName: "updateTeamStatus_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "1a36faa8c7def6c71b5dad9a54f35ad328430bc15d8e4aca601503882a15687b": {
    functionName: "editTeam_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "afda6fd326aea53beacfb00c64a2b9bdc14a7bb746d3e4f80be750669e2d99f8": {
    functionName: "removeTeam_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "c646772e903b0407b4dcf204f01727e0e0397269ed3db5dccfcff50d62fccea1": {
    functionName: "generateBracket_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "ec7de07a550e8200978e62a7ce4ad1ce08e46d47ff16a43af5b8c9d15545d2e6": {
    functionName: "updateBracketSlot_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "d075749bf4618bcaacc0b4ac11770dc6eb95dbfda90f3452bbdff782e2d04b0c": {
    functionName: "updateMatch_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "4e7af7ac57eea41a6b1e106318978ab1f1892e6fd452adcd0e9bf904835f9191": {
    functionName: "updatePrizes_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "01ea8263bb9459ad19b5cf0ab1ddad64bc72d0c40bfd096d921c5fd5193acb85": {
    functionName: "updateRules_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "a8a8e23241efb177deb2aba1bf9731779101003bcbbbb7eb9b128aa87053603d": {
    functionName: "addAnnouncement_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "1c5e5efbd37fd52be1153577b0bc84b56e1aadeaaa601d4f3595b4959d434c11": {
    functionName: "deleteAnnouncement_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "46b286e4121041827fc40d3932de1ba673080275db62fb867e894f445293b167": {
    functionName: "addTeamManually_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "253cfb485fcf38e4b64688a9536fa7551fe3288c55ccf22c137d68f2a7ab25de": {
    functionName: "bulkUpdateTeamStatus_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "456bc51f6eac31f5f053da10c44d76ebf164ee4d1f2aa17e88b8fa4a1a837a9f": {
    functionName: "updateBracketDisplay_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "446a7969c758ce6a016dbd6cd9017c550127a4cec446e100a8dc380f723ebc00": {
    functionName: "duplicateTournament_createServerFn_handler",
    importer: () => import("./assets/tournamentServer-DWyzOkul.js")
  },
  "1cd5592b008228410e370e8fdc87f51b9cbd66cb105cb8bbc964ab8ddb0ce73d": {
    functionName: "validateAdminCredentials_createServerFn_handler",
    importer: () => import("./assets/adminAuth-BctiYdmc.js")
  },
  "b2b86fe6fd8b463e98d6022be0964a22100e08fd0fa5abddcd5b4d4a2073f07b": {
    functionName: "updateAdminCredentials_createServerFn_handler",
    importer: () => import("./assets/adminAuth-BctiYdmc.js")
  },
  "8f49f79f5fe4a79ccddd2d4dd7efef06292b39379b7852b6f90ae7e540a52fee": {
    functionName: "getAdminInfo_createServerFn_handler",
    importer: () => import("./assets/adminAuth-BctiYdmc.js")
  },
  "582bae66d7219feca5ea4c219bd137246a4185778085ad86bee663fa90efcf28": {
    functionName: "getAdminRateLimitStatus_createServerFn_handler",
    importer: () => import("./assets/adminAuth-BctiYdmc.js")
  },
  "5c143bedfa44b6fe18afd1d9304214d0d1f8ad09af7bd391cc59c10d3e063669": {
    functionName: "getSecuritySettings_createServerFn_handler",
    importer: () => import("./assets/adminAuth-BctiYdmc.js")
  },
  "ea0bbd2a4a7952e60896601906054e383855e4526e3770615fef1a49e29515fe": {
    functionName: "updateSecuritySettings_createServerFn_handler",
    importer: () => import("./assets/adminAuth-BctiYdmc.js")
  },
  "53c321d975df4a591bbd4a2e7e8381e368580bccea0f3accc62ac1e31636fb4e": {
    functionName: "checkAdminToken_createServerFn_handler",
    importer: () => import("./assets/adminAuth-BctiYdmc.js")
  },
  "95844de006e2c9e2d7e983992605c64a3bd53c2c2493a031f1201548f14295ca": {
    functionName: "recordPageView_createServerFn_handler",
    importer: () => import("./assets/growthServer-C4qetAod.js")
  },
  "23540e98c4b6ee3b45af87467ac670e6c58fe789d85b5a414633bff74fdfe852": {
    functionName: "heartbeatSession_createServerFn_handler",
    importer: () => import("./assets/growthServer-C4qetAod.js")
  },
  "ac8e1029c9877c230f6e80aedc0bb5bb727246e5f9989f4b559a55dccfe8a0ad": {
    functionName: "getGrowthStats_createServerFn_handler",
    importer: () => import("./assets/growthServer-C4qetAod.js")
  },
  "9c403a0b1baaa9eb01522526a02467b0bbe7366ce94755351c706515263f9ab1": {
    functionName: "getServerNow_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "ccdb6274a919b4e64faac8870a35fdd9f2379e43902fbc073e763702f8e0edb1": {
    functionName: "serverCatchUp_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "8de7a5ffa64cbe7de66496bd09cd405c8c5bbd016fc0db22792f19363f0ae2c2": {
    functionName: "saveMiningUser_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "14b07c567f9b8c57ebeb2b5013958353bbec125f63a72006a299b990f8a3e5cc": {
    functionName: "purchaseRigServer_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "c20eeae52f63782258860f6bf9cdedb36bd505958dfd8199abe8bbed955e893c": {
    functionName: "getDashboardStats_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "450e0a26a740dcd825927e9bc6d268f76e8a10fd98c7ba9b681fe818d0b5015b": {
    functionName: "getAllMiningUsers_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "8e3d970b0a3780ca5ee670f87b0ba84cb45748760c3b1b1be58131158580b660": {
    functionName: "adminUpdateMiningUser_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "7fa8b3cbd5fc8f402a586f9817e3556e666bae0870bfdf16a35ee35117771bb1": {
    functionName: "getLeaderboard_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "2a08d77084734e5724f0b7c889d954a908a3bb05d5c0b96eecc2c94776f3daa7": {
    functionName: "adminDeleteMiningUser_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "6628a45ae47f2a27610f23af9286c0955b21bcb8e8625b097bfda5976b23544c": {
    functionName: "renewMiningSession_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "5fed49ccff1da12a3cf2c454c8f9abb2c8689d155564610245c1506d3223ee3c": {
    functionName: "adminRenewMining_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "2aaed4fef1df9d23420ad780edcf7203ac4c445653015df9af9b0178f0277ddc": {
    functionName: "adminAdjustRenewal_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "b1882853617708282b340efc40fa7c2fcb1a1b9291b064abb9d264fe8108c8e0": {
    functionName: "getMiningAccessConfig_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "969c202e4a472980b0f4181e8627c80dac3f0e7c33e0fb14b22edc02324dd4b9": {
    functionName: "saveMiningAccessConfig_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "8d5f143a680dcec8b626745cb47685992d8086e2e59ff3b07c97174e40abdbd4": {
    functionName: "adminResetRenewal_createServerFn_handler",
    importer: () => import("./assets/miningServer-BBsWCjSc.js")
  },
  "8ebbe34d9c3cf8d74d5c419c61649060ec2211be4f88f412177da3ea729967ce": {
    functionName: "validateCredentials_createServerFn_handler",
    importer: () => import("./assets/auth-7I7WVozf.js")
  },
  "62bb95e491f70187696af701a08661091cd73ae081ddd6e137bc93b3795769bd": {
    functionName: "getShopItems_createServerFn_handler",
    importer: () => import("./assets/shopServer-vzLTHB0X.js")
  },
  "ec026d36d4ffcb51ac6d6e7a02f5d1118db749d23ae9d41aa9e810d1e639d6d0": {
    functionName: "purchaseItem_createServerFn_handler",
    importer: () => import("./assets/shopServer-vzLTHB0X.js")
  },
  "59b03fa8204d5c21025a37a43302a6d23470656a41f93cc4c007688c5327b67b": {
    functionName: "getMyPurchases_createServerFn_handler",
    importer: () => import("./assets/shopServer-vzLTHB0X.js")
  },
  "69f2ce1e7c6571bdd7a19ee26738a2ae2fbba51ad19bdf612c2529bf7a56c68f": {
    functionName: "adminGetAllPurchases_createServerFn_handler",
    importer: () => import("./assets/shopServer-vzLTHB0X.js")
  },
  "53ec1b36518c94a244d87a9692c1b6cb1944d6a5eff3b7b69e7216d04b7c5883": {
    functionName: "adminUpdatePurchase_createServerFn_handler",
    importer: () => import("./assets/shopServer-vzLTHB0X.js")
  },
  "ff23368b6f4fcee6548aab800aec16a97e7734b0dc8d2714034e5b260202fe56": {
    functionName: "adminGetShopItems_createServerFn_handler",
    importer: () => import("./assets/shopServer-vzLTHB0X.js")
  },
  "f9be758d9b42678d51decbe54fe1fd07045e4803ea4ce96286e8884d8315aec0": {
    functionName: "adminUpdateShopItem_createServerFn_handler",
    importer: () => import("./assets/shopServer-vzLTHB0X.js")
  },
  "635af3f2c52461751a47a6e7f5805fb8fb68776cedf3e6be49ddea69249f08a5": {
    functionName: "adminAddShopItem_createServerFn_handler",
    importer: () => import("./assets/shopServer-vzLTHB0X.js")
  },
  "3be3696d67cafcd1287434777f69c2da8eaf6a606c0dc566e20e220c1794c05f": {
    functionName: "adminDeleteShopItem_createServerFn_handler",
    importer: () => import("./assets/shopServer-vzLTHB0X.js")
  },
  "379bd47bb2ec7133dfe6837534062a9ac9f2fe7576ce4a638ebe43f05546b4ff": {
    functionName: "adminGetShopStats_createServerFn_handler",
    importer: () => import("./assets/shopServer-vzLTHB0X.js")
  },
  "bda408528402cc40c10ebae8493c87594338b18499c43e313ba941d2dbe69a11": {
    functionName: "getAdsConfig_createServerFn_handler",
    importer: () => import("./assets/earningsServer-rWDZ6ymZ.js")
  },
  "ac20a71becbdda8d50045e7cd69812d4b36660e495aa3e5565c52bee80ce1c2c": {
    functionName: "saveAdsConfig_createServerFn_handler",
    importer: () => import("./assets/earningsServer-rWDZ6ymZ.js")
  },
  "b0c00df0a524fbcbcb6649f9d21d35dfc5c5a86052acdf811868ad7ef65bca01": {
    functionName: "trackAdEvent_createServerFn_handler",
    importer: () => import("./assets/earningsServer-rWDZ6ymZ.js")
  },
  "4686f50ccdd8c60ab286dab4566eb7e066b6d3b40524984dd33539e3367c0731": {
    functionName: "resetAdsStats_createServerFn_handler",
    importer: () => import("./assets/earningsServer-rWDZ6ymZ.js")
  },
  "12e6c496b1979f52eba7acbe480303b046baf912f403dbadfebc89909068cf38": {
    functionName: "resetAbTestStats_createServerFn_handler",
    importer: () => import("./assets/earningsServer-rWDZ6ymZ.js")
  },
  "980d3172af72490d422146cc9600d8514eb552afb1145e580053adbf108d5921": {
    functionName: "trackAffiliateClick_createServerFn_handler",
    importer: () => import("./assets/earningsServer-rWDZ6ymZ.js")
  },
  "219ae3114e4607a45fea223c75104d53c4de8791d58d9d06662d94490676a3b2": {
    functionName: "addPayoutRecord_createServerFn_handler",
    importer: () => import("./assets/earningsServer-rWDZ6ymZ.js")
  },
  "70ee23244a1cf7dcbbb4c2b3d194f1c659076ba93fded5d65385deab0c9c3d0a": {
    functionName: "exportEarningsData_createServerFn_handler",
    importer: () => import("./assets/earningsServer-rWDZ6ymZ.js")
  },
  "c6db069f27f7f8f7aa788b0f630ee3e9cdc9b10047ec1783d1514b41bdd96316": {
    functionName: "getRepoInfo_createServerFn_handler",
    importer: () => import("./assets/repoHistory-DqFLS1A-.js")
  },
  "e55b1235fdf46314858d060881339fac7151dce5d684eb9dbf8f96d7646daaab": {
    functionName: "createBackupBranch_createServerFn_handler",
    importer: () => import("./assets/repoHistory-DqFLS1A-.js")
  },
  "33c01341ce43cf38613dc6607b963376084f7df1160b49db15f8398db1d1b1d5": {
    functionName: "performHistoryReset_createServerFn_handler",
    importer: () => import("./assets/repoHistory-DqFLS1A-.js")
  }
};
async function getServerFnById(id, access) {
  const serverFnInfo = manifest[id];
  if (!serverFnInfo) {
    throw new Error("Server function info not found for " + id);
  }
  const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
  if (!fnModule) {
    throw new Error("Server function module not resolved for " + id);
  }
  const action = fnModule[serverFnInfo.functionName];
  if (!action) {
    throw new Error("Server function module export not resolved for serverFn ID: " + id);
  }
  return action;
}
var TSS_FORMDATA_CONTEXT = "__TSS_CONTEXT";
var TSS_SERVER_FUNCTION = /* @__PURE__ */ Symbol.for("TSS_SERVER_FUNCTION");
var TSS_SERVER_FUNCTION_FACTORY = /* @__PURE__ */ Symbol.for("TSS_SERVER_FUNCTION_FACTORY");
var X_TSS_SERIALIZED = "x-tss-serialized";
var X_TSS_RAW_RESPONSE = "x-tss-raw";
var TSS_CONTENT_TYPE_FRAMED = "application/x-tss-framed";
var FrameType = {
  JSON: 0,
  CHUNK: 1,
  END: 2,
  ERROR: 3
};
var FRAME_HEADER_SIZE = 9;
var TSS_CONTENT_TYPE_FRAMED_VERSIONED = `${TSS_CONTENT_TYPE_FRAMED}; v=1`;
function isSafeKey(key) {
  return key !== "__proto__" && key !== "constructor" && key !== "prototype";
}
function safeObjectMerge(target, source) {
  const result = /* @__PURE__ */ Object.create(null);
  if (target) {
    for (const key of Object.keys(target)) if (isSafeKey(key)) result[key] = target[key];
  }
  if (source && typeof source === "object") {
    for (const key of Object.keys(source)) if (isSafeKey(key)) result[key] = source[key];
  }
  return result;
}
function createNullProtoObject(source) {
  if (!source) return /* @__PURE__ */ Object.create(null);
  const obj = /* @__PURE__ */ Object.create(null);
  for (const key of Object.keys(source)) if (isSafeKey(key)) obj[key] = source[key];
  return obj;
}
var GLOBAL_STORAGE_KEY = /* @__PURE__ */ Symbol.for("tanstack-start:start-storage-context");
var globalObj = globalThis;
if (!globalObj[GLOBAL_STORAGE_KEY]) globalObj[GLOBAL_STORAGE_KEY] = new AsyncLocalStorage();
var startStorage = globalObj[GLOBAL_STORAGE_KEY];
async function runWithStartContext(context, fn) {
  return startStorage.run(context, fn);
}
function getStartContext(opts) {
  const context = startStorage.getStore();
  if (!context && opts?.throwIfNotFound !== false) throw new Error(`No Start context found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`);
  return context;
}
var getStartOptions = () => getStartContext().startOptions;
var getStartContextServerOnly = getStartContext;
var createServerFn = (options, __opts) => {
  const resolvedOptions = __opts || options || {};
  if (typeof resolvedOptions.method === "undefined") resolvedOptions.method = "GET";
  const res = {
    options: resolvedOptions,
    middleware: (middleware) => {
      const newMiddleware = [...resolvedOptions.middleware || []];
      middleware.map((m) => {
        if (TSS_SERVER_FUNCTION_FACTORY in m) {
          if (m.options.middleware) newMiddleware.push(...m.options.middleware);
        } else newMiddleware.push(m);
      });
      const res2 = createServerFn(void 0, {
        ...resolvedOptions,
        middleware: newMiddleware
      });
      res2[TSS_SERVER_FUNCTION_FACTORY] = true;
      return res2;
    },
    inputValidator: (inputValidator) => {
      return createServerFn(void 0, {
        ...resolvedOptions,
        inputValidator
      });
    },
    handler: (...args) => {
      const [extractedFn, serverFn] = args;
      const newOptions = {
        ...resolvedOptions,
        extractedFn,
        serverFn
      };
      const resolvedMiddleware = [...newOptions.middleware || [], serverFnBaseToMiddleware(newOptions)];
      extractedFn.method = resolvedOptions.method;
      return Object.assign(async (opts) => {
        const result = await executeMiddleware$1(resolvedMiddleware, "client", {
          ...extractedFn,
          ...newOptions,
          data: opts?.data,
          headers: opts?.headers,
          signal: opts?.signal,
          fetch: opts?.fetch,
          context: createNullProtoObject()
        });
        const redirect = parseRedirect(result.error);
        if (redirect) throw redirect;
        if (result.error) throw result.error;
        return result.result;
      }, {
        ...extractedFn,
        method: resolvedOptions.method,
        __executeServer: async (opts) => {
          const startContext = getStartContextServerOnly();
          const serverContextAfterGlobalMiddlewares = startContext.contextAfterGlobalMiddlewares;
          return await executeMiddleware$1(resolvedMiddleware, "server", {
            ...extractedFn,
            ...opts,
            serverFnMeta: extractedFn.serverFnMeta,
            context: safeObjectMerge(opts.context, serverContextAfterGlobalMiddlewares),
            request: startContext.request
          }).then((d) => ({
            result: d.result,
            error: d.error,
            context: d.sendContext
          }));
        }
      });
    }
  };
  const fun = (options2) => {
    return createServerFn(void 0, {
      ...resolvedOptions,
      ...options2
    });
  };
  return Object.assign(fun, res);
};
async function executeMiddleware$1(middlewares, env, opts) {
  let flattenedMiddlewares = flattenMiddlewares([...getStartOptions()?.functionMiddleware || [], ...middlewares]);
  if (env === "server") {
    const startContext = getStartContextServerOnly({ throwIfNotFound: false });
    if (startContext?.executedRequestMiddlewares) flattenedMiddlewares = flattenedMiddlewares.filter((m) => !startContext.executedRequestMiddlewares.has(m));
  }
  const callNextMiddleware = async (ctx) => {
    const nextMiddleware = flattenedMiddlewares.shift();
    if (!nextMiddleware) return ctx;
    try {
      if ("inputValidator" in nextMiddleware.options && nextMiddleware.options.inputValidator && env === "server") ctx.data = await execValidator(nextMiddleware.options.inputValidator, ctx.data);
      let middlewareFn = void 0;
      if (env === "client") {
        if ("client" in nextMiddleware.options) middlewareFn = nextMiddleware.options.client;
      } else if ("server" in nextMiddleware.options) middlewareFn = nextMiddleware.options.server;
      if (middlewareFn) {
        const userNext = async (userCtx = {}) => {
          const result2 = await callNextMiddleware({
            ...ctx,
            ...userCtx,
            context: safeObjectMerge(ctx.context, userCtx.context),
            sendContext: safeObjectMerge(ctx.sendContext, userCtx.sendContext),
            headers: mergeHeaders(ctx.headers, userCtx.headers),
            _callSiteFetch: ctx._callSiteFetch,
            fetch: ctx._callSiteFetch ?? userCtx.fetch ?? ctx.fetch,
            result: userCtx.result !== void 0 ? userCtx.result : userCtx instanceof Response ? userCtx : ctx.result,
            error: userCtx.error ?? ctx.error
          });
          if (result2.error) throw result2.error;
          return result2;
        };
        const result = await middlewareFn({
          ...ctx,
          next: userNext
        });
        if (isRedirect(result)) return {
          ...ctx,
          error: result
        };
        if (result instanceof Response) return {
          ...ctx,
          result
        };
        if (!result) throw new Error("User middleware returned undefined. You must call next() or return a result in your middlewares.");
        return result;
      }
      return callNextMiddleware(ctx);
    } catch (error) {
      return {
        ...ctx,
        error
      };
    }
  };
  return callNextMiddleware({
    ...opts,
    headers: opts.headers || {},
    sendContext: opts.sendContext || {},
    context: opts.context || createNullProtoObject(),
    _callSiteFetch: opts.fetch
  });
}
function flattenMiddlewares(middlewares, maxDepth = 100) {
  const seen = /* @__PURE__ */ new Set();
  const flattened = [];
  const recurse = (middleware, depth) => {
    if (depth > maxDepth) throw new Error(`Middleware nesting depth exceeded maximum of ${maxDepth}. Check for circular references.`);
    middleware.forEach((m) => {
      if (m.options.middleware) recurse(m.options.middleware, depth + 1);
      if (!seen.has(m)) {
        seen.add(m);
        flattened.push(m);
      }
    });
  };
  recurse(middlewares, 0);
  return flattened;
}
async function execValidator(validator, input) {
  if (validator == null) return {};
  if ("~standard" in validator) {
    const result = await validator["~standard"].validate(input);
    if (result.issues) throw new Error(JSON.stringify(result.issues, void 0, 2));
    return result.value;
  }
  if ("parse" in validator) return validator.parse(input);
  if (typeof validator === "function") return validator(input);
  throw new Error("Invalid validator type!");
}
function serverFnBaseToMiddleware(options) {
  return {
    "~types": void 0,
    options: {
      inputValidator: options.inputValidator,
      client: async ({ next, sendContext, fetch: fetch2, ...ctx }) => {
        const payload = {
          ...ctx,
          context: sendContext,
          fetch: fetch2
        };
        return next(await options.extractedFn?.(payload));
      },
      server: async ({ next, ...ctx }) => {
        const result = await options.serverFn?.(ctx);
        return next({
          ...ctx,
          result
        });
      }
    }
  };
}
function getDefaultSerovalPlugins() {
  return [...getStartOptions()?.serializationAdapters?.map(makeSerovalPlugin) ?? [], ...defaultSerovalPlugins];
}
var textEncoder = new TextEncoder();
var EMPTY_PAYLOAD = new Uint8Array(0);
function encodeFrame(type, streamId, payload) {
  const frame = new Uint8Array(FRAME_HEADER_SIZE + payload.length);
  frame[0] = type;
  frame[1] = streamId >>> 24 & 255;
  frame[2] = streamId >>> 16 & 255;
  frame[3] = streamId >>> 8 & 255;
  frame[4] = streamId & 255;
  frame[5] = payload.length >>> 24 & 255;
  frame[6] = payload.length >>> 16 & 255;
  frame[7] = payload.length >>> 8 & 255;
  frame[8] = payload.length & 255;
  frame.set(payload, FRAME_HEADER_SIZE);
  return frame;
}
function encodeJSONFrame(json) {
  return encodeFrame(FrameType.JSON, 0, textEncoder.encode(json));
}
function encodeChunkFrame(streamId, chunk) {
  return encodeFrame(FrameType.CHUNK, streamId, chunk);
}
function encodeEndFrame(streamId) {
  return encodeFrame(FrameType.END, streamId, EMPTY_PAYLOAD);
}
function encodeErrorFrame(streamId, error) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return encodeFrame(FrameType.ERROR, streamId, textEncoder.encode(message));
}
function createMultiplexedStream(jsonStream, rawStreams, lateStreamSource) {
  let controller;
  let cancelled = false;
  const readers = [];
  const enqueue = (frame) => {
    if (cancelled) return false;
    try {
      controller.enqueue(frame);
      return true;
    } catch {
      return false;
    }
  };
  const errorOutput = (error) => {
    if (cancelled) return;
    cancelled = true;
    try {
      controller.error(error);
    } catch {
    }
    for (const reader of readers) reader.cancel().catch(() => {
    });
  };
  async function pumpRawStream(streamId, stream) {
    const reader = stream.getReader();
    readers.push(reader);
    try {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) {
          enqueue(encodeEndFrame(streamId));
          return;
        }
        if (!enqueue(encodeChunkFrame(streamId, value))) return;
      }
    } catch (error) {
      enqueue(encodeErrorFrame(streamId, error));
    } finally {
      reader.releaseLock();
    }
  }
  async function pumpJSON() {
    const reader = jsonStream.getReader();
    readers.push(reader);
    try {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) return;
        if (!enqueue(encodeJSONFrame(value))) return;
      }
    } catch (error) {
      errorOutput(error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
  async function pumpLateStreams() {
    if (!lateStreamSource) return [];
    const lateStreamPumps = [];
    const reader = lateStreamSource.getReader();
    readers.push(reader);
    try {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        lateStreamPumps.push(pumpRawStream(value.id, value.stream));
      }
    } finally {
      reader.releaseLock();
    }
    return lateStreamPumps;
  }
  return new ReadableStream({
    async start(ctrl) {
      controller = ctrl;
      const pumps = [pumpJSON()];
      for (const [streamId, stream] of rawStreams) pumps.push(pumpRawStream(streamId, stream));
      if (lateStreamSource) pumps.push(pumpLateStreams());
      try {
        const latePumps = (await Promise.all(pumps)).find(Array.isArray);
        if (latePumps && latePumps.length > 0) await Promise.all(latePumps);
        if (!cancelled) try {
          controller.close();
        } catch {
        }
      } catch {
      }
    },
    cancel() {
      cancelled = true;
      for (const reader of readers) reader.cancel().catch(() => {
      });
      readers.length = 0;
    }
  });
}
var serovalPlugins = void 0;
var FORM_DATA_CONTENT_TYPES = ["multipart/form-data", "application/x-www-form-urlencoded"];
var MAX_PAYLOAD_SIZE = 1e6;
var handleServerAction = async ({ request, context, serverFnId }) => {
  const methodUpper = request.method.toUpperCase();
  const url = new URL(request.url);
  const action = await getServerFnById(serverFnId);
  if (action.method && methodUpper !== action.method) return new Response(`expected ${action.method} method. Got ${methodUpper}`, {
    status: 405,
    headers: { Allow: action.method }
  });
  const isServerFn = request.headers.get("x-tsr-serverFn") === "true";
  if (!serovalPlugins) serovalPlugins = getDefaultSerovalPlugins();
  const contentType = request.headers.get("Content-Type");
  function parsePayload(payload) {
    return fromJSON(payload, { plugins: serovalPlugins });
  }
  return await (async () => {
    try {
      let serializeResult = function(res2) {
        let nonStreamingBody = void 0;
        const alsResponse = getResponse();
        if (res2 !== void 0) {
          const rawStreams = /* @__PURE__ */ new Map();
          let initialPhase = true;
          let lateStreamWriter;
          let lateStreamReadable = void 0;
          const pendingLateStreams = [];
          const plugins = [createRawStreamRPCPlugin((id, stream) => {
            if (initialPhase) {
              rawStreams.set(id, stream);
              return;
            }
            if (lateStreamWriter) {
              lateStreamWriter.write({
                id,
                stream
              }).catch(() => {
              });
              return;
            }
            pendingLateStreams.push({
              id,
              stream
            });
          }), ...serovalPlugins || []];
          let done = false;
          const callbacks = {
            onParse: (value) => {
              nonStreamingBody = value;
            },
            onDone: () => {
              done = true;
            },
            onError: (error) => {
              throw error;
            }
          };
          toCrossJSONStream(res2, {
            refs: /* @__PURE__ */ new Map(),
            plugins,
            onParse(value) {
              callbacks.onParse(value);
            },
            onDone() {
              callbacks.onDone();
            },
            onError: (error) => {
              callbacks.onError(error);
            }
          });
          initialPhase = false;
          if (done && rawStreams.size === 0) return new Response(nonStreamingBody ? JSON.stringify(nonStreamingBody) : void 0, {
            status: alsResponse.status,
            statusText: alsResponse.statusText,
            headers: {
              "Content-Type": "application/json",
              [X_TSS_SERIALIZED]: "true"
            }
          });
          const { readable, writable } = new TransformStream();
          lateStreamReadable = readable;
          lateStreamWriter = writable.getWriter();
          for (const registration of pendingLateStreams) lateStreamWriter.write(registration).catch(() => {
          });
          pendingLateStreams.length = 0;
          const multiplexedStream = createMultiplexedStream(new ReadableStream({
            start(controller) {
              callbacks.onParse = (value) => {
                controller.enqueue(JSON.stringify(value) + "\n");
              };
              callbacks.onDone = () => {
                try {
                  controller.close();
                } catch {
                }
                lateStreamWriter?.close().catch(() => {
                }).finally(() => {
                  lateStreamWriter = void 0;
                });
              };
              callbacks.onError = (error) => {
                controller.error(error);
                lateStreamWriter?.abort(error).catch(() => {
                }).finally(() => {
                  lateStreamWriter = void 0;
                });
              };
              if (nonStreamingBody !== void 0) callbacks.onParse(nonStreamingBody);
              if (done) callbacks.onDone();
            },
            cancel() {
              lateStreamWriter?.abort().catch(() => {
              });
              lateStreamWriter = void 0;
            }
          }), rawStreams, lateStreamReadable);
          return new Response(multiplexedStream, {
            status: alsResponse.status,
            statusText: alsResponse.statusText,
            headers: {
              "Content-Type": TSS_CONTENT_TYPE_FRAMED_VERSIONED,
              [X_TSS_SERIALIZED]: "true"
            }
          });
        }
        return new Response(void 0, {
          status: alsResponse.status,
          statusText: alsResponse.statusText
        });
      };
      let res = await (async () => {
        if (FORM_DATA_CONTENT_TYPES.some((type) => contentType && contentType.includes(type))) {
          if (methodUpper === "GET") {
            if (false) ;
            invariant();
          }
          const formData = await request.formData();
          const serializedContext = formData.get(TSS_FORMDATA_CONTEXT);
          formData.delete(TSS_FORMDATA_CONTEXT);
          const params = {
            context,
            data: formData,
            method: methodUpper
          };
          if (typeof serializedContext === "string") try {
            const deserializedContext = fromJSON(JSON.parse(serializedContext), { plugins: serovalPlugins });
            if (typeof deserializedContext === "object" && deserializedContext) params.context = safeObjectMerge(deserializedContext, context);
          } catch (e) {
            if (false) ;
          }
          return await action(params);
        }
        if (methodUpper === "GET") {
          const payloadParam = url.searchParams.get("payload");
          if (payloadParam && payloadParam.length > MAX_PAYLOAD_SIZE) throw new Error("Payload too large");
          const payload2 = payloadParam ? parsePayload(JSON.parse(payloadParam)) : {};
          payload2.context = safeObjectMerge(payload2.context, context);
          payload2.method = methodUpper;
          return await action(payload2);
        }
        let jsonPayload;
        if (contentType?.includes("application/json")) jsonPayload = await request.json();
        const payload = jsonPayload ? parsePayload(jsonPayload) : {};
        payload.context = safeObjectMerge(payload.context, context);
        payload.method = methodUpper;
        return await action(payload);
      })();
      const unwrapped = res.result || res.error;
      if (isNotFound(res)) res = isNotFoundResponse(res);
      if (!isServerFn) return unwrapped;
      if (unwrapped instanceof Response) {
        if (isRedirect(unwrapped)) return unwrapped;
        unwrapped.headers.set(X_TSS_RAW_RESPONSE, "true");
        return unwrapped;
      }
      return serializeResult(res);
    } catch (error) {
      if (error instanceof Response) return error;
      if (isNotFound(error)) return isNotFoundResponse(error);
      console.info();
      console.info("Server Fn Error!");
      console.info();
      console.error(error);
      console.info();
      const serializedError = JSON.stringify(await Promise.resolve(toCrossJSONAsync(error, {
        refs: /* @__PURE__ */ new Map(),
        plugins: serovalPlugins
      })));
      const response = getResponse();
      return new Response(serializedError, {
        status: response.status ?? 500,
        statusText: response.statusText,
        headers: {
          "Content-Type": "application/json",
          [X_TSS_SERIALIZED]: "true"
        }
      });
    }
  })();
};
function isNotFoundResponse(error) {
  const { headers, ...rest } = error;
  return new Response(JSON.stringify(rest), {
    status: 404,
    headers: {
      "Content-Type": "application/json",
      ...headers || {}
    }
  });
}
function normalizeTransformAssetResult(result) {
  if (typeof result === "string") return { href: result };
  return result;
}
function resolveTransformAssetsCrossOrigin(config, kind) {
  if (!config) return void 0;
  if (typeof config === "string") return config;
  return config[kind];
}
function isObjectShorthand(transform) {
  return "prefix" in transform;
}
function resolveTransformAssetsConfig(transform) {
  if (typeof transform === "string") {
    const prefix = transform;
    return {
      type: "transform",
      transformFn: ({ url }) => ({ href: `${prefix}${url}` }),
      cache: true
    };
  }
  if (typeof transform === "function") return {
    type: "transform",
    transformFn: transform,
    cache: true
  };
  if (isObjectShorthand(transform)) {
    const { prefix, crossOrigin } = transform;
    return {
      type: "transform",
      transformFn: ({ url, kind }) => {
        const href = `${prefix}${url}`;
        if (kind === "clientEntry") return { href };
        const co = resolveTransformAssetsCrossOrigin(crossOrigin, kind);
        return co ? {
          href,
          crossOrigin: co
        } : { href };
      },
      cache: true
    };
  }
  if ("createTransform" in transform && transform.createTransform) return {
    type: "createTransform",
    createTransform: transform.createTransform,
    cache: transform.cache !== false
  };
  return {
    type: "transform",
    transformFn: typeof transform.transform === "string" ? (({ url }) => ({ href: `${transform.transform}${url}` })) : transform.transform,
    cache: transform.cache !== false
  };
}
function adaptTransformAssetUrlsToTransformAssets(transformFn) {
  return async ({ url, kind }) => ({ href: await transformFn({
    url,
    type: kind
  }) });
}
function adaptTransformAssetUrlsConfigToTransformAssets(transform) {
  if (typeof transform === "string") return transform;
  if (typeof transform === "function") return adaptTransformAssetUrlsToTransformAssets(transform);
  if ("createTransform" in transform && transform.createTransform) return {
    createTransform: async (ctx) => adaptTransformAssetUrlsToTransformAssets(await transform.createTransform(ctx)),
    cache: transform.cache,
    warmup: transform.warmup
  };
  return {
    transform: typeof transform.transform === "string" ? transform.transform : adaptTransformAssetUrlsToTransformAssets(transform.transform),
    cache: transform.cache,
    warmup: transform.warmup
  };
}
function buildClientEntryScriptTag(clientEntry, injectedHeadScripts) {
  let script = `import(${JSON.stringify(clientEntry)})`;
  if (injectedHeadScripts) script = `${injectedHeadScripts};${script}`;
  return {
    tag: "script",
    attrs: {
      type: "module",
      async: true
    },
    children: script
  };
}
function assignManifestAssetLink(link, next) {
  if (typeof link === "string") return next.crossOrigin ? next : next.href;
  return next.crossOrigin ? next : { href: next.href };
}
async function transformManifestAssets(source, transformFn, _opts) {
  const manifest2 = structuredClone(source.manifest);
  for (const route of Object.values(manifest2.routes)) {
    if (route.preloads) route.preloads = await Promise.all(route.preloads.map(async (link) => {
      const result = normalizeTransformAssetResult(await transformFn({
        url: resolveManifestAssetLink(link).href,
        kind: "modulepreload"
      }));
      return assignManifestAssetLink(link, {
        href: result.href,
        crossOrigin: result.crossOrigin
      });
    }));
    if (route.assets) {
      for (const asset of route.assets) if (asset.tag === "link" && asset.attrs?.href) {
        const rel = asset.attrs.rel;
        if (!(typeof rel === "string" ? rel.split(/\s+/) : []).includes("stylesheet")) continue;
        const result = normalizeTransformAssetResult(await transformFn({
          url: asset.attrs.href,
          kind: "stylesheet"
        }));
        asset.attrs.href = result.href;
        if (result.crossOrigin) asset.attrs.crossOrigin = result.crossOrigin;
        else delete asset.attrs.crossOrigin;
      }
    }
  }
  const transformedClientEntry = normalizeTransformAssetResult(await transformFn({
    url: source.clientEntry,
    kind: "clientEntry"
  }));
  const rootRoute = manifest2.routes[rootRouteId] = manifest2.routes[rootRouteId] || {};
  rootRoute.assets = rootRoute.assets || [];
  rootRoute.assets.push(buildClientEntryScriptTag(transformedClientEntry.href, source.injectedHeadScripts));
  return manifest2;
}
function buildManifestWithClientEntry(source) {
  const scriptTag = buildClientEntryScriptTag(source.clientEntry, source.injectedHeadScripts);
  const baseRootRoute = source.manifest.routes[rootRouteId];
  return { routes: {
    ...source.manifest.routes,
    [rootRouteId]: {
      ...baseRootRoute,
      assets: [...baseRootRoute?.assets || [], scriptTag]
    }
  } };
}
var ServerFunctionSerializationAdapter = createSerializationAdapter({
  key: "$TSS/serverfn",
  test: (v) => {
    if (typeof v !== "function") return false;
    if (!(TSS_SERVER_FUNCTION in v)) return false;
    return !!v[TSS_SERVER_FUNCTION];
  },
  toSerializable: ({ serverFnMeta }) => ({ functionId: serverFnMeta.id }),
  fromSerializable: ({ functionId }) => {
    const fn = async (opts, signal) => {
      return (await (await getServerFnById(functionId))(opts ?? {}, signal)).result;
    };
    return fn;
  }
});
function getStartResponseHeaders(opts) {
  return mergeHeaders({ "Content-Type": "text/html; charset=utf-8" }, ...opts.router.stores.matches.get().map((match) => {
    return match.headers;
  }));
}
var entriesPromise;
var baseManifestPromise;
var cachedFinalManifestPromise;
async function loadEntries() {
  const [routerEntry, startEntry, pluginAdapters] = await Promise.all([
    import("./assets/router-D-1D0-Hz.js").then((n) => n.Q),
    import("./assets/start-HYkvq4Ni.js"),
    import("./assets/__23tanstack-start-plugin-adapters-Cwee5PKy.js")
  ]);
  return {
    routerEntry,
    startEntry,
    pluginAdapters
  };
}
function getEntries() {
  if (!entriesPromise) entriesPromise = loadEntries();
  return entriesPromise;
}
function getBaseManifest(matchedRoutes) {
  if (!baseManifestPromise) baseManifestPromise = getStartManifest();
  return baseManifestPromise;
}
async function resolveManifest(matchedRoutes, transformFn, cache) {
  const base = await getBaseManifest();
  const computeFinalManifest = async () => {
    return transformFn ? await transformManifestAssets(base, transformFn) : buildManifestWithClientEntry(base);
  };
  if (!transformFn || cache) {
    if (!cachedFinalManifestPromise) cachedFinalManifestPromise = computeFinalManifest();
    return cachedFinalManifestPromise;
  }
  return computeFinalManifest();
}
var ROUTER_BASEPATH = "/";
var SERVER_FN_BASE = "/_serverFn/";
var IS_PRERENDERING = process.env.TSS_PRERENDERING === "true";
var IS_SHELL_ENV = process.env.TSS_SHELL === "true";
var ERR_NO_RESPONSE = "Internal Server Error";
var ERR_NO_DEFER = "Internal Server Error";
function throwRouteHandlerError() {
  throw new Error(ERR_NO_RESPONSE);
}
function throwIfMayNotDefer() {
  throw new Error(ERR_NO_DEFER);
}
function isSpecialResponse(value) {
  return value instanceof Response || isRedirect(value);
}
function handleCtxResult(result) {
  if (isSpecialResponse(result)) return { response: result };
  return result;
}
function executeMiddleware(middlewares, ctx) {
  let index = -1;
  const next = async (nextCtx) => {
    if (nextCtx) {
      if (nextCtx.context) ctx.context = safeObjectMerge(ctx.context, nextCtx.context);
      for (const key of Object.keys(nextCtx)) if (key !== "context") ctx[key] = nextCtx[key];
    }
    index++;
    const middleware = middlewares[index];
    if (!middleware) return ctx;
    let result;
    try {
      result = await middleware({
        ...ctx,
        next
      });
    } catch (err) {
      if (isSpecialResponse(err)) {
        ctx.response = err;
        return ctx;
      }
      throw err;
    }
    const normalized = handleCtxResult(result);
    if (normalized) {
      if (normalized.response !== void 0) ctx.response = normalized.response;
      if (normalized.context) ctx.context = safeObjectMerge(ctx.context, normalized.context);
    }
    return ctx;
  };
  return next();
}
function handlerToMiddleware(handler, mayDefer = false) {
  if (mayDefer) return handler;
  return async (ctx) => {
    const response = await handler({
      ...ctx,
      next: throwIfMayNotDefer
    });
    if (!response) throwRouteHandlerError();
    return response;
  };
}
function createStartHandler(cbOrOptions) {
  const cb = typeof cbOrOptions === "function" ? cbOrOptions : cbOrOptions.handler;
  const transformAssetsOption = typeof cbOrOptions === "function" ? void 0 : cbOrOptions.transformAssets;
  const transformAssetUrlsOption = typeof cbOrOptions === "function" ? void 0 : cbOrOptions.transformAssetUrls;
  const transformOption = transformAssetsOption !== void 0 ? resolveTransformAssetsConfig(transformAssetsOption) : transformAssetUrlsOption !== void 0 ? resolveTransformAssetsConfig(adaptTransformAssetUrlsConfigToTransformAssets(transformAssetUrlsOption)) : void 0;
  const warmupTransformManifest = !!transformAssetsOption && typeof transformAssetsOption === "object" && "warmup" in transformAssetsOption && transformAssetsOption.warmup === true || !!transformAssetUrlsOption && typeof transformAssetUrlsOption === "object" && transformAssetUrlsOption.warmup === true;
  const resolvedTransformConfig = transformOption;
  const cache = resolvedTransformConfig ? resolvedTransformConfig.cache : true;
  const shouldCacheCreateTransform = cache && true;
  let cachedCreateTransformPromise;
  const getTransformFn = async (opts) => {
    if (!resolvedTransformConfig) return void 0;
    if (resolvedTransformConfig.type === "createTransform") {
      if (shouldCacheCreateTransform) {
        if (!cachedCreateTransformPromise) cachedCreateTransformPromise = Promise.resolve(resolvedTransformConfig.createTransform(opts)).catch((error) => {
          cachedCreateTransformPromise = void 0;
          throw error;
        });
        return cachedCreateTransformPromise;
      }
      return resolvedTransformConfig.createTransform(opts);
    }
    return resolvedTransformConfig.transformFn;
  };
  if (warmupTransformManifest && cache && true && !cachedFinalManifestPromise) {
    const warmupPromise = (async () => {
      const base = await getBaseManifest();
      const transformFn = await getTransformFn({ warmup: true });
      return transformFn ? await transformManifestAssets(base, transformFn) : buildManifestWithClientEntry(base);
    })();
    cachedFinalManifestPromise = warmupPromise;
    warmupPromise.catch(() => {
      if (cachedFinalManifestPromise === warmupPromise) cachedFinalManifestPromise = void 0;
      cachedCreateTransformPromise = void 0;
    });
  }
  const startRequestResolver = async (request, requestOpts) => {
    let router = null;
    let cbWillCleanup = false;
    try {
      const { url, handledProtocolRelativeURL } = getNormalizedURL(request.url);
      const href = url.pathname + url.search + url.hash;
      const origin = getOrigin(request);
      if (handledProtocolRelativeURL) return Response.redirect(url, 308);
      const entries = await getEntries();
      const startOptions = await entries.startEntry.startInstance?.getOptions() || {};
      const { hasPluginAdapters, pluginSerializationAdapters } = entries.pluginAdapters;
      const serializationAdapters = [
        ...startOptions.serializationAdapters || [],
        ...hasPluginAdapters ? pluginSerializationAdapters : [],
        ServerFunctionSerializationAdapter
      ];
      const requestStartOptions = {
        ...startOptions,
        serializationAdapters
      };
      const flattenedRequestMiddlewares = startOptions.requestMiddleware ? flattenMiddlewares(startOptions.requestMiddleware) : [];
      const executedRequestMiddlewares = new Set(flattenedRequestMiddlewares);
      const getRouter = async () => {
        if (router) return router;
        router = await entries.routerEntry.getRouter();
        let isShell = IS_SHELL_ENV;
        if (IS_PRERENDERING && !isShell) isShell = request.headers.get(HEADERS.TSS_SHELL) === "true";
        const history = createMemoryHistory({ initialEntries: [href] });
        router.update({
          history,
          isShell,
          isPrerendering: IS_PRERENDERING,
          origin: router.options.origin ?? origin,
          defaultSsr: requestStartOptions.defaultSsr,
          serializationAdapters: [...requestStartOptions.serializationAdapters, ...router.options.serializationAdapters || []],
          basepath: ROUTER_BASEPATH
        });
        return router;
      };
      if (SERVER_FN_BASE && url.pathname.startsWith(SERVER_FN_BASE)) {
        const serverFnId = url.pathname.slice(SERVER_FN_BASE.length).split("/")[0];
        if (!serverFnId) throw new Error("Invalid server action param for serverFnId");
        const serverFnHandler = async ({ context }) => {
          return runWithStartContext({
            getRouter,
            startOptions: requestStartOptions,
            contextAfterGlobalMiddlewares: context,
            request,
            executedRequestMiddlewares,
            handlerType: "serverFn"
          }, () => handleServerAction({
            request,
            context: requestOpts?.context,
            serverFnId
          }));
        };
        return handleRedirectResponse((await executeMiddleware([...flattenedRequestMiddlewares.map((d) => d.options.server), serverFnHandler], {
          request,
          pathname: url.pathname,
          context: createNullProtoObject(requestOpts?.context)
        })).response, request, getRouter);
      }
      const executeRouter = async (serverContext, matchedRoutes) => {
        const acceptParts = (request.headers.get("Accept") || "*/*").split(",");
        if (!["*/*", "text/html"].some((mimeType) => acceptParts.some((part) => part.trim().startsWith(mimeType)))) return Response.json({ error: "Only HTML requests are supported here" }, { status: 500 });
        const manifest2 = await resolveManifest(matchedRoutes, await getTransformFn({
          warmup: false,
          request
        }), cache);
        const routerInstance = await getRouter();
        attachRouterServerSsrUtils({
          router: routerInstance,
          manifest: manifest2,
          getRequestAssets: () => getStartContext({ throwIfNotFound: false })?.requestAssets,
          includeUnmatchedRouteAssets: false
        });
        routerInstance.update({ additionalContext: { serverContext } });
        await routerInstance.load();
        if (routerInstance.state.redirect) return routerInstance.state.redirect;
        const ctx = getStartContext({ throwIfNotFound: false });
        await routerInstance.serverSsr.dehydrate({ requestAssets: ctx?.requestAssets });
        const responseHeaders = getStartResponseHeaders({ router: routerInstance });
        cbWillCleanup = true;
        return cb({
          request,
          router: routerInstance,
          responseHeaders
        });
      };
      const requestHandlerMiddleware = async ({ context }) => {
        return runWithStartContext({
          getRouter,
          startOptions: requestStartOptions,
          contextAfterGlobalMiddlewares: context,
          request,
          executedRequestMiddlewares,
          handlerType: "router"
        }, async () => {
          try {
            return await handleServerRoutes({
              getRouter,
              request,
              url,
              executeRouter,
              context,
              executedRequestMiddlewares
            });
          } catch (err) {
            if (err instanceof Response) return err;
            throw err;
          }
        });
      };
      return handleRedirectResponse((await executeMiddleware([...flattenedRequestMiddlewares.map((d) => d.options.server), requestHandlerMiddleware], {
        request,
        pathname: url.pathname,
        context: createNullProtoObject(requestOpts?.context)
      })).response, request, getRouter);
    } finally {
      if (router && !cbWillCleanup) router.serverSsr?.cleanup();
      router = null;
    }
  };
  return requestHandler(startRequestResolver);
}
async function handleRedirectResponse(response, request, getRouter) {
  if (!isRedirect(response)) return response;
  if (isResolvedRedirect(response)) {
    if (request.headers.get("x-tsr-serverFn") === "true") return Response.json({
      ...response.options,
      isSerializedRedirect: true
    }, { headers: response.headers });
    return response;
  }
  const opts = response.options;
  if (opts.to && typeof opts.to === "string" && !opts.to.startsWith("/")) throw new Error(`Server side redirects must use absolute paths via the 'href' or 'to' options. The redirect() method's "to" property accepts an internal path only. Use the "href" property to provide an external URL. Received: ${JSON.stringify(opts)}`);
  if ([
    "params",
    "search",
    "hash"
  ].some((d) => typeof opts[d] === "function")) throw new Error(`Server side redirects must use static search, params, and hash values and do not support functional values. Received functional values for: ${Object.keys(opts).filter((d) => typeof opts[d] === "function").map((d) => `"${d}"`).join(", ")}`);
  const redirect = (await getRouter()).resolveRedirect(response);
  if (request.headers.get("x-tsr-serverFn") === "true") return Response.json({
    ...response.options,
    isSerializedRedirect: true
  }, { headers: response.headers });
  return redirect;
}
async function handleServerRoutes({ getRouter, request, url, executeRouter, context, executedRequestMiddlewares }) {
  const router = await getRouter();
  const pathname = executeRewriteInput(router.rewrite, url).pathname;
  const { matchedRoutes, foundRoute, routeParams } = router.getMatchedRoutes(pathname);
  const isExactMatch = foundRoute && routeParams["**"] === void 0;
  const routeMiddlewares = [];
  for (const route of matchedRoutes) {
    const serverMiddleware = route.options.server?.middleware;
    if (serverMiddleware) {
      const flattened = flattenMiddlewares(serverMiddleware);
      for (const m of flattened) if (!executedRequestMiddlewares.has(m)) routeMiddlewares.push(m.options.server);
    }
  }
  const server2 = foundRoute?.options.server;
  if (server2?.handlers && isExactMatch) {
    const handlers = typeof server2.handlers === "function" ? server2.handlers({ createHandlers: (d) => d }) : server2.handlers;
    const handler = handlers[request.method.toUpperCase()] ?? handlers["ANY"];
    if (handler) {
      const mayDefer = !!foundRoute.options.component;
      if (typeof handler === "function") routeMiddlewares.push(handlerToMiddleware(handler, mayDefer));
      else {
        if (handler.middleware?.length) {
          const handlerMiddlewares = flattenMiddlewares(handler.middleware);
          for (const m of handlerMiddlewares) routeMiddlewares.push(m.options.server);
        }
        if (handler.handler) routeMiddlewares.push(handlerToMiddleware(handler.handler, mayDefer));
      }
    }
  }
  routeMiddlewares.push((ctx) => executeRouter(ctx.context, matchedRoutes));
  return (await executeMiddleware(routeMiddlewares, {
    request,
    context,
    params: routeParams,
    pathname
  })).response;
}
const fetch = createStartHandler(defaultStreamHandler);
function createServerEntry(entry) {
  return {
    async fetch(...args) {
      return await entry.fetch(...args);
    }
  };
}
const server = createServerEntry({ fetch });
export {
  TSS_SERVER_FUNCTION as T,
  getRequestIP$1 as a,
  createServerFn as c,
  createServerEntry,
  server as default,
  getServerFnById as g
};
