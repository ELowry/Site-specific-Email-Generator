/**
 * Controller for detecting input fields, managing mobile action icons, and filling aliases in content pages.
 */
class ExtensionController {
	/** @type {HTMLElement|null} */
	#hostElement = null;

	/** @type {HTMLElement|null} */
	#iconElement = null;

	/** @type {HTMLInputElement|HTMLTextAreaElement|null} */
	#activeInput = null;

	/** @type {EventListener|null} */
	#layoutChangeListener = null;

	/** @type {UtilsController|null} */
	#utils = null;

	/**
	 * Creates an instance of ExtensionController.
	 */
	constructor() {
		this.#hostElement = null;
		this.#iconElement = null;
		this.#activeInput = null;
		this.#layoutChangeListener = () => {
			if (this.#iconElement && this.#activeInput) {
				requestAnimationFrame(() => {
					this.#updateIconPosition();
				});
			}
		};
	}

	/**
	 * Shadow DOM stylesheet for isolating the icon from the host page.
	 *
	 * @constant
	 * @returns {string} The CSS string.
	 */
	static get SHADOW_CSS() {
		return `
			.icon-wrapper {
				display: flex;
				position: absolute;
				justify-content: center;
				align-items: center;
				transition: opacity 0.2s, background-color 0.2s;
				cursor: pointer;
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
				border-radius: 50%;
				background-color: #ddd8d6;
				padding: max(0.15rem, 0.15em);
				width: max(1.2rem, 1em);
				height: max(1.2rem, 1em);
				pointer-events: auto;

				&[data-theme='dark'] {
					background-color: #0f0d0f;
				}

				&::after {
					display: block;
					transition: background-color 0.2s;
					mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.5 8.28"/></g></svg>')
						no-repeat center;
					-webkit-mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.5 8.28"/></g></svg>')
						no-repeat center;
					background-color: #6d0a1f;
					width: max(0.9rem, 0.7em);
					height: max(0.9rem, 0.7em);
					content: '';
				}

				&[data-theme='dark']::after {
					background-color: #e29186;
				}
			}
		`;
	}

	/**
	 * Initializes listeners for DOM focus and extension messaging.
	 *
	 * @returns {void}
	 */
	async init() {
		import(browser.runtime.getURL('utils.js')).then((module) => {
			this.#utils = module;
		});

		browser.runtime.onMessage.addListener((message) => {
			this.#handleRuntimeMessage(message);
		});

		document.addEventListener('focusin', (event) => {
			this.#handleFocusIn(event);
		});

		document.addEventListener('focusout', () => {
			this.#handleFocusOut();
		});

		const checkExistingFocus = () => {
			if (document.activeElement && document.activeElement !== document.body) {
				this.#handleFocusIn({ target: document.activeElement });
			}
		};

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () =>
				setTimeout(checkExistingFocus, 100)
			);
		} else {
			setTimeout(checkExistingFocus, 100);
		}
	}

	/**
	 * Locates the nearest valid input field relative to a given element.
	 *
	 * @private
	 * @param {Element|null} baseElement - The DOM node to start searching from.
	 * @returns {HTMLInputElement|HTMLTextAreaElement|null} The located input, or null.
	 */
	#findClosestInput(baseElement) {
		if (!baseElement) {
			return null;
		}

		if (baseElement.tagName === 'INPUT' || baseElement.tagName === 'TEXTAREA') {
			return /** @type {HTMLInputElement|HTMLTextAreaElement} */ (baseElement);
		}

		const query =
			'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea';

		const innerInput = baseElement.querySelector(query);
		if (innerInput) {
			return /** @type {HTMLInputElement|HTMLTextAreaElement} */ (innerInput);
		}

		const parent = baseElement.parentElement;
		if (parent) {
			const siblingInput = parent.querySelector(query);
			if (siblingInput) {
				return /** @type {HTMLInputElement|HTMLTextAreaElement} */ (siblingInput);
			}
		}

		return null;
	}

	/**
	 * Determines the theme based on the input's background color and updates the icon.
	 *
	 * @private
	 * @param {Element} inputElement - The active input element.
	 * @returns {void}
	 */
	#updateTheme(inputElement) {
		if (!this.#iconElement || !inputElement) {
			return;
		}

		let bgElement = inputElement;
		let rgb = [];
		let alpha = 0;

		while (bgElement) {
			const bgColor = window.getComputedStyle(bgElement).backgroundColor;

			if (bgColor === 'transparent') {
				alpha = 0;
			} else {
				const values = bgColor.match(/[\d.]+/g);
				if (values && values.length >= 3) {
					rgb = values.slice(0, 3).map(Number);
					alpha = values.length === 4 ? parseFloat(values[3]) : 1;
				}
			}

			if (alpha >= 0.4) {
				break;
			}

			bgElement = bgElement.parentElement;
		}

		if (alpha < 0.4 || rgb.length < 3) {
			rgb = [255, 255, 255];
		}

		const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;

		if (brightness < 128) {
			this.#iconElement.setAttribute('data-theme', 'dark');
		} else {
			this.#iconElement.setAttribute('data-theme', 'light');
		}
	}

	/**
	 * Positions and displays the email generator icon over the target input inside a Shadow DOM.
	 *
	 * @private
	 * @param {HTMLInputElement|HTMLTextAreaElement} inputTarget - Input receiving focus.
	 * @returns {void}
	 */
	#showIcon(inputTarget) {
		if (!this.#hostElement) {
			this.#hostElement = document.createElement('div');
			this.#hostElement.id = 'alias-widget-root';
			this.#hostElement.style.cssText =
				'position: absolute; top: 0; left: 0; z-index: 2147483647; pointer-events: none;';

			const shadowRoot = this.#hostElement.attachShadow({ mode: 'closed' });

			const style = document.createElement('style');
			style.textContent = ExtensionController.SHADOW_CSS;

			const icon = document.createElement('div');
			icon.className = 'icon-wrapper';

			icon.addEventListener('mousedown', async (event) => {
				event.preventDefault();
				event.stopPropagation();

				const storage = await this.#utils.getStorage();
				const result = await storage.get(['aliasDomains', 'includeTld']);
				const domains = result.aliasDomains || [];

				if (domains.length > 0) {
					const firstDomain = domains[0];
					const domainName = firstDomain.domain || firstDomain;
					const prefix = firstDomain.prefix || '';
					const includeTld = result.includeTld !== false;

					this.triggerAliasInjection(domainName, prefix, includeTld, inputTarget);
				}
			});

			shadowRoot.appendChild(style);
			shadowRoot.appendChild(icon);
			document.body.appendChild(this.#hostElement);

			this.#iconElement = icon;

			window.addEventListener('resize', this.#layoutChangeListener);
			window.addEventListener('scroll', this.#layoutChangeListener, true);
		}

		this.#updateTheme(inputTarget);
		this.#updateIconPosition();
	}

	/**
	 * Removes the floating host element and its Shadow DOM from the document.
	 *
	 * @private
	 * @returns {void}
	 */
	#hideIcon() {
		if (this.#hostElement) {
			window.removeEventListener('resize', this.#layoutChangeListener);
			window.removeEventListener('scroll', this.#layoutChangeListener, true);

			this.#hostElement.remove();
			this.#hostElement = null;
			this.#iconElement = null;
			this.#activeInput = null;
		}
	}

	/**
	 * Recalculates and updates the absolute position of the icon based on the active input.
	 *
	 * @private
	 * @returns {void}
	 */
	#updateIconPosition() {
		if (!this.#iconElement || !this.#activeInput) {
			return;
		}

		const rect = this.#activeInput.getBoundingClientRect();
		this.#iconElement.style.top = `${window.scrollY + rect.top + rect.height / 2 - 12}px`;
		this.#iconElement.style.left = `${window.scrollX + rect.right - 32}px`;
	}

	/**
	 * Handles message events from background or popup scripts.
	 *
	 * @private
	 * @param {object} message - Message payload.
	 * @returns {void}
	 */
	#handleRuntimeMessage(message) {
		if (message.command === 'insertAlias') {
			this.triggerAliasInjection(
				message.domain,
				message.prefix,
				message.includeTld,
				document.activeElement
			);
		}
	}

	/**
	 * Inspects focused elements and attaches generator triggers on email fields.
	 *
	 * @private
	 * @param {FocusEvent|Object} event - Focusin event or synthetic event payload.
	 * @returns {void}
	 */
	#handleFocusIn(event) {
		let target = event.target;

		if (target && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
			if (typeof target.querySelector === 'function') {
				const innerInput = target.querySelector(
					'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'
				);
				if (innerInput) {
					target = innerInput;
				}
			}
		}

		if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
			const type = target.type.toLowerCase();
			const name = (target.name || '').toLowerCase();
			const id = (target.id || '').toLowerCase();

			if (type === 'email' || name.includes('email') || id.includes('email')) {
				this.#activeInput = target;

				requestAnimationFrame(() => {
					if (document.body) {
						this.#showIcon(target);
					}
				});
			}
		}
	}

	/**
	 * Dismisses the generator trigger icon when blur occurs outside the active field.
	 *
	 * @private
	 * @returns {void}
	 */
	#handleFocusOut() {
		setTimeout(() => {
			if (this.#iconElement && document.activeElement !== this.#activeInput) {
				this.#hideIcon();
			}
		}, 150);
	}

	/**
	 * Injects the generated alias into the targeted input element.
	 *
	 * @param {string} domain - Domain name for alias generation.
	 * @param {string} [prefix=''] - Optional alias prefix.
	 * @param {boolean} [includeTld=true] - Whether to include the top-level domain.
	 * @param {Element|null} [targetInput] - Target element to receive the value.
	 * @returns {void}
	 */
	triggerAliasInjection(domain, prefix = '', includeTld = true, targetInput = null) {
		const initialTarget = targetInput || document.activeElement;
		const target = this.#findClosestInput(initialTarget);

		if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
			return;
		}

		if (target.type === 'password' || !domain) {
			return;
		}

		try {
			const siteIdentifier = this.#utils.parseDomainContext(
				window.location.hostname,
				includeTld
			);
			target.value = `${prefix}${siteIdentifier}@${domain}`;
			target.dispatchEvent(new Event('input', { bubbles: true }));
			target.dispatchEvent(new Event('change', { bubbles: true }));
			this.#hideIcon();
		} catch (error) {
			console.error('Failed to generate email alias:', error);
		}
	}
}

if (typeof window.aliasWidgetInjected === 'undefined') {
	window.aliasWidgetInjected = true;
	const Content = new ExtensionController();
	Content.init();
}
