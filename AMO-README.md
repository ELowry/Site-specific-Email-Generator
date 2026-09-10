# Build Instructions: Site-Specific Email Generator

This document provides instructions for Mozilla Add-ons reviewers to reproduce the build of the Site-Specific Email Generator extension from its source code.

## Prerequisites

To build this extension, you will need the following installed on your system:

- **Node.js**
- **npm** (Node Package Manager)

## Build Steps

Please follow these steps to build the extension from the provided source code archive:

### 1. Extract the source code:

Unzip the provided source code archive and navigate into the root directory of the project using your terminal.

### 2. Install dependencies:

Run the following command to install the required development dependencies (such as `web-ext`, `eslint`, and `prettier`):

```bash
npm ci
```

### 3. Build the extension:

Execute the build script:

```bash
npm run build
```

This will execute the following sequence:

1. `npm run prebuild`:  
   Runs `scripts/check-version.mjs` via Node.  
   This ensures that the version numbers in `package.json` and `manifest.json` are synchronized before allowing the build to proceed.
2. `npm run lint`:  
   Checks the codebase using ESLint, Prettier, and web-ext lint.  
   (Note: You can run `npm run lint:fix` to automatically fix any code styling issues.)
3. `web-ext build`:Packages the contents of the `src/` directory into a deployable `.zip` file inside the `dist/` folder.
