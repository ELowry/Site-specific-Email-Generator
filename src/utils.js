/**
 * Shared utility functions.
 */
class UtilsController {
	constructor() {}

	/**
	 * List of TLD sections that are a part of two-part TLDs.
	 * @constant
	 * @returns {Array<string>} the array of TLD sections.
	 */
	static get PUBLIC_SUFFIX_LIST() {
		return ['co', 'com', 'net', 'org', 'gov', 'edu', 'ac', 'io', 'me', 'tv'];
	}

	/**
	 * Gets the active storage area based on sync preference.
	 * @returns {Promise<browser.storage.StorageArea>} the active storage area.
	 */
	async getStorage() {
		const { useSync } = await browser.storage.local.get('useSync');
		return useSync ? browser.storage.sync : browser.storage.local;
	}

	/**
	 * Gets the site name from a hostname.
	 * @param {string} hostname - Target URL hostname.
	 * @param {boolean} [includeTld=true] - Whether to append the TLD.
	 * @returns {string} the site name.
	 */
	parseDomainContext(hostname, includeTld = true) {
		const parts = hostname.split('.');
		if (parts.length < 2) {
			return hostname;
		}

		const tld = parts[parts.length - 1];
		const secondLevel = parts[parts.length - 2];

		if (
			parts.length >= 3
			&& tld.length === 2
			&& UtilsController.PUBLIC_SUFFIX_LIST.includes(secondLevel)
		) {
			return includeTld ? parts.slice(parts.length - 3).join('.') : parts[parts.length - 3];
		}

		return includeTld ? parts.slice(parts.length - 2).join('.') : parts[parts.length - 2];
	}
}

export const Utils = new UtilsController();
