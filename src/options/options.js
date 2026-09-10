import { getStorage } from '../utils.js';

/**
 * Controller for managing extension preferences, custom domain lists, and sync options.
 */
class OptionsController {
	/** @type {HTMLInputElement|null} */
	#newDomainInput = null;

	/** @type {HTMLInputElement|null} */
	#newPrefixInput = null;

	/** @type {HTMLElement|null} */
	#statusDiv = null;

	/** @type {HTMLElement|null} */
	#domainListContainer = null;

	/** @type {HTMLButtonElement|null} */
	#addDomainBtn = null;

	/** @type {HTMLInputElement|null} */
	#useSyncToggle = null;

	/** @type {HTMLInputElement|null} */
	#includeTldToggle = null;

	/** @type {HTMLTemplateElement|null} */
	#deleteIconTemplate = null;

	/** @type {Array<{domain: string, prefix: string}>} */
	#domains = [];

	/**
	 * Creates an instance of OptionsController.
	 */
	constructor() {
		this.#domains = [];
	}

	/**
	 * Duration in milliseconds for displaying status feedback messages.
	 *
	 * @constant
	 * @returns {number} Duration in ms.
	 */
	static get STATUS_DURATION() {
		return 2000;
	}

	/**
	 * Initializes element references, registers events, and restores saved configurations.
	 *
	 * @returns {void}
	 */
	init() {
		this.#newDomainInput = document.querySelector('#domain-entry-field');
		this.#newPrefixInput = document.querySelector('#new-prefix-input');
		this.#statusDiv = document.querySelector('#feedback-message-box');
		this.#domainListContainer = document.querySelector('#saved-aliases-grid');
		this.#addDomainBtn = document.querySelector('#register-domain-button');
		this.#useSyncToggle = document.querySelector('#use-sync-toggle');
		this.#includeTldToggle = document.querySelector('#include-tld-toggle');
		this.#deleteIconTemplate = document.querySelector('#template-delete-icon');

		this.#setupEventListeners();
		this.#restoreOptions();
	}

