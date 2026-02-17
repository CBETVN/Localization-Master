if (typeof require === "undefined") {
  window.require = (moduleName) => {
    return {};
  };
}

export const uxp = require("uxp");
const hostName = uxp && uxp?.host?.name?.toLowerCase();

export const photoshop = (
  hostName === "photoshop" ? require("photoshop") : {}
);
