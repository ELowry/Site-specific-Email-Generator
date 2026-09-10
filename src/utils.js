const PUBLIC_SUFFIX_LIST = ['co', 'com', 'net', 'org', 'gov', 'edu', 'ac', 'io', 'me', 'tv'];

/**
 * Resolves active storage area based on user synchronization preference.
 * @returns {Promise<browser.storage.StorageArea>} Active storage area.
 */
export async function getStorage() {
	const { useSync } = await browser.storage.local.get('useSync');
	return useSync ? browser.storage.sync : browser.storage.local;
}

/**
 * Derives the site name identifier from a hostname.
 * @param {string} hostname - Target URL hostname.
 * @param {boolean} includeTld - Whether to append the top-level domain.
 * @returns {string} Site name identifier.
 */
export function parseDomainContext(hostname, includeTld) {
	const parts = hostname.split('.');
	if (parts.length < 2) {
		return hostname;
	}

	const tld = parts[parts.length - 1];
	const secondLevel = parts[parts.length - 2];

	if (parts.length >= 3 && tld.length === 2 && PUBLIC_SUFFIX_LIST.includes(secondLevel)) {
		return includeTld ? parts.slice(parts.length - 3).join('.') : parts[parts.length - 3];
	}

	return includeTld ? parts.slice(parts.length - 2).join('.') : parts[parts.length - 2];
}
