import * as Comlink from "comlink";
import { api } from "./api/api";

import { id, config } from "../uxp.config";
import { getColorScheme } from "./api/uxp";

export const webviewInitHost = (params) => {
  const multi = params ? params.multi : false;
  return new Promise((resolve, reject) => {
    let pages = ["main"];
    if (multi === true || Array.isArray(multi)) {
      pages = config.manifest.entrypoints.map(
        (point) => point.id.split(".")?.pop(),
      );
      console.log("webviewInitHost multi pages", pages);
    }
    let apis = [];
    pages.map((page, i) => {
      // if (i > 0) return;
      let webview = document.createElement("webview");
      webview.className = "webview-ui";
      webview.id = `webview-${i}`;
      webview.uxpAllowInspector = "true";
      const origin =
        import.meta.env.VITE_BOLT_MODE === "dev"
          ? `http://localhost:${import.meta.env.VITE_BOLT_WEBVIEW_PORT}/?page=${page}`
          : `plugin:/webview-ui/${page}.html`;
      webview.src = origin;

      const appElement = document.getElementById("app");
      const parent =
        i === 0
          ? appElement
          : Array.from(document.getElementsByTagName("uxp-panel")).find(
              (item) => item.getAttribute("panelid") === `${id}.${page}`,
            );
      console.log({ parent });
      webview = parent.appendChild(webview);

      webview.addEventListener("message", (e) => {
        console.log("webview message", page, e.message);
      });
      let loaded = false;
      webview.addEventListener("loadstop", (e) => {
        if (loaded) return;
        loaded = true;
        const backendAPI = { api };
        const backendEndpoint = {
          postMessage: (msg, transferrables) => {
            console.log("running postMessage", page, msg), transferrables;
            return webview.postMessage(msg);
          },
          addEventListener: (type, handler) => {
            console.log("running addEventListener", webview.addEventListener);
            webview.addEventListener("message", handler);
          },
          removeEventListener: (type, handler) => {
            console.log(
              "running removeEventListener",
              webview.removeEventListener,
            );
            webview.removeEventListener("message", handler);
          },
        };

        console.log({ origin });

        const endpoint = Comlink.windowEndpoint(backendEndpoint);

        // Now we bind to the Webview's APIs
        const comlinkAPI = Comlink.wrap(endpoint);
        // TODO: might need to adjust for multi webviews
        apis.push(comlinkAPI);
        // Once - At End
        Comlink.expose(
          backendAPI,
          endpoint,
          [origin], // doesn't work in prod
        );
        if (apis.length === pages.length) {
          console.log("webviewInitHost resolved");
          for (const api of apis) {
            getColorScheme().then((scheme) => {
              api.updateColorScheme(scheme);
            });
            document.theme.onUpdated.addListener(() =>
              getColorScheme().then((scheme) => {
                api.updateColorScheme(scheme);
              }),
            );
          }
          resolve(apis);
        }
        // else {
        //   console.log(
        //     "webviewInitHost not resolved yet",
        //     apis.length,
        //     pages.length,
        //   );
        // }

        // Send Basic Message to Webview
        // webview.postMessage({type: "uxp-to-webview"});

        // Get Basic Messages from Webview
        // let lastEventId = ''
        window.addEventListener("message", (e) => console.log("MESSAGE:", e));
      });
    });
  });
};
