const path = require("node:path");
const packageJson = require("./package.json");
const windowsIcon = path.join(__dirname, "desktop", "assets", "icon.ico");

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "CentrifugalPumpSizing",
    icon: windowsIcon,
    appCopyright: "Copyright (c) 2026 quakfoolee-dotcom. All rights reserved.",
    win32metadata: {
      CompanyName: "quakfoolee-dotcom",
      FileDescription: packageJson.description,
      ProductName: packageJson.productName,
      InternalName: "CentrifugalPumpSizing",
      OriginalFilename: "CentrifugalPumpSizing.exe",
    },
    ignore: [
      /^\/\.git($|\/)/,
      /^\/\.github($|\/)/,
      /^\/components($|\/)/,
      /^\/docs($|\/)/,
      /^\/lib($|\/)/,
      /^\/scripts($|\/)/,
      /^\/dist($|\/)/,
      /^\/out($|\/)/,
      /^\/Pump_Calculator\.html$/,
      /^\/styles\.css$/,
      /^\/index\.html$/,
      /^\/CHANGELOG\.md$/,
      /^\/README\.md$/,
      /^\/release-manifest\.json$/,
      /^\/package-lock\.json$/,
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "centrifugal_pump_sizing",
        authors: packageJson.author,
        description: packageJson.description,
        setupExe: `Centrifugal-Pump-Sizing-Setup-v${packageJson.version}.exe`,
        setupIcon: windowsIcon,
        noMsi: true,
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
    },
  ],
};
