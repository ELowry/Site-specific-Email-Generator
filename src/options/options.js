import { Feedback } from '../feedback.js';
import { I18n } from '../i18n.js';
import { Utils } from '../utils.js';

/**
 * Manages preferences, custom domain lists, and sync options.
 */
class OptionsController {
	/** @type {HTMLInputElement|null} */
	#newDomainInput;

	/** @type {HTMLInputElement|null} */
	#newPrefixInput;

	/** @type {HTMLElement|null} */
	#domainListContainer;

	/** @type {HTMLButtonElement|null} */
	#addDomainBtn;

	/** @type {HTMLButtonElement|null} */
	#useSyncToggle;

	/** @type {HTMLButtonElement|null} */
	#includeTldToggle;

	/** @type {HTMLTemplateElement|null} */
	#deleteIconTemplate;

	/** @type {HTMLTemplateElement|null} */
	#dragIconTemplate;

	/** @type {Array<{domain: string, prefix: string}>} */
	#domains;

	/** @type {number|null} */
	#dragSourceIndex;

	constructor() {
		this.#newDomainInput = null;
		this.#newPrefixInput = null;
		this.#domainListContainer = null;
		this.#addDomainBtn = null;
		this.#useSyncToggle = null;
		this.#includeTldToggle = null;
		this.#deleteIconTemplate = null;
		this.#dragIconTemplate = null;
		this.#domains = [];
		this.#dragSourceIndex = null;
	}

	/**
	 * Initializes references, registers event listeners, and loads configuration.
	 * @returns {void}
	 */
	init() {
		I18n.translateDom(document);

		this.#newDomainInput = document.querySelector('#DomainInput');
		this.#newPrefixInput = document.querySelector('#PrefixInput');
		this.#domainListContainer = document.querySelector('#SavedDomains');
		this.#addDomainBtn = document.querySelector('#AddDomainButton');
		this.#useSyncToggle = document.querySelector('#UseSyncToggle');
		this.#includeTldToggle = document.querySelector('#IncludeTLDToggle');
		this.#deleteIconTemplate = document.querySelector('#template-deleteIcon');
		this.#dragIconTemplate = document.querySelector('#template-dragIcon');

		this.#setupEventListeners();
		this.#restoreOptions();
	}

