const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Force jsPDF to use its browser/ESM build instead of the Node build,
// which contains AMD require() calls that Metro cannot parse.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "jspdf") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/jspdf/dist/jspdf.es.min.js"
      ),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
