/**
 * Controls global UI feedback messages.
 */
class FeedbackController {
	/** @type {HTMLElement|null} */
	#activeContainer;

	/** @type {number|null} */
	#timeoutId;

	constructor() {
		this.#activeContainer = null;
		this.#timeoutId = null;
	}

	/**
	 * The default duration for feedback messages in milliseconds.
	 *
	 * @constant
	 * @returns {number} Default duration in milliseconds.
	 */
	static get DEFAULT_DURATION() {
		return 3000;
	}

	/**
	 * @private
	 * @returns {void}
	 */
	#hideMessage() {
		if (!this.#activeContainer) {
			return;
		}

		this.#activeContainer.classList.remove('is-visible');
		this.#activeContainer = null;
	}

	/**
	 * Displays a feedback message to the user in the specified container.
	 *
	 * @param {string} message - The text to display.
	 * @param {Object} [options={}] - Configuration options.
	 * @param {string} [options.type='info'] - The type of feedback (e.g., 'success', 'error', 'info').
	 * @param {number} [options.duration=FeedbackController.DEFAULT_DURATION] - Time in milliseconds before hiding.
	 * @param {string} [options.targetId='PopupFeedback'] - The DOM ID of the target container.
	 * @returns {void}
	 */
	showMessage(
		message,
		{
			type = 'info',
			duration = FeedbackController.DEFAULT_DURATION,
			targetId = 'PopupFeedback',
		} = {}
	) {
		if (this.#timeoutId) {
			clearTimeout(this.#timeoutId);
		}

		if (this.#activeContainer && this.#activeContainer.id !== targetId) {
			this.#hideMessage();
		}

		const container = document.getElementById(targetId);

		if (!container) {
			return;
		}

		const content = container.querySelector('.feedback-content');

		if (!content) {
			return;
		}

		this.#activeContainer = container;
		content.textContent = message;
		container.className = `feedback-box is-${type} is-visible`;

		container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

		this.#timeoutId = setTimeout(() => {
			this.#hideMessage();
		}, duration);
	}
}

export const Feedback = new FeedbackController();
