import * as path from "path"
import { getFirstExistingFile } from "../util"
import { WebpackConfigurator } from "../webpackConfigurator"

export async function configureTypescript(configurator: WebpackConfigurator) {
  const hasTsChecker = configurator.hasDevDependency("fork-ts-checker-webpack-plugin") || configurator.hasDevDependency("electron-webpack-ts")
  if (!(hasTsChecker || configurator.hasDevDependency("ts-loader"))) {
    return
  }

  // add after js
  configurator.extensions.splice(1, 0, ".ts")

  const isTranspileOnly = configurator.isTest || (hasTsChecker && !configurator.isProduction)

  const tsLoaderOptions: any = {
    // use transpileOnly mode to speed-up compilation
    // in the test mode also, because checked during dev or production build
    transpileOnly: isTranspileOnly,
    appendTsSuffixTo: [/\.vue$/],
    logLevel: "warn" // no need to log used tsconfig file as info
  }

  const tsConfigFile = await getFirstExistingFile([path.join(configurator.sourceDir, "tsconfig.json"), path.join(configurator.projectDir, "tsconfig.json")], null)
  // check even if we currently doesn't pass path to ts-loader — to produce clear error message if no tsconfig.json
  if (tsConfigFile == null) {
    throw new Error(`Please create tsconfig.json in the "${configurator.projectDir}":\n\n{\n  "extends": "./node_modules/electron-webpack/tsconfig-base.json"\n}\n\n`)
  }

  configurator.debug(`Using ${tsConfigFile}`)

  // no sense to use fork-ts-checker-webpack-plugin for production build
  if (isTranspileOnly && !configurator.isTest) {
    const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
    configurator.plugins.push(new ForkTsCheckerWebpackPlugin({
      tsconfig: tsConfigFile,
      logger: configurator.env.forkTsCheckerLogger || {
        info: () => {
          // ignore
        },

        warn: console.warn.bind(console),
        error: console.error.bind(console),
      }
    }))
  }

  configurator.debug(`ts-loader options: ${JSON.stringify(tsLoaderOptions, null, 2)}`)

  configurator.rules.push({
    test: /\.tsx?$/,
    exclude: /node_modules/,
    use: [
      {
        loader: "ts-loader",
        options: tsLoaderOptions
      },
    ],
  })
}