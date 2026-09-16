import { Utils } from './utils.js';

/**
 * Extension background operations, context menus, and messaging.
 */
class BackgroundController {
	constructor() {}

	/**
	 * Configuration context menu ID.
	 * @constant
	 * @returns {string} the menu item ID.
	 */
	static get CONFIGURE_MENU_ID() {
		return 'OpenSettingsMenu';
	}

	/**
	 * Domains context menu parent ID.
	 * @constant
	 * @returns {string} the parent menu item ID.
	 */
	static get PARENT_MENU_ID() {
		return 'DomainGenerationParent';
	}

	/**
	 * Domain menu item IDs prefix.
	 * @constant
	 * @returns {string} the prefix string.
	 */
	static get FILL_PREFIX() {
		return 'inject-alias-';
	}

	/**
	 * Generates a context menu ID for a specific domain.
	 * @private
	 * @param {string} domainName - The domain name to append.
	 * @param {string} [prefix=''] - The prefix to include.
	 * @returns {string} the menu item ID.
	 */
	static #getDomainMenuId(domainName, prefix = '') {
		return `${BackgroundController.FILL_PREFIX}${prefix}@${domainName}`;
	}

	/**
	 * Initializes event listeners and context menus.
	 * @returns {Promise<void>} when init completes.
	 */
	async init() {
		this.#setupListeners();
		await this.#loadAndCreateMenus();
	}

	/**
	 * Handles menu creation errors.
	 * @private
	 * @returns {void}
	 */
	#handleMenuError() {
		if (browser.runtime.lastError) {
			console.error(`Error: ${browser.runtime.lastError}`);
		}
	}

	/**
	 * Rebuilds context menus for custom domains.
	 * @private
	 * @param {Array<{domain: string, prefix?: string}>} domains - List of custom domains.
	 * @returns {Promise<void>} when updated.
	 */
	async #updateContextMenus(domains) {
		await browser.contextMenus.removeAll();

		const menuIcon = {
			16: 'icons/icon.svg',
		};

		if (!domains || domains.length === 0) {
			browser.contextMenus.create(
				{
					id: BackgroundController.CONFIGURE_MENU_ID,
					title: 'Configure Alias Settings...',
					contexts: ['all'],
					icons: menuIcon,
				},
				() => {
					this.#handleMenuError();
				}
			);
			return;
		}

		if (domains.length === 1) {
			const domainItem = domains[0];
			const domainName = domainItem.domain || domainItem;
			const prefix = domainItem.prefix || '';
			browser.contextMenus.create(
				{
					id: BackgroundController.#getDomainMenuId(domainName, prefix),
					title: prefix
						? `Generate Alias (${prefix}[site]@${domainName})`
						: 'Generate Email Alias',
					contexts: ['editable'],
					icons: menuIcon,
				},
				() => {
					this.#handleMenuError();
				}
			);
			return;
		}

		const parentId = BackgroundController.PARENT_MENU_ID;
		browser.contextMenus.create(
			{
				id: parentId,
				title: 'Generate Email Alias',
				contexts: ['editable'],
				icons: menuIcon,
			},
			() => {
				this.#handleMenuError();
			}
		);

		for (const domainItem of domains) {
			const domainName = domainItem.domain || domainItem;
			const prefix = domainItem.prefix || '';
			browser.contextMenus.create(
				{
					id: BackgroundController.#getDomainMenuId(domainName, prefix),
					parentId,
					title: prefix ? `${prefix}[site]@${domainName}` : `@${domainName}`,
					contexts: ['editable'],
				},
				() => {
					this.#handleMenuError();
				}
			);
		}
	}

	/**
	 * Retrieves custom domains and rebuilds context menus.
	 * @private
	 * @returns {Promise<void>} when loaded.
	 */
	async #loadAndCreateMenus() {
		const storage = await Utils.getStorage();
		const result = await storage.get('aliasDomains');
		const domains = result.aliasDomains || [];
		await this.#updateContextMenus(domains);
	}

	/**
	 * Handles context menu clicks.
	 * @private
	 * @param {browser.contextMenus.OnClickData} info - Event payload.
	 * @param {browser.tabs.Tab} tab - Tab where the click occurred.
	 * @returns {Promise<void>} when click action is handled.
	 */
	async #handleContextMenuClick(info, tab) {
		if (info.menuItemId === BackgroundController.CONFIGURE_MENU_ID) {
			await browser.runtime.openOptionsPage();
			return;
		}

		if (
			typeof info.menuItemId === 'string'
			&& info.menuItemId.startsWith(BackgroundController.FILL_PREFIX)
		) {
			if (!tab.url || (!tab.url.startsWith('http:') && !tab.url.startsWith('https:'))) {
				console.warn('Cannot inject scripts into restricted browser pages.');
				return;
			}

			const payload = info.menuItemId.substring(BackgroundController.FILL_PREFIX.length);
			const separatorIndex = payload.indexOf('@');
			const clickedPrefix = payload.substring(0, separatorIndex);
			const clickedDomain = payload.substring(separatorIndex + 1);

			const storage = await Utils.getStorage();
			const result = await storage.get(['aliasDomains', 'includeTld']);
			const domains = result.aliasDomains || [];

			const matchedDomain = domains.find((item) => {
				const itemDomain = item.domain || item;
				const itemPrefix = item.prefix || '';
				return itemDomain === clickedDomain && itemPrefix === clickedPrefix;
			});
			const prefix = matchedDomain && matchedDomain.prefix ? matchedDomain.prefix : '';

			try {
				await browser.scripting.executeScript({
					target: { tabId: tab.id },
					files: ['main.js'],
				});

				await browser.tabs.sendMessage(tab.id, {
					command: 'insertAlias',
					domain: clickedDomain,
					prefix,
					includeTld: result.includeTld !== false,
				});
			} catch (error) {
				console.error('Failed to inject script: ', error);
			}
		}
	}

	/**
	 * Registers event listeners.
	 * @private
	 * @returns {void}
	 */
	#setupListeners() {
		browser.storage.onChanged.addListener(async (changes, area) => {
			const storage = await Utils.getStorage();
			const isUsingSync = storage === browser.storage.sync;

			if ((isUsingSync && area === 'sync') || (!isUsingSync && area === 'local')) {
				if (changes.aliasDomains) {
					this.#updateContextMenus(changes.aliasDomains.newValue);
				}
			}

			if (area === 'local' && changes.useSync) {
				this.#loadAndCreateMenus();
			}
		});

		browser.runtime.onInstalled.addListener(() => {
			this.#loadAndCreateMenus();
		});

		browser.contextMenus.onClicked.addListener((info, tab) => {
			this.#handleContextMenuClick(info, tab);
		});
	}
}

const Background = new BackgroundController();
Background.init();
