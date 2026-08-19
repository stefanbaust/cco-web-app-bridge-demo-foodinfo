# FoodInfo Plugin

A demo plugin for [cco-web-app-bridge](https://github.com/stefanbaust/cco-web-app-bridge) that displays product nutritional information from [Open Food Facts](https://world.openfoodfacts.org/) inside SAP Customer Checkout.

It is a working example of the two things the bridge does: it embeds an Angular app in the POS UI and lets that app talk to the POS (here: the receipt store) without leaving the browser.

## Features

- **Barcode lookup** -- search any EAN/UPC barcode against the Open Food Facts database
- **Embedded view** -- compact product card shown inline in the POS receipt area; automatically reacts to the currently selected receipt item
- **Popup view** -- full product details including NutriScore, allergens, ingredients, and nutrition facts
- **Deep-link support** -- the popup accepts a `gtin` query parameter (`#/popup?gtin=3017620422003`) to auto-load a product on open

## Compatibility

| | |
|---|---|
| SAP Customer Checkout | cloud edition 3.0, FP2502 / FP2503 / FP2601 / FP2602 |
| cco-web-app-bridge | 0.1.5 |
| Java | 17 |

The supported feature packs are declared in the jar manifest (`cashDeskVersions`); the POS plugin manager ignores plugins that do not list its own version.

## Views

### Embedded (`#/embedded`)

Renders inside the POS UI. Subscribes to `ReceiptStore` and automatically looks up the GTIN of the selected receipt item. A "Details" button fires `FOODINFO_SHOW_WEBVIEW` to open the popup with the current barcode.

### Popup (`#/popup`)

Full-screen overlay with manual search, demo barcode buttons (Nutella, Coca-Cola, Haribo, Milka), and detailed product information. When opened with a `gtin` query parameter the product is looked up immediately.

## Project structure

```
cco-web-app-bridge-demo-foodinfo/
├── pom.xml                        # Maven build (frontend-maven-plugin + shade)
├── src/main/java/.../
│   └── FoodInfoPlugin.java        # Java plugin entry point
├── src/test/java/.../
│   └── FoodInfoPluginTest.java    # exits, prefix and bundling of the webapp
└── webapp/                        # Angular 21 frontend
    ├── angular.json
    ├── package.json
    └── src/app/
        ├── app.config.ts          # Routes & providers
        ├── pos-bridge.service.ts  # Bridge communication service
        ├── product-info.service.ts# Open Food Facts API client
        ├── embedded/              # Embedded view component
        ├── popup/                 # Popup view component
        └── shared/
            ├── bridge-config.ts   # BRIDGE_PREFIX constant
            ├── product.model.ts   # Product & Nutriments interfaces
            ├── proxy.interceptor.ts # CORS proxy for POS environment
            └── nutriscore-badge.ts  # NutriScore A-E badge component
```

## Prerequisites

- Java 17+
- Maven 3.9+
- Node 22 (installed automatically by `frontend-maven-plugin`)
- Access to the SAP Customer Checkout `ENV` artifact

The bridge itself is on Maven Central, so nothing has to be built by hand. `ENV` is SAP's proprietary POS runtime and is not publicly available: the build pulls it from a private Maven repository, configured in `.mvn/settings.xml` and authenticated with `MAVEN_REPO_USERNAME` / `MAVEN_REPO_PASSWORD`. Without that access the sources are still useful to read, but the build will not resolve. The same limitation is why pull requests from forks cannot build here.

## Build

```bash
export MAVEN_REPO_USERNAME=... MAVEN_REPO_PASSWORD=...
mvn package -s .mvn/settings.xml
```

The output is `target/cco-web-app-bridge-demo-foodinfo-<version>.jar`, a shaded jar containing the plugin, the bridge, and the compiled Angular app.

## Test

`mvn verify` runs both test suites: JUnit for the plugin class (exit annotations, prefix, and whether the webapp really ends up on the classpath) and Vitest for the Angular app.

```bash
mvn verify -s .mvn/settings.xml   # both
cd webapp && npm test             # webapp only, watch mode
```

An end-to-end test against real POS containers lives outside this repository; it builds this plugin from `main` and drives a paired cloud-edition till on every supported feature pack.

## Install into a POS

1. Copy the jar into the plugins directory of the POS, ideally into a subfolder starting with `CL_` so CCO loads it with its own classloader:

   ```
   <CCO installation>/cco/plugins/CL_foodinfo/cco-web-app-bridge-demo-foodinfo-<version>.jar
   ```

2. Restart SAP Customer Checkout. The log shows `Initializing plugin: dev.baust.cco.webapp.demo.foodinfo.FoodInfoPlugin`.

3. To show the embedded card, add a node to a quick selection (the `bottom` area works well) and put this JSON, as a plain string, into the node's `extendedFunction` field:

   ```json
   {
     "complex": {
       "component": "ContainerComponent",
       "props": {},
       "dynamicProperties": "#dynamicProperties:FOODINFO_WEBVIEW_EMBEDDED"
     }
   }
   ```

   `FOODINFO` is the prefix this demo passes to the bridge constructor; the Angular app uses the same value in `bridge-config.ts`. A quick selection change reaches a running till through "Backend data update" in the POS function menu.

The popup needs no wiring. It opens when the embedded card fires `FOODINFO_SHOW_WEBVIEW`.

## Development

For local frontend development with hot-reload:

```bash
cd webapp
npm install
npm start          # ng serve on http://localhost:4200
```

The Angular app uses hash-based routing (`withHashLocation()`). Open `http://localhost:4200/#/popup` for the popup view or `http://localhost:4200/#/embedded` for the embedded view.

When running outside the POS, the bridge will not connect -- the views still work for UI development and can call the Open Food Facts API directly.

## API

This plugin calls the [Open Food Facts API v2](https://wiki.openfoodfacts.org/API):

```
GET https://world.openfoodfacts.org/api/v2/product/{barcode}?fields=product_name,brands,image_url,nutriscore_grade,allergens_tags,ingredients_text,nutriments,categories,quantity
```

When running inside the POS, requests are proxied through the plugin servlet to avoid CORS restrictions (see `proxy.interceptor.ts`). The proxy only allows public HTTPS targets, so a till without internet access shows the product card empty.

## License

MIT, see [LICENSE](LICENSE).
