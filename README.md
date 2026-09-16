[![License: MIT](https://img.shields.io/badge/License-MIT-3d383b.svg)](LICENSE) [![Latest GitHub release](https://img.shields.io/github/v/release/ELowry/Site-specific-Email-Generator?logo=GitHub&color=a4785e)](https://github.com/ELowry/Site-specific-Email-Generator/releases/latest) [![Mozilla Add-on Users](https://img.shields.io/amo/users/site-specific-email-generator?logo=firefox&color=e19085)](https://addons.mozilla.org/en-US/firefox/addon/site-specific-email-generator/)

# [![Site-specific Email Generator](logo.png)](#)

Easily keep your emails sorted ans spam-free by generating a unique email address for every site using your personal domain!

> [!IMPORTANT]  
> This extension does not handle actually creating email aliases; it is **designed for users who have already set up "catch-all" email routing** with their email provider or custom domain.

This Firefox extension helps you easily sign up anywhere with a dedicated email by automatically generating an email alias specific to the site you're on (e.g., `current-website@yourdomain.com`). By using a different email alias for each website, you can effortlessly organize your inbox, monitor for data leaks, and stop spam.

## Features

- **Password Auto-fill**:  
  The extension tries to detect any email input field and injects a small button when it is focused. Clicking the icon instantly generates a unique email alias using the site's domain name.  
  _Note: If you have multiple domains registered, clicking the icon repeatedly cycles through them._  
  Some sites use custom code for email inputs, preventing the extension from adding the button, so you can also:
    - Automatically paste a generated email into any input field using the right-click button.
    - Click the extension icon in your browser toolbar to open a popup that lets you copy generated emails.
- **Optional Top-level Domain Inclusion**:  
  You can choose to include or exclude the top-level domain from generated emails (e.g., `some-website.com` ↔ `some-website`).
- **Domain Configuration**:  
  The options page lets you add multiple domains and/or choose to add prefixes to generated emails (e.g., `spam.some-website@yourdomain.com`).

> [!NOTE]  
> **Privacy-First & Local Execution**  
> All extraction and generation logic runs 100% locally in your browser without phoning home to external APIs. Settings can be kept local or synced securely via Firefox Sync.

## Installation & Setup

_Coming Soon!_

## Usage

Once configured, you can generate email aliases in three ways:

- **Inline Button**:  
  Click into any email input field on a webpage and click the icon that appears inside it to the right.
- **Right-Click Menu**:  
  Right-click a text field and select **Generate Email Alias** (or choose a specific domain if you have multiple configured).
- **Copy to Clipboard**:  
  Open the extension popup from your toolbar and click the copy button to grab your email alias for the current site.

## Privacy

This extension respects your privacy implicitly. It operates entirely locally within your browser. It does not collect, store, or transmit your personal data, email addresses, or browsing history.

For full details on how data and network requests are handled, please read the [Privacy Policy](PRIVACY.md).

## Building from Source

Please refer to the dedicated [AMO README](AMO-README.md) file for full instructions.

## License

This project is licensed under the [MIT License](LICENSE).
