import { Feedback } from '../feedback.js';
import { I18n } from '../i18n.js';
import { Utils } from '../utils.js';

/**
 * Controller for the browser action popup interface to generate and copy aliases.
 */
class PopupController {
	/** @type {HTMLElement|null} */
	#aliasListContainer;

	/** @type {HTMLButtonElement|null} */
	#settingsBtn;

	/** @type {HTMLTemplateElement|null} */
	#copyIconTemplate;

	/** @type {HTMLTemplateElement|null} */
	#hashIconTemplate;

	/** @type {HTMLTemplateElement|null} */
	#successIconTemplate;

	/** @type {HTMLTemplateElement|null} */
	#noDomainsTemplate;

	/** @type {boolean} */
	#isModifierDown;

	constructor() {
		this.#aliasListContainer = null;
		this.#settingsBtn = null;
		this.#copyIconTemplate = null;
		this.#hashIconTemplate = null;
		this.#successIconTemplate = null;
		this.#noDomainsTemplate = null;
		this.#isModifierDown = false;
	}

	/**
	 * Initializes references, registers event listeners, and displays custom emails.
	 * @returns {void}
	 */
	init() {
		I18n.translateDom(document);

		this.#aliasListContainer = document.getElementById('DomainsContainer');
		this.#settingsBtn = document.getElementById('SettingsButton');
		this.#copyIconTemplate = document.getElementById('template-copyIcon');
		this.#hashIconTemplate = document.getElementById('template-hashIcon');
		this.#successIconTemplate = document.getElementById('template-successIcon');
		this.#noDomainsTemplate = document.getElementById('template-missingDomains');

		if (this.#settingsBtn) {
			this.#settingsBtn.addEventListener('click', () => {
				browser.runtime.openOptionsPage();
			});
		}

		document.addEventListener('keydown', (event) => {
			if (event.key === 'Shift' && !this.#isModifierDown) {
				this.#isModifierDown = true;
				this.#updateButtonStates();
			}
		});

		document.addEventListener('keyup', (event) => {
			if (event.key === 'Shift' && this.#isModifierDown) {
				this.#isModifierDown = false;
				this.#updateButtonStates();
			}
		});

		this.#loadAndRender();
	}

	/**
	 * Updates copy button icons and titles based on the modifier key state.
	 * @private
	 * @returns {void}
	 */
	#updateButtonStates() {
		const buttons = this.#aliasListContainer?.querySelectorAll('.copy-icon-btn');
		if (!buttons) {
			return;
		}

		const title = this.#isModifierDown
			? I18n.getMessage('popupCopyUniqueButtonTitle')
			: I18n.getMessage('popupCopyButtonTitle');

		const template = this.#isModifierDown ? this.#hashIconTemplate : this.#copyIconTemplate;

		buttons.forEach((btn) => {
			if (btn.classList.contains('success')) {
				return;
			}

			btn.title = title;
			btn.setAttribute('aria-label', title);
			if (template) {
				btn.replaceChildren(template.content.cloneNode(true));
			}
		});
	}

	/**
	 * Copies a custom email to the clipboard.
	 * @private
	 * @param {string} text - The custom email to copy.
	 * @param {HTMLButtonElement} buttonElement - The copy button.
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

				Feedback.showMessage(I18n.getMessage('messageCopiedToClipboardSuccess'), {
					type: 'success',
				});

				setTimeout(() => {
					buttonElement.classList.remove('success');

					const title = this.#isModifierDown
						? I18n.getMessage('popupCopyUniqueButtonTitle')
						: I18n.getMessage('popupCopyButtonTitle');

					const template = this.#isModifierDown
						? this.#hashIconTemplate
						: this.#copyIconTemplate;

					buttonElement.title = title;
					buttonElement.setAttribute('aria-label', title);

					if (template) {
						buttonElement.replaceChildren(template.content.cloneNode(true));
					}
				}, Feedback.DEFAULT_DURATION);
			})
			.catch(() => {
				Feedback.showMessage(I18n.getMessage('messageCopyToClipboardFailedError'), {
					type: 'error',
				});
			});
	}

	/**
	 * Generates and displays custom emails based on the current tab's URL.
	 * @private
	 * @returns {Promise<void>} when loaded.
	 */
	async #loadAndRender() {
		if (!this.#aliasListContainer) {
			return;
		}

		const storage = await Utils.getStorage();
		const result = await storage.get(['aliasDomains', 'includeTld']);
		const configuredDomains = result.aliasDomains || [];

		if (configuredDomains.length === 0) {
			if (this.#noDomainsTemplate) {
				const noDomainsContent = this.#noDomainsTemplate.content.cloneNode(true);
				I18n.translateDom(noDomainsContent);
				this.#aliasListContainer.replaceChildren(noDomainsContent);

				const goToSettingsBtn = document.getElementById('OpenSettingsButton');

				if (goToSettingsBtn) {
					goToSettingsBtn.addEventListener('click', () => {
						browser.runtime.openOptionsPage();
					});
				}
			}
			return;
		}

		let currentSiteIdentifier = 'unknown';

		try {
			const tabs = await browser.tabs.query({ active: true, currentWindow: true });

			if (tabs && tabs.length > 0) {
				if (
					!tabs[0].url
					|| tabs[0].url.startsWith('about:')
					|| tabs[0].url.startsWith('moz-extension:')
				) {
					browser.runtime.openOptionsPage();
					window.close();
					return;
				}

				const url = new URL(tabs[0].url);

				if (url.protocol === 'http:' || url.protocol === 'https:') {
					const includeTld = result.includeTld !== false;
					currentSiteIdentifier = Utils.parseDomainContext(url.hostname, includeTld);
				}
			}
		} catch (error) {
			console.warn(
				'Silent failure reading active tab url. Defaulting to generic identifier.'
			);
		}

		this.#aliasListContainer.replaceChildren();

		configuredDomains.forEach((domainData) => {
			const domainName = domainData.domain || domainData;
			const prefix = domainData.prefix || '';
			const generatedEmail = `${prefix}${currentSiteIdentifier}@${domainName}`;

			const block = document.createElement('div');
			block.className = 'alias-block';

			const emailText = document.createElement('span');
			emailText.className = 'alias-email';
			emailText.textContent = generatedEmail;

			const copyButton = document.createElement('button');
			copyButton.className = 'copy-icon-btn';
			const copyTitle = I18n.getMessage('popupCopyButtonTitle');
			copyButton.title = copyTitle;
			copyButton.setAttribute('aria-label', copyTitle);

			if (this.#copyIconTemplate) {
				copyButton.appendChild(this.#copyIconTemplate.content.cloneNode(true));
			}

			copyButton.addEventListener('click', (event) => {
				const isUnique = event.shiftKey;
				let finalEmail = generatedEmail;

				if (isUnique) {
					finalEmail = `${prefix}${currentSiteIdentifier}.${Utils.generateEpochToken()}@${domainName}`;
				}

				this.#copyToClipboard(finalEmail, copyButton);
			});

			block.appendChild(emailText);
			block.appendChild(copyButton);
			this.#aliasListContainer.appendChild(block);
		});

		if (this.#isModifierDown) {
			this.#updateButtonStates();
		}
	}
}

const Popup = new PopupController();

document.addEventListener('DOMContentLoaded', () => {
	Popup.init();
});
