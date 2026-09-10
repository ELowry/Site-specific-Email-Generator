# Site-Specific Email Generator

Protect your real inbox by instantly generating and autofilling unique email addresses for every website using your personal domain.

This Firefox extension acts as a privacy shield, taking your custom catch-all domain and automatically crafting site-specific aliases (e.g., `current-website@yourdomain.com`). By keeping your real email address hidden, you can effortlessly organize your inbox, track data leaks, and cut down on spam.

---

## Core Features

- **Inline Autofill Widget**:  
  The extension actively monitors for email input fields on the page. When an email field comes into focus, a floating action icon appears beside it. Clicking the icon instantly generates and injects your alias.
- **Shadow DOM Isolation**:  
  The inline widget is injected via a closed Shadow DOM, ensuring its styling never conflicts with the host website.
- **Context Menu Injection**:  
  Prefer to right-click? You can generate and inject aliases directly through the browser's native context menu on any editable field.
- **Popup Clipboard Interface**:  
  Click the extension icon in your browser toolbar to open a quick-action popup. It automatically evaluates your active tab and lets you copy the generated alias to your clipboard with a single click.
- **Intelligent Domain Parsing**:  
  Powered by a robust public suffix list, the internal utility accurately parses the active URL's hostname to extract the true site identifier (e.g., `some-website.com` becomes `some-website`).
- **Multi-Domain & Prefix Configuration**:  
  Manage multiple custom domains in the settings page and optionally append custom prefixes to your aliases (e.g., `spam.some-website@yourdomain.com`).
- **Privacy-First & Local Execution**:  
  All extraction and generation logic runs 100% locally in your browser without phoning home to external APIs. Settings can be kept local or synced securely via Firefox Sync.

## Installation & Setup

1. Install the extension from the Firefox Add-ons store.
2. Click the extension icon in your toolbar and select the **Settings** gear icon.
3. Add your custom catch-all domain(s) in the configuration panel.
4. (Optional) Adjust your Firefox Sync preferences or toggle Top-Level Domain (TLD) inclusion.

## Usage

Once configured, you can generate your aliases in three ways:

1. **Inline Button**:  
   Click into any email input field on a webpage and click the floating generator icon that appears.
2. **Right-Click Menu**:  
   Right-click a text field and select **Generate Email Alias** (or choose a specific domain if you have multiple configured).
3. **Copy to Clipboard**:  
   Open the extension popup from your toolbar and click the copy button to grab your alias for the current site.

## Local Development

Ensure you have Node.js and NPM installed, then clone the repository.

**Install dependencies:**

```bash
npm install
```
