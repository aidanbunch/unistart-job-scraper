const Constants = require("../utils/constants.cjs");
const { delay } = require("../utils/utils.cjs");

async function scrapeTrueUp(page, url) {
	// must navigate to login instead of going to page directly
	// because of the way they handle auth state
	await page.goto(Constants.TrueUp.HomeUrl, {
		waitUntil: "networkidle2",
		timeout: 0,
	});
	await page.click("button.btn.btn-link.font-monospace.me-1.text-dark");
	await delay(Constants.Delays.Medium);

	// Login to TrueUp
	const usernameInput = await page.$("#username");
	const passwordInput = await page.$("#password");
	await usernameInput.type(Constants.Credentials.Username);
	await passwordInput.type(Constants.Credentials.Password);
	await page.waitForSelector("form.cc0f2cc98.c1a969c0b");
	await page.$eval("form.cc0f2cc98.c1a969c0b", (form) => form.submit());

	// wait for authentication to load and go through
	await delay(Constants.Delays.Long);

	// Scrape jobs
	await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
	await page.setViewport({
		width: Constants.WideViewportDimensions.width,
		height: Constants.WideViewportDimensions.height,
	}); // so filters are visible
	// auth state only loads after page is loaded via JS
	await delay(Constants.Delays.Medium);
	// all ul's with filters have same selectors due to tailwind, so we need to
	// find the one with the internship filter
	const ulWithInternship = await page.$x(
		'//ul[.//span[contains(text(), "Internship")]]'
	);

	let jobItems = [];
	if (ulWithInternship.length > 0) {
		const inputElements = await ulWithInternship[0].$$("input");
		// loop over the first two checkboxes and scrape jobs, first for the internship filter
		// then the entry/mid level filter
		for (let i = 0; i < 2; i++) {
			// uncheck all checkboxes
			for (let j = 0; j < inputElements.length; j++) {
				const isChecked = await page.evaluate(
					(el) => el.checked,
					inputElements[j]
				);
				if (isChecked) {
					await inputElements[j].click();
				}
			}
			// check the i-th checkbox
			await inputElements[i].click();
			await delay(Constants.Delays.Medium); // let new filters load

			let previousJobListLength = await page.evaluate(() => {
				return document.querySelectorAll(".mb-3.card").length;
			});

			// loop to load all jobs on page before scraping
			while (true) {
				// click show more button
				try {
					await page.waitForSelector(".ais-InfiniteHits-loadMore");
					await page.click(".ais-InfiniteHits-loadMore");
				} catch (error) {
					// TrueUp stops displaying show more button at 500 jobs hard limit
					break;
				}
				// Give items a chance to load
				await delay(Constants.Delays.Medium);

				const currentJobListLength = await page.evaluate(() => {
					return document.querySelectorAll(".mb-3.card").length;
				});

				if (currentJobListLength === previousJobListLength) {
					break;
				}

				previousJobListLength = currentJobListLength;
			}

			try {
				jobItems = jobItems.concat(
					await page.evaluate(() => {
						const jobs = [];
						const jobCards = document.querySelectorAll(".mb-3.card");

						jobCards.forEach((card) => {
							// first child node because second is an i tag with the region
							const jobTitleElement = card.querySelector(".fw-bold.mb-1 a");
							const jobTitle = jobTitleElement.childNodes[0].textContent.trim();

							const company = card.querySelector(".mb-2 a").textContent.trim();
							const jobLink = card.querySelector(".fw-bold.mb-1 a").href;

							const metaNodes = card.querySelectorAll(
								".overflow-hidden.text-secondary"
							);

							const location = metaNodes[0].textContent.trim();
							let locationNormalized;
							// selector sometimes returns when job was posted (like "17 days ago"), filter those out
							if (location.includes("day")) {
								locationNormalized = null;
							} else {
								// normalize locations from all caps to normal case ("NEW YORK" -> "New York")
								const locationParts = location.split(",");
								const locationPartsNormalized = locationParts.map((part) => {
									const words = part.split(" ");
									const wordsNormalized = words.map((word) => {
										return word.charAt(0) + word.slice(1).toLowerCase();
									});
									return wordsNormalized.join(" ");
								});
								locationNormalized = locationPartsNormalized.join(",");
							}

							const posted =
								metaNodes.length > 1
									? `Posted ${metaNodes[1].textContent.trim()} ago`
									: null;

							const experience = null; // not listed on trueup
							const pay = null; // not listed on trueup

							const jobSkills = [];
							try {
								const skillElements = card.querySelectorAll(
									".font-monospace.border.border-dark.rounded-4"
								);
								skillElements.forEach((skill) => {
									jobSkills.push(skill.textContent.trim());
								});
							} catch (error) {
								console.error(error);
							}

							const job = {
								"Job Title": jobTitle,
								"Company Name": company,
								"Job Link": jobLink,
								Role: jobTitle.toLowerCase().includes("intern")
									? "Internship"
									: "Full time", // all seem to be full time roles (besides internships)
								"Experience requirement": experience,
								Pay: /\d/.test(pay) ? pay : null,
								Locations: locationNormalized ? [locationNormalized] : null,
								"Job Skills": jobSkills.length > 0 ? jobSkills : null,
								Posted: posted,
							};

							jobs.push(job);
						});

						return jobs;
					})
				);
			} catch (error) {
				console.error(error);
			}
		}
	} else {
		console.error("Level filters list not found");
	}
	return jobItems;
}

module.exports = scrapeTrueUp;
