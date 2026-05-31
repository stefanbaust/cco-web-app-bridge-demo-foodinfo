# FoodInfo Plugin

A demo plugin for [cco-web-app-bridge](https://github.com/stefanbaust/cco-web-app-bridge) that displays product nutritional information from [Open Food Facts](https://world.openfoodfacts.org/) inside SAP Customer Checkout.

## Features

- **Barcode lookup** -- search any EAN/UPC barcode against the Open Food Facts database
- **Embedded view** -- compact product card shown inline in the POS receipt area; automatically reacts to the currently selected receipt item
- **Popup view** -- full product details including NutriScore, allergens, ingredients, and nutrition facts
- **Deep-link support** -- the popup accepts a `gtin` query parameter (`#/popup?gtin=3017620422003`) to auto-load a product on open

## Views

### Embedded (`#/embedded`)

Renders inside the POS UI. Subscribes to `ReceiptStore` and automatically looks up the GTIN of the selected receipt item. A "Details" button fires `FOODINFO_SHOW_WEBVIEW` to open the popup with the current barcode.

### Popup (`#/popup`)

Full-screen overlay with manual search, demo barcode buttons (Nutella, Coca-Cola, Haribo, Milka), and detailed product information. When opened with a `gtin` query parameter the product is looked up immediately.

## Project structure

```
cco-web-app-bridge-demo-foodinfo/
├── pom.xml                        # Maven build (frontend-maven-plugin + shade)
├── deploy.sh                      # Copy JAR to local POS plugins dir
├── src/main/java/.../
│   └── FoodInfoPlugin.java        # Java plugin entry point
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
- The `cco-web-app-bridge` library installed in your local Maven repo

## Build

```bash
# Install the bridge library first (from the repo root)
cd ../cco-web-app-bridge && mvn clean install

# Build the plugin
cd ../cco-web-app-bridge-demo-foodinfo
mvn clean package
```

The output JAR is at `target/cco-web-app-bridge-demo-foodinfo-1.0-SNAPSHOT.jar`.

## Development

For local frontend development with hot-reload:

```bash
cd webapp
npm install
npm start          # ng serve on http://localhost:4200
```

The Angular app uses hash-based routing (`withHashLocation()`). Open `http://localhost:4200/#/popup` for the popup view or `http://localhost:4200/#/embedded` for the embedded view.

When running outside the POS, the bridge will not connect -- the views still work for UI development and can call the Open Food Facts API directly.

## Deploy

Copy the built JAR into the POS plugins directory:

```bash
./deploy.sh
```

Then restart SAP Customer Checkout to pick up the plugin.

## API

This plugin calls the [Open Food Facts API v2](https://wiki.openfoodfacts.org/API):

```
GET https://world.openfoodfacts.org/api/v2/product/{barcode}?fields=product_name,brands,image_url,nutriscore_grade,allergens_tags,ingredients_text,nutriments,categories,quantity
```

When running inside the POS, requests are proxied through the plugin servlet to avoid CORS restrictions (see `proxy.interceptor.ts`).
