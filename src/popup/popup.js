import { getStorage, parseDomainContext } from '../utils.js';

/**
 * Controller for the browser action popup interface to generate and copy aliases.
 */
class PopupController {
	/** @type {HTMLElement|null} */
	#aliasListContainer = null;

	/** @type {HTMLButtonElement|null} */
	#settingsBtn = null;

	/** @type {HTMLElement|null} */
	#statusDiv = null;

	/** @type {HTMLTemplateElement|null} */
	#copyIconTemplate = null;

	/** @type {HTMLTemplateElement|null} */
	#successIconTemplate = null;

	/** @type {HTMLTemplateElement|null} */
	#noDomainsTemplate = null;

	/**
	 * Creates an instance of PopupController.
	 */
	constructor() {
		this.#aliasListContainer = null;
		this.#settingsBtn = null;
		this.#statusDiv = null;
		this.#copyIconTemplate = null;
		this.#successIconTemplate = null;
		this.#noDomainsTemplate = null;
	}

	/**
	 * Duration in milliseconds for clipboard feedback status.
	 *
	 * @constant
	 * @returns {number} Duration in ms.
	 */
	static get STATUS_DURATION() {
		return 2000;
	}

	/**
	 * Color for successful copy indication.
	 *
	 * @constant
	 * @returns {string} Hex color string.
	 */
	static get SUCCESS_COLOR() {
		return '#95c785';
	}

	/**
	 * Color for error indication.
	 *
	 * @constant
	 * @returns {string} Hex color string.
	 */
	static get ERROR_COLOR() {
		return '#e1739b';
	}

	/**
	 * Initializes popup DOM bindings, registers button events, and renders aliases.
	 *
	 * @returns {void}
	 */
	init() {
		this.#aliasListContainer = document.getElementById('generated-alias-container');
		this.#settingsBtn = /** @type {HTMLButtonElement|null} */ (
			document.getElementById('settings-btn')
		);
		this.#statusDiv = document.getElementById('feedback-message-box');
		this.#copyIconTemplate = /** @type {HTMLTemplateElement|null} */ (
			document.getElementById('template-copy-icon')
		);
		this.#successIconTemplate = /** @type {HTMLTemplateElement|null} */ (
			document.getElementById('template-success-icon')
		);
		this.#noDomainsTemplate = /** @type {HTMLTemplateElement|null} */ (
			document.getElementById('template-no-domains')
		);

		if (this.#settingsBtn) {
			this.#settingsBtn.addEventListener('click', () => {
				browser.runtime.openOptionsPage();
			});
		}

		this.#loadAndRender();
	}

	/**
	 * Copies alias text to the clipboard and animates button feedback.
	 *
	 * @private
	 * @param {string} text - Alias email to copy.
	 * @param {HTMLButtonElement} buttonElement - Trigger button element.
	 * @returns {void}
	 */
	#copyToClipboard(text, buttonElement) {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				buttonElement.classList.add('success');
				if (this.#successIconTemplate) {
					buttonElement.replaceChildren(
						this.#successIconTemplate.content.cloneNode(true)
					);
				}

				if (this.#statusDiv) {
					this.#statusDiv.textContent = 'Copied to clipboard!';
					this.#statusDiv.style.color = 'var(--status-success-color)';
				}

				setTimeout(() => {
					buttonElement.classList.remove('success');
					if (this.#copyIconTemplate) {
						buttonElement.replaceChildren(
							this.#copyIconTemplate.content.cloneNode(true)
						);
					}
					if (this.#statusDiv) {
						this.#statusDiv.textContent = '';
					}
				}, PopupController.STATUS_DURATION);
			})
			.catch(() => {
				if (this.#statusDiv) {
					this.#statusDiv.textContent = 'Failed to copy';
					this.#statusDiv.style.color = 'var(--status-error-color)';
				}
			});
	}

	/**
	 * Queries the active tab, generates matching aliases, and populates the popup DOM.
	 *
	 * @private
	 * @returns {Promise<void>} Resolves when loaded.
	 */
	async #loadAndRender() {
		if (!this.#aliasListContainer) {
			return;
		}

		const tabs = await browser.tabs.query({ active: true, currentWindow: true });
		if (!tabs || tabs.length === 0) {
			const errorDiv = document.createElement('div');
			errorDiv.style.cssText =
				'text-align: center; color: var(--text-subtitle); padding: 12px;';
			errorDiv.textContent = 'Error: Cannot read tab';
			this.#aliasListContainer.replaceChildren(errorDiv);
			return;
		}

		let url;
		try {
			url = new URL(tabs[0].url);
		} catch {
			const invalidDiv = document.createElement('div');
			invalidDiv.style.cssText =
				'text-align: center; color: var(--text-subtitle); padding: 12px;';
			invalidDiv.textContent = 'Invalid page';
			this.#aliasListContainer.replaceChildren(invalidDiv);
			return;
		}

		const storage = await getStorage();
		const result = await storage.get(['aliasDomains', 'includeTld']);
		const configuredDomains = result.aliasDomains || [];

		if (configuredDomains.length === 0) {
			if (this.#noDomainsTemplate) {
				const noDomainsContent = this.#noDomainsTemplate.content.cloneNode(true);
				this.#aliasListContainer.replaceChildren(noDomainsContent);

				const goToSettingsBtn = document.getElementById('go-to-settings-btn');
				if (goToSettingsBtn) {
					goToSettingsBtn.addEventListener('click', () => {
						browser.runtime.openOptionsPage();
					});
				}
			}
			return;
		}

		const includeTld = result.includeTld !== false;
		const currentSiteIdentifier = parseDomainContext(url.hostname, includeTld);

		this.#aliasListContainer.replaceChildren();

		configuredDomains.forEach((domainData) => {
			const domainName = domainData.domain || domainData;
			const prefix = domainData.prefix || '';
			const generatedEmail = `${prefix}${currentSiteIdentifier}@${domainName}`;

			const card = document.createElement('div');
			card.className = 'alias-card';

			const emailText = document.createElement('span');
			emailText.className = 'alias-email';
			emailText.textContent = generatedEmail;

			const copyButton = document.createElement('button');
			copyButton.className = 'copy-icon-btn';
			copyButton.title = 'Copy to clipboard';

			if (this.#copyIconTemplate) {
				copyButton.appendChild(this.#copyIconTemplate.content.cloneNode(true));
			}

			copyButton.addEventListener('click', () => {
				this.#copyToClipboard(generatedEmail, copyButton);
			});

			card.appendChild(emailText);
			card.appendChild(copyButton);
			this.#aliasListContainer.appendChild(card);
		});
	}
}

const Popup = new PopupController();
document.addEventListener('DOMContentLoaded', () => {
	Popup.init();
});