	/**
	 * Renders the configured domains list in the DOM.
	 *
	 * @returns {void}
	 */
	render() {
		if (!this.#domainListContainer) {
			return;
		}

		this.#domainListContainer.replaceChildren();
		this.#domains.forEach((item, index) => {
			const domainName = item.domain || item;
			const prefixStr = item.prefix || '';

			const container = document.createElement('div');
			container.className = 'domain-item';

			const text = document.createElement('span');
			text.className = 'domain-text';
			text.textContent = prefixStr
				? `${prefixStr}[site]@${domainName}`
				: `[site]@${domainName}`;

			const deleteButton = document.createElement('button');
			deleteButton.className = 'delete-btn';
			deleteButton.title = 'Delete domain';

			if (this.#deleteIconTemplate) {
				deleteButton.appendChild(this.#deleteIconTemplate.content.cloneNode(true));
			}

			deleteButton.addEventListener('click', () => {
				this.#deleteDomain(index);
			});

			container.appendChild(text);
			container.appendChild(deleteButton);
			this.#domainListContainer.appendChild(container);
		});
	}

	/**
	 * Displays temporary feedback message in the status container.
	 *
	 * @private
	 * @param {string} message - Message text.
	 * @param {'success'|'error'} [type='success'] - Message type determining display color.
	 * @returns {void}
	 */
	#showStatus(message, type = 'success') {
		if (!this.#statusDiv) {
			return;
		}

		this.#statusDiv.textContent = message;
		this.#statusDiv.style.color =
			type === 'error' ? 'var(--status-error-color)' : 'var(--status-success-color)';

		setTimeout(() => {
			if (this.#statusDiv) {
				this.#statusDiv.textContent = '';
			}
		}, OptionsController.STATUS_DURATION);
	}

	/**
	 * Persists domains to the active storage location.
	 *
	 * @private
	 * @returns {Promise<void>} Resolves when saved.
	 */
	async #saveDomains() {
		const storage = await getStorage();
		await storage.set({ aliasDomains: this.#domains });
		this.#showStatus('Domains updated');
	}

	/**
	 * Validates input and adds a new domain entry to the configuration.
	 *
	 * @private
	 * @returns {void}
	 */
	#addDomain() {
		if (!this.#newPrefixInput || !this.#newDomainInput) {
			return;
		}

		if (!this.#newPrefixInput.checkValidity()) {
			this.#newPrefixInput.reportValidity();
			return;
		}

		if (!this.#newDomainInput.checkValidity()) {
			this.#newDomainInput.reportValidity();
			return;
		}

		const domainVal = this.#newDomainInput.value.trim();
		const prefixVal = this.#newPrefixInput.value.trim();

		if (!domainVal) {
			this.#showStatus('Please enter a domain', 'error');
			return;
		}

		const exists = this.#domains.some((item) => {
			return (item.domain || item) === domainVal;
		});

		if (exists) {
			this.#showStatus('Domain already exists', 'error');
			return;
		}

		this.#domains.push({ domain: domainVal, prefix: prefixVal });
		this.#newDomainInput.value = '';
		this.#newPrefixInput.value = '';
		this.render();
		this.#saveDomains();
	}

	/**
	 * Removes a domain entry by its index.
	 *
	 * @private
	 * @param {number} index - Index in the domain array.
	 * @returns {void}
	 */
	#deleteDomain(index) {
		this.#domains.splice(index, 1);
		this.render();
		this.#saveDomains();
	}

	/**
	 * Loads options from browser storage and updates UI controls.
	 *
	 * @private
	 * @returns {Promise<void>} Resolves when restored.
	 */
	async #restoreOptions() {
		const localPrefs = await browser.storage.local.get('useSync');
		if (this.#useSyncToggle) {
			this.#useSyncToggle.checked = Boolean(localPrefs.useSync);
		}

		const storage = await getStorage();
		try {
			const result = await storage.get(['aliasDomains', 'includeTld']);
			const rawDomains = result.aliasDomains || [];
			this.#domains = rawDomains.map((item) => {
				return typeof item === 'string' ? { domain: item, prefix: '' } : item;
			});

			if (this.#includeTldToggle) {
				this.#includeTldToggle.checked = result.includeTld !== false;
			}

			this.render();
		} catch (error) {
			console.error('Failed to restore options:', error);
		}
	}

	/**
	 * Persists general extension settings such as TLD inclusion.
	 *
	 * @private
	 * @returns {Promise<void>} Resolves when saved.
	 */
	async #saveSettings() {
		const storage = await getStorage();
		const includeTld = this.#includeTldToggle ? this.#includeTldToggle.checked : true;
		await storage.set({ includeTld });
		this.#showStatus('Settings saved');
	}

	/**
	 * Handles toggling sync preferences and migrating data between sync and local storage.
	 *
	 * @private
	 * @param {Event} event - Change event.
	 * @returns {Promise<void>} Resolves when migration completes.
	 */
	async #handleSyncToggle(event) {
		const target = /** @type {HTMLInputElement} */ (event.target);
		const enableSync = target.checked;

		const oldStorage = enableSync ? browser.storage.local : browser.storage.sync;
		const newStorage = enableSync ? browser.storage.sync : browser.storage.local;

		const allData = await oldStorage.get(null);
		delete allData.useSync;

		if (Object.keys(allData).length > 0) {
			await newStorage.set(allData);
			const keysToRemove = Object.keys(allData);
			await oldStorage.remove(keysToRemove);
		}

		await browser.storage.local.set({ useSync: enableSync });
		this.#showStatus(enableSync ? 'Sync enabled' : 'Sync disabled');
	}

	/**
	 * Attaches event listeners to interactive controls.
	 *
	 * @private
	 * @returns {void}
	 */
	#setupEventListeners() {
		if (this.#useSyncToggle) {
			this.#useSyncToggle.addEventListener('change', (event) => {
				this.#handleSyncToggle(event);
			});
		}

		if (this.#addDomainBtn) {
			this.#addDomainBtn.addEventListener('click', () => {
				this.#addDomain();
			});
		}

		if (this.#newDomainInput) {
			this.#newDomainInput.addEventListener('keypress', (event) => {
				if (event.key === 'Enter') {
					this.#addDomain();
				}
			});
		}

		if (this.#includeTldToggle) {
			this.#includeTldToggle.addEventListener('change', () => {
				this.#saveSettings();
			});
		}
	}
}

const Options = new OptionsController();
document.addEventListener('DOMContentLoaded', () => {
	Options.init();
});
