/**
 * Controller for extension background operations, context menus, and messaging.
 */
class BackgroundController {
	/**
	 * Creates an instance of BackgroundController.
	 */
	constructor() {}

	/**
	 * Context menu ID for configuring the extension.
	 *
	 * @constant
	 * @returns {string} The menu item ID.
	 */
	static get CONFIGURE_MENU_ID() {
		return 'open-settings-menu';
	}

	/**
	 * Context menu parent ID for multiple domains.
	 *
	 * @constant
	 * @returns {string} The parent menu item ID.
	 */
	static get PARENT_MENU_ID() {
		return 'alias-generation-parent';
	}

	/**
	 * Prefix used for domain menu item IDs.
	 *
	 * @constant
	 * @returns {string} The prefix string.
	 */
	static get FILL_PREFIX() {
		return 'inject-alias-';
	}

	/**
	 * Initializes event listeners and sets up context menus.
	 *
	 * @returns {Promise<void>} Resolves when initialization completes.
	 */
	async init() {
		this.#setupListeners();
		await this.#loadAndCreateMenus();
	}

	/**
	 * Resolves active storage area based on synchronization preference.
	 *
	 * @private
	 * @returns {Promise<browser.storage.StorageArea>} Active storage area.
	 */
	async #getStorage() {
		const { useSync } = await browser.storage.local.get('useSync');
		return useSync ? browser.storage.sync : browser.storage.local;
	}

	/**
	 * Handles runtime errors during menu creation.
	 *
	 * @private
	 * @returns {void}
	 */
	#handleMenuError() {
		if (browser.runtime.lastError) {
			console.error(`Error: ${browser.runtime.lastError}`);
		}
	}

	/**
	 * Rebuilds context menus based on available custom domains.
	 *
	 * @private
	 * @param {Array<{domain: string, prefix?: string}>} domains - List of configured domains.
	 * @returns {Promise<void>} Resolves when menus are updated.
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
					id: `${BackgroundController.FILL_PREFIX}${domainName}`,
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
					id: `${BackgroundController.FILL_PREFIX}${domainName}`,
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
	 * Fetches stored domains and rebuilds context menus.
	 *
	 * @private
	 * @returns {Promise<void>} Resolves when loaded.
	 */
	async #loadAndCreateMenus() {
		const result = await browser.storage.sync.get('aliasDomains');
		const domains = result.aliasDomains || [];
		await this.#updateContextMenus(domains);
	}

	/**
	 * Handles context menu clicks to open options or trigger alias insertion.
	 *
	 * @private
	 * @param {browser.contextMenus.OnClickData} info - Menu click event payload.
	 * @param {browser.tabs.Tab} tab - Tab where the click occurred.
	 * @returns {Promise<void>} Resolves when click action handled.
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
			const clickedDomain = info.menuItemId.replace(BackgroundController.FILL_PREFIX, '');
			const storage = await this.#getStorage();
			const result = await storage.get(['aliasDomains', 'includeTld']);
			const domains = result.aliasDomains || [];
			const matchedDomain = domains.find((item) => {
				return (item.domain || item) === clickedDomain;
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
	 * Registers browser runtime and storage event listeners.
	 *
	 * @private
	 * @returns {void}
	 */
	#setupListeners() {
		browser.storage.onChanged.addListener((changes, area) => {
			if (area === 'sync' && changes.aliasDomains) {
				this.#updateContextMenus(changes.aliasDomains.newValue);
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