	/**
	 * Renders the configured domains list.
	 * @returns {void}
	 */
	render() {
		if (!this.#domainListContainer) {
			return;
		}

		this.#domainListContainer.replaceChildren();

		if (this.#domains.length === 0) {
			const emptyState = document.createElement('div');
			emptyState.className = 'empty-state';
			emptyState.textContent = I18n.getMessage('optionsDomainListEmptyState');

			this.#domainListContainer.appendChild(emptyState);
			return;
		}

		const canDrag = this.#domains.length > 1;

		this.#domains.forEach((item, index) => {
			const domainName = item.domain || item;
			const prefixStr = item.prefix || '';

			const container = document.createElement('div');
			container.className = 'domain-item';

			if (canDrag) {
				container.draggable = true;
			}

			let dragHandle = null;
			if (canDrag) {
				dragHandle = document.createElement('div');
				dragHandle.className = 'drag-handle';
				if (this.#dragIconTemplate) {
					dragHandle.appendChild(this.#dragIconTemplate.content.cloneNode(true));
				}
			}

			const entry = document.createElement('p');
			entry.className = 'domain-text';

			if (prefixStr) {
				entry.appendChild(document.createTextNode(prefixStr));
			}

			const siteIndicator = document.createElement('span');
			siteIndicator.className = 'site-indicator';
			siteIndicator.textContent = I18n.getMessage('optionsDomainSiteIndicator');

			entry.appendChild(siteIndicator);
			entry.appendChild(document.createTextNode(`@${domainName}`));

			const deleteButton = document.createElement('button');
			deleteButton.className = 'btn-primary icon-only delete-btn';
			deleteButton.title = I18n.getMessage('optionsDeleteDomainButtonTitle');
			deleteButton.setAttribute(
				'aria-label',
				I18n.getMessage('optionsDeleteDomainButtonAria', domainName)
			);

			if (this.#deleteIconTemplate) {
				deleteButton.appendChild(this.#deleteIconTemplate.content.cloneNode(true));
			}

			deleteButton.addEventListener('click', () => {
				this.#deleteDomain(index);
			});

			if (canDrag) {
				container.addEventListener('dragstart', (event) => {
					this.#dragSourceIndex = index;
					if (event.dataTransfer) {
						event.dataTransfer.effectAllowed = 'move';
						event.dataTransfer.setData('application/x-domain-index', String(index));
					}
					setTimeout(() => {
						container.classList.add('is-dragging');
					}, 0);
				});

				container.addEventListener('dragenter', (event) => {
					event.preventDefault();
				});

				container.addEventListener('dragover', (event) => {
					event.preventDefault();
					if (event.dataTransfer) {
						event.dataTransfer.dropEffect = 'move';
					}

					const bounding = container.getBoundingClientRect();
					const offset = bounding.y + bounding.height / 2;
					if (event.clientY - offset > 0) {
						container.style.borderBottom =
							'var(--border-width) solid var(--color-accent)';
						container.style.borderTop = '';
					} else {
						container.style.borderTop = 'var(--border-width) solid var(--color-accent)';
						container.style.borderBottom = '';
					}
				});

				container.addEventListener('dragleave', (event) => {
					if (container.contains(event.relatedTarget)) {
						return;
					}
					container.style.borderTop = '';
					container.style.borderBottom = '';
				});

				container.addEventListener('drop', (event) => {
					event.preventDefault();
					container.style.borderTop = '';
					container.style.borderBottom = '';

					if (this.#dragSourceIndex === null || this.#dragSourceIndex === index) {
						return;
					}

					const bounding = container.getBoundingClientRect();
					const offset = bounding.y + bounding.height / 2;

					let insertIndex = index;
					if (event.clientY - offset > 0) {
						insertIndex = index + 1;
					}

					const itemToMove = this.#domains.splice(this.#dragSourceIndex, 1)[0];
					if (this.#dragSourceIndex < insertIndex) {
						insertIndex--;
					}
					this.#domains.splice(insertIndex, 0, itemToMove);

					this.#saveDomains();
					this.render();
				});

				container.addEventListener('dragend', () => {
					container.classList.remove('is-dragging');
					this.#dragSourceIndex = null;

					if (this.#domainListContainer) {
						const items = this.#domainListContainer.querySelectorAll('.domain-item');
						items.forEach((element) => {
							element.style.borderTop = '';
							element.style.borderBottom = '';
						});
					}
				});
			}

			if (dragHandle) {
				container.appendChild(dragHandle);
			}
			container.appendChild(entry);
			container.appendChild(deleteButton);
			this.#domainListContainer.appendChild(container);
		});
	}

	/**
	 * Saves domains to the currently selected storage location.
	 * @private
	 * @returns {Promise<void>} when saved.
	 */
	async #saveDomains() {
		const storage = await Utils.getStorage();
		await storage.set({ aliasDomains: this.#domains });

		Feedback.showMessage(I18n.getMessage('messageDomainsUpdatedSuccess'), {
			type: 'success',
			targetId: 'DomainsFeedback',
		});
	}

	/**
	 * Tries to add a new domain entry.
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
			Feedback.showMessage(I18n.getMessage('messageEnterDomainError'), {
				type: 'error',
				targetId: 'DomainsFeedback',
			});
			return;
		}

		const exists = this.#domains.some((entry) => {
			return entry.domain === domainVal && entry.prefix === prefixVal;
		});

		if (exists) {
			Feedback.showMessage(I18n.getMessage('messageDomainExistsError'), {
				type: 'error',
				targetId: 'DomainsFeedback',
			});
			return;
		}

		this.#domains.push({ domain: domainVal, prefix: prefixVal });
		this.#newDomainInput.value = '';
		this.#newPrefixInput.value = '';

		this.render();
		this.#saveDomains();
	}

	/**
	 * Removes a domain entry.
	 * @private
	 * @param {number} index - Array index of the entry to remove.
	 * @returns {void}
	 */
	#deleteDomain(index) {
		this.#domains.splice(index, 1);
		this.render();
		this.#saveDomains();
	}

