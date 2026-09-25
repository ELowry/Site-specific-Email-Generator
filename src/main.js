/**
 * Detects input fields, manages mobile action icons, and injects custom emails into content pages.
 */
class ExtensionController {
	/** @type {HTMLElement|null} */
	#hostElement = null;

	/** @type {HTMLElement|null} */
	#iconElement = null;

	/** @type {HTMLInputElement|HTMLTextAreaElement|null} */
	#activeInput = null;

	/** @type {EventListener|null} */
	#onLayoutChange = null;

	/** @type {Object|null} */
	#utils = null;

	/** @type {Object|null} */
	#i18n = null;

	/** @type {number} */
	#domainIndex = 0;

	constructor() {
		this.#hostElement = null;
		this.#iconElement = null;
		this.#activeInput = null;
		this.#i18n = null;
		this.#domainIndex = 0;
		this.#onLayoutChange = () => {
			if (this.#iconElement && this.#activeInput) {
				requestAnimationFrame(() => {
					this.#updateIconPosition();
				});
			}
		};
	}

	/**
	 * Stylesheet for the icon shadow DOM.  
	 * Ensures the icon doesn't interfere with the normal page DOM.
	 * @constant
	 * @returns {string} the full CSS.
	 */
	static get SHADOW_CSS() {
		return `
:host {
	display: block;
	position: absolute;
	z-index: 2147483647;
	width: 0;
	height: 0;
	overflow: visible;
	pointer-events: none;
}

.icon-wrapper {
	all: unset;
	display: flex;
	position: absolute;
	justify-content: center;
	align-items: center;
	transition:
		opacity 0.2s,
		background-color 0.2s,
		outline 0.2s;
	cursor: pointer;
	box-sizing: border-box;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	border-radius: 50%;
	background-color: #ddd8d6;
	padding: max(0.15rem, 0.15em);
	width: max(1.2rem, 1em);
	height: max(1.2rem, 1em);
	pointer-events: auto;

	@media (prefers-color-scheme: dark) {
		background-color: #0f0d0f;
	}

	&[data-theme='dark'] {
		background-color: #0f0d0f;
	}

	&[data-theme='light'] {
		background-color: #ddd8d6;
	}

	&:focus-visible {
		outline: 2px solid #6d0a1f;
		outline-offset: 2px;
	}

	@media (prefers-color-scheme: dark) {
		&:focus-visible {
			outline-color: #e29186;
		}
	}

	&::after {
		display: block;
		mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.5 8.28"/></g></svg>')
			no-repeat center;
		-webkit-mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.5 8.28"/></g></svg>')
			no-repeat center;
		transition: background-color 0.2s;
		background-color: #6d0a1f;
		width: max(0.9rem, 0.7em);
		height: max(0.9rem, 0.7em);
		content: '';
	}

	@media (prefers-color-scheme: dark) {
		&::after {
			background-color: #e29186;
		}
	}

	&[data-theme='dark']::after {
		background-color: #e29186;
	}

	&[data-theme='light']::after {
		background-color: #6d0a1f;
	}
}
		`;
	}

	/**
	 * Initializes DOM focus listeners and extension messaging.
	 * @returns {void}
	 */
	async init() {
		const module = await import(browser.runtime.getURL('utils.js'));
		this.#utils = module.Utils;

		const i18nModule = await import(browser.runtime.getURL('i18n.js'));
		this.#i18n = i18nModule.I18n;

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
	 * Locates the nearest valid input field.
	 * @private
	 * @param {Element|null} baseElement - The starting DOM element.
	 * @returns {HTMLInputElement|HTMLTextAreaElement|null} the located input | null.
	 */
	#findClosestInput(baseElement) {
		if (!baseElement) {
			return null;
		}

		if (baseElement.tagName === 'INPUT' || baseElement.tagName === 'TEXTAREA') {
			return baseElement;
		}

		const query =
			'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea';

		const innerInput = baseElement.querySelector(query);
		if (innerInput) {
			return innerInput;
		}

		const parent = baseElement.parentElement;
		if (parent) {
			const siblingInput = parent.querySelector(query);
			if (siblingInput) {
				return siblingInput;
			}
		}

		return null;
	}

	/**
	 * Sets the icon theme based on the input's background color.
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
	 * Injects the email generator icon inside a Shadow DOM.
	 * @private
	 * @param {HTMLInputElement|HTMLTextAreaElement} inputTarget - Input receiving focus.
	 * @returns {void}
	 */
	async #showIcon(inputTarget) {
		this.#domainIndex = 0;

		if (!this.#hostElement) {
			this.#hostElement = document.createElement('div');
			this.#hostElement.id = 'DomainsWidgetRoot';

			const shadowRoot = this.#hostElement.attachShadow({ mode: 'closed' });

			const style = document.createElement('style');
			style.textContent = ExtensionController.SHADOW_CSS;

			const icon = document.createElement('button');
			icon.type = 'button';
			icon.className = 'icon-wrapper';
			icon.setAttribute('aria-label', this.#i18n.getMessage('contentScriptIconAriaLabel'));

			const storage = await this.#utils.getStorage();
			const result = await storage.get(['aliasDomains']);
			const domains = result.aliasDomains || [];

			icon.title =
				domains.length > 1
					? this.#i18n.getMessage('contentScriptIconTitleMultipleDomains')
					: this.#i18n.getMessage('contentScriptIconTitleSingleDomain');

			const handleTrigger = async (event) => {
				event.preventDefault();
				event.stopPropagation();

				const currentStorage = await this.#utils.getStorage();
				const currentResult = await currentStorage.get(['aliasDomains', 'includeTld']);
				const currentDomains = currentResult.aliasDomains || [];

				if (currentDomains.length > 0) {
					const currentDomainData = currentDomains[this.#domainIndex];
					const domainName = currentDomainData.domain || currentDomainData;
					const prefix = currentDomainData.prefix || '';
					const includeTld = currentResult.includeTld !== false;

					this.triggerAliasInjection(domainName, {
						prefix,
						includeTld,
						targetInput: this.#activeInput,
						closeIcon: currentDomains.length === 1,
					});

					this.#domainIndex = (this.#domainIndex + 1) % currentDomains.length;
				}
			};

			icon.addEventListener('click', handleTrigger);

			this.#iconElement = icon;

			this.#updateTheme(inputTarget);

			shadowRoot.appendChild(style);
			shadowRoot.appendChild(icon);

			if (inputTarget.parentNode) {
				inputTarget.parentNode.insertBefore(this.#hostElement, inputTarget.nextSibling);
			} else {
				document.body.appendChild(this.#hostElement);
			}

			window.addEventListener('resize', this.#onLayoutChange);
			window.addEventListener('scroll', this.#onLayoutChange, true);
		} else {
			this.#updateTheme(inputTarget);
		}

		this.#updateIconPosition();
	}

	/**
	 * Clears the Shadow DOM from the document.
	 * @private
	 * @returns {void}
	 */
	#hideIcon() {
		if (this.#hostElement) {
			window.removeEventListener('resize', this.#onLayoutChange);
			window.removeEventListener('scroll', this.#onLayoutChange, true);

			this.#hostElement.remove();
			this.#hostElement = null;
			this.#iconElement = null;
			this.#activeInput = null;
		}
	}

	/**
	 * Moves the icon to the active input.
	 * @private
	 * @returns {void}
	 */
	#updateIconPosition() {
		if (!this.#iconElement || !this.#activeInput || !this.#hostElement) {
			return;
		}

		const inputRect = this.#activeInput.getBoundingClientRect();
		const hostRect = this.#hostElement.getBoundingClientRect();

		const relativeTop = inputRect.top - hostRect.top;
		const relativeLeft = inputRect.left - hostRect.left;

		this.#iconElement.style.top = `${relativeTop + inputRect.height / 2 - 12}px`;
		this.#iconElement.style.left = `${relativeLeft + inputRect.width - 32}px`;
	}

	/**
	 * Handles extension messages.
	 * @private
	 * @param {object} message - Message payload.
	 * @returns {void}
	 */
	#handleRuntimeMessage(message) {
		if (message.command === 'insertAlias') {
			this.triggerAliasInjection(message.domain, {
				prefix: message.prefix,
				includeTld: message.includeTld,
				targetInput: document.activeElement,
			});
		}
	}

	/**
	 * Attaches generator triggers on email fields upon focus.
	 * @private
	 * @param {FocusEvent|Object} event - Focusin event.
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
	 * Hides the icon when removing focus from a valid input.
	 * @private
	 * @returns {void}
	 */
	#handleFocusOut() {
		setTimeout(() => {
			if (
				this.#iconElement
				&& document.activeElement !== this.#activeInput
				&& document.activeElement !== this.#hostElement
			) {
				this.#hideIcon();
			}
		}, 150);
	}

	/**
	 * Injects the generated custom email into an input.
	 * @param {string} domain - Custom domain name.
	 * @param {Object} [options={}] - Injection configuration.
	 * @param {string} [options.prefix=''] - Custom prefix.
	 * @param {boolean} [options.includeTld=true] - Whether to include the TLD.
	 * @param {Element|null} [options.targetInput=null] - Target element.
	 * @param {boolean} [options.closeIcon=true] - Whether to dismiss the icon after injection.
	 * @returns {void}
	 */
	triggerAliasInjection(
		domain,
		{ prefix = '', includeTld = true, targetInput = null, closeIcon = true } = {}
	) {
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

			if (closeIcon) {
				this.#hideIcon();
			}
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
