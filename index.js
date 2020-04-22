const { WPCampusRequestElement } = require("@wpcampus/wpcampus-wc-default");
const stylesheet = require("./index.css");

// Format options for displaying blog posts.
const formatOptions = ["list", "excerpt"];
const formatDefault = "excerpt";

const loadingClass = "wpc-blog--loading";
const postsSelector = "wpc-blog__posts";

class WPCampusBlog extends WPCampusRequestElement {
	constructor() {
		const config = {
			componentID: "blog",
			localStorageKey: "wpcBlog",
			localStorageKeyTime: "wpcBlogTime",
			requestURL: "https://wpcampus.org/wp-json/wp/v2/posts?get_meta=1"
		};
		super(config);

		this.addStyles(stylesheet);

		if (this.dataset.format !== undefined) {
			this.format = this.dataset.format;
		}
		if (!formatOptions.includes(this.format)) {
			this.format = formatDefault;
		}
	}
	getTemplate(item) {
		let template = "";

		// Make sure have a title.
		let title = item.title.rendered ? item.title.rendered : null;
		if (!title) {
			return title;
		}

		// Make sure have a link.
		let link = item.link ? item.link : null;
		if (!link) {
			return link;
		}

		// Make sure have a excerpt.
		let excerpt = item.excerpt.basic ? item.excerpt.basic : null;
		if (!excerpt) {
			return template;
		}

		// Wrap title in link.
		template += `<a href="${link}">${title}</a>`;

		// Wrap title in heading.
		template = `<h3 class="wpc-blog__title">${template}</h3>`;

		// Add excerpt.
		template += `<div class="wpc-blog__excerpt"><p>${excerpt}</p></div>`;

		// Wrap in <div>.
		template = "<div class=\"wpc-blog__post\">" + template + "</div>";

		return template;
	}
	getHTMLMarkup(content, loading) {
		const templateDiv = document.createElement("div");

		let markup = `<div class="${postsSelector}">${content}</div>`;

		markup = this.wrapTemplateArea(markup);
		markup = this.wrapTemplate(markup, true);

		templateDiv.innerHTML = markup;

		if (true === loading) {
			templateDiv
				.querySelector(this.getWrapperSelector())
				.classList.add(loadingClass);
		}

		return templateDiv.innerHTML;
	}
	async loadContentError() {

		const content = "<p class=\"wpc-component__error-message\">There was a problem loading the blog posts.";

		const cssPrefix = this.getComponentCSSPrefix();
		this.classList.add(`${cssPrefix}--error`);

		this.innerHTML = this.getHTMLMarkup(content);

		return true;
	}
	loadContentHTML(content, loading) {
		const that = this;
		return new Promise((resolve, reject) => {
			if (!content || !content.length) {
				reject("There is no content to display.");
			}

			// Build new template.
			let newContent = "";

			// Get our limit of content.
			let contentLimit;
			if (that.limit !== undefined && that.limit > 0) {
				contentLimit = that.limit;
			} else {
				contentLimit = content.length;
			}

			for (let i = 0; i < contentLimit; i++) {
				let item = content[i];

				// Add to the rest of the messages.
				newContent += that.getTemplate(item);

			}

			if (!newContent) {
				return resolve(false);
			}

			// Wrap in global templates.
			// Only set loading if innerHTML is empty to begin with.
			let markup = that.getHTMLMarkup(newContent, loading && !that.innerHTML);

			if (!that.innerHTML) {

				// Load the markup.
				that.innerHTML = markup;

				if (true === loading) {
					setTimeout(() => {
						that
							.querySelector(that.getWrapperSelector())
							.classList.remove(loadingClass);
					}, 200);
				}

				return resolve(true);
			}

			// Get out of here if no message or the message is the same.
			let existingContent = that.querySelector(`.${postsSelector}`);
			if (newContent === existingContent.innerHTML) {
				return resolve(true);
			}

			// Get component wrapper.
			var componentDiv = that.querySelector(that.getWrapperSelector());

			that.fadeOut(componentDiv).then(() => {
				that.innerHTML = markup;
				that.fadeIn(componentDiv).then(() => {
					return resolve(true);
				});
			});
		});
	}
	async loadContentFromRequest() {
		const that = this;

		// Limit the number of requests we make. Can be reset by user activity.
		that.requestUpdateCount++;
		that.requestUpdateMax = that.checkPropertyNumber(
			that.requestUpdateMax,
			that.requestUpdateMaxDefault,
			true
		);

		if (that.requestUpdateCount > that.requestUpdateMax) {
			that.pauseTimer();
			return;
		}

		that.requestContent({ limitKey: "per_page" })
			.then((response) => {
				try {
					if (!response) {
						throw "The request had no response.";
					}

					// Convert string to object.
					const content = JSON.parse(response);

					that.loadContentHTML(content, true)
						.then((loaded) => {

							// This means the content was changed/updated.
							if (true === loaded) {
								that.storeLocalContent(content);
							}
						})
						.catch(() => {
							// @TODO what to do when the request doesn't work?
						});
				} catch (error) {
					// @TODO handle error
				}
			})
			.catch(() => {

				// If request didnt work, force load local content.
				that.loadContentFromLocal(true);
			})
			.finally(() => {
				that.setUpdateTimer();
			});
	}
	async render() {
		const that = this;
		super.render().then(() => {

			that.isRendering(true);

			that.setAttribute("role", "complementary");
			that.setAttribute("aria-live", "polite");
			that.setAttribute("aria-label", "Blog");

			that.loadContent().then(() => {
				that.isRendering(false);
			});
		});
	}
	connectedCallback() {
		super.connectedCallback();
		this.render();
	}
}
customElements.define("wpcampus-blog", WPCampusBlog);

module.exports = WPCampusBlog;
