const Constants = require("../utils/constants.cjs");
const { delay } = require("../utils/utils.cjs");

async function scrapeBuiltIn(page, url) {
	await delay(Constants.Delays.Medium)
	await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
	await page.setViewport({
		width: Constants.WideViewportDimensions.width,
		height: Constants.WideViewportDimensions.height,
	});

	let jobItems = [];

	while (true) {
		// builtin uses pagination instead of infinite list, so we need to load all pages
		// load all jobs in a page, then click next page button until end of list
		try {
			await delay(Constants.Delays.Medium);
			jobItems = jobItems.concat(
				await page.evaluate(() => {
					const topJobElements = document.querySelectorAll(
						"#search-results-top .job-bounded-responsive"
					);
					const bottomJobElements = document.querySelectorAll(
						"#search-results-bottom .job-bounded-responsive"
					);
					const jobElements = [...topJobElements, ...bottomJobElements];

					const jobs = [];

					for (const jobElement of jobElements) {
						const jobTitle = jobElement.querySelector("h2 a").innerText;
						const companyName = jobElement.querySelector(
							'[data-id="company-title"] span'
						).innerText;
						const jobLink = jobElement.querySelector("h2 a").href;
						const role = jobTitle.toLowerCase().includes("intern")
							? "Internship"
							: "Full time"; // not shown, full time if not internship

						const tagElements = jobElement.querySelectorAll(".d-flex div span");

						let experienceRequirement = null;
						let posted = null;
						for (const tagElement of tagElements) {
							// checks if the text content has "Years" in it, if so, it's the experience requirement
							if (tagElement.textContent.toLowerCase().includes("years")) {
								experienceRequirement = tagElement.textContent;
							}
							// checks if the text content has "ago" in it, if so, it's the posted date
							if (tagElement.textContent.toLowerCase().includes("ago")) {
								posted = `Posted ${tagElement.textContent}`;
							}
						}
						const pay = null; // not returned by builtin

						const location = tagElements[2].textContent;
						const jobSkills = []; // not returned by builtin

						jobs.push({
							"Job Title": jobTitle,
							"Company Name": companyName,
							"Job Link": jobLink,
							Role: role,
							"Experience requirement": experienceRequirement,
							Pay: pay,
							Locations: [location],
							"Job Skills": jobSkills.length > 0 ? jobSkills : null,
							Posted: posted,
						});
					}

					return jobs;
				})
			);
			// Try to find a "Next" button
			const nextButton = await page.evaluate(() => {
				const nextButtonElement = document.querySelector(
					'a[aria-label="Go to Next Page"]'
				);
				const isDisabled = nextButtonElement
					? nextButtonElement.classList.contains("disabled")
					: true;
				return !isDisabled && nextButtonElement ? nextButtonElement.href : null;
			});

			// If a "Next" button was found and it's not disabled, navigate to the next page
			if (nextButton) {
				await delay(Constants.Delays.Medium)
				await page.goto(nextButton, { waitUntil: "networkidle2", timeout: 0 });
			} else {
				// If no "Next" button was found or it's disabled, we're done
				break;
			}
		} catch (error) {
			console.error(error);
		}
	}

	return jobItems;
}

module.exports = scrapeBuiltIn;