	/**
	 * Retrieves options from browser storage and updates the UI.
	 * @private
	 * @returns {Promise<void>} when restored.
	 */
	async #restoreOptions() {
		const localPrefs = await browser.storage.local.get('useSync');

		if (this.#useSyncToggle) {
			this.#useSyncToggle.setAttribute('aria-checked', String(Boolean(localPrefs.useSync)));
		}

		const storage = await Utils.getStorage();

		try {
			const result = await storage.get(['aliasDomains', 'includeTld']);
			const rawDomains = result.aliasDomains || [];

			this.#domains = rawDomains.map((item) => {
				return typeof item === 'string' ? { domain: item, prefix: '' } : item;
			});

			if (this.#includeTldToggle) {
				this.#includeTldToggle.setAttribute(
					'aria-checked',
					String(result.includeTld !== false)
				);
			}

			this.render();
		} catch (error) {
			console.error('Failed to restore options:', error);
		}
	}

	/**
	 * Saves extension settings.
	 * @private
	 * @returns {Promise<void>} when saved.
	 */
	async #saveSettings() {
		const storage = await Utils.getStorage();
		const includeTld = this.#includeTldToggle
			? this.#includeTldToggle.getAttribute('aria-checked') === 'true'
			: true;

		await storage.set({ includeTld });
		Feedback.showMessage(I18n.getMessage('messageSettingsSavedSuccess'), {
			type: 'success',
			targetId: 'SettingsFeedback',
		});
	}

	/**
	 * Toggles sync preferences and migrates data between sync and local storage.
	 * @private
	 * @param {boolean} enableSync - Whether to use Firefox Sync.
	 * @returns {Promise<void>} when migration completes.
	 */
	async #handleSyncToggle(enableSync) {
		const oldStorage = enableSync ? browser.storage.local : browser.storage.sync;
		const newStorage = enableSync ? browser.storage.sync : browser.storage.local;

		const oldData = await oldStorage.get(null);
		const newData = await newStorage.get(null);

		delete oldData.useSync;

		if (oldData.aliasDomains && newData.aliasDomains) {
			const mergedDomains = [...newData.aliasDomains];

			for (const oldItem of oldData.aliasDomains) {
				const oldDomain = oldItem.domain || oldItem;
				const oldPrefix = oldItem.prefix || '';

				const exists = mergedDomains.some((newItem) => {
					const nDomain = newItem.domain || newItem;
					const nPrefix = newItem.prefix || '';
					return nDomain === oldDomain && nPrefix === oldPrefix;
				});

				if (!exists) {
					mergedDomains.push(oldItem);
				}
			}
			oldData.aliasDomains = mergedDomains;
		}

		if (Object.keys(oldData).length > 0) {
			await newStorage.set(oldData);
			const keysToRemove = Object.keys(oldData);
			await oldStorage.remove(keysToRemove);
		}

		await browser.storage.local.set({ useSync: enableSync });

		await this.#restoreOptions();

		Feedback.showMessage(
			enableSync
				? I18n.getMessage('messageSyncEnabledSuccess')
				: I18n.getMessage('messageSyncDisabledSuccess'),
			{
				type: 'success',
				targetId: 'SettingsFeedback',
			}
		);
	}

	/**
	 * Sets up event listeners.
	 * @private
	 * @returns {void}
	 */
	#setupEventListeners() {
		if (this.#useSyncToggle) {
			this.#useSyncToggle.addEventListener('click', () => {
				const currentState = this.#useSyncToggle.getAttribute('aria-checked') === 'true';
				const newState = !currentState;
				this.#useSyncToggle.setAttribute('aria-checked', String(newState));
				this.#handleSyncToggle(newState);
			});
		}

		if (this.#includeTldToggle) {
			this.#includeTldToggle.addEventListener('click', () => {
				const currentState = this.#includeTldToggle.getAttribute('aria-checked') === 'true';
				const newState = !currentState;
				this.#includeTldToggle.setAttribute('aria-checked', String(newState));
				this.#saveSettings();
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
	}
}

const Options = new OptionsController();

document.addEventListener('DOMContentLoaded', () => {
	Options.init();
});
