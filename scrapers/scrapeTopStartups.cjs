const Constants = require("../utils/constants.cjs");
const { delay } = require("../utils/utils.cjs");

async function scrapeTopStartups(page, url) {
	await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
	await page.setViewport({
		width: Constants.WideViewportDimensions.width,
		height: Constants.WideViewportDimensions.height,
	});

	// must click show more button once before loading by scrolling works
	await page.click(".infinite-more-link");

	let previousJobListLength = await page.evaluate(() => {
		return document.querySelectorAll(".infinite-container .infinite-item")
			.length;
	});

	// loop to load all jobs on page before scraping
	while (true) {
		await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
		// Give items a chance to load
		await delay(Constants.Delays.Medium);

		const currentJobListLength = await page.evaluate(() => {
			return document.querySelectorAll(".infinite-container .infinite-item")
				.length;
		});

		if (currentJobListLength === previousJobListLength) {
			break;
		}

		previousJobListLength = currentJobListLength;
	}

	let jobItems = [];

	try {
		jobItems = await page.evaluate(() => {
			const jobCards = Array.from(
				document.querySelectorAll(".infinite-container .infinite-item")
			);

			let jobObjects = jobCards.map((jobCard) => {
				let job = {};

				const titleElement = jobCard.querySelector("h5#job-title");
				const companyElement = jobCard.querySelector("a#startup-website-link");
				const jobLinkElement = jobCard.querySelector("a#apply-button");
				const experienceElementArray = Array.from(
					jobCard.querySelectorAll("h7")
				).filter((el) => el.innerText.includes("Experience:"));
				const locationElementArray = Array.from(
					jobCard.querySelectorAll("h7")
				).filter((el) => el.innerHTML.includes("fa-map-marker-alt"));
				const skillsElementArray = Array.from(
					jobCard.querySelectorAll(".badge.rounded-pill.bg-success")
				);
				const postedElementArray = Array.from(
					jobCard.querySelectorAll("h7")
				).filter((el) => el.innerText.includes("Posted:"));

				job["Job Title"] = titleElement ? titleElement.innerText : null;
				job["Company Name"] = companyElement ? companyElement.innerText : null;
				job["Job Link"] = jobLinkElement ? jobLinkElement.href : null;
				job["Role"] = "Full time"; // full time roles offered
				job["Experience requirement"] =
					experienceElementArray.length > 0
						? experienceElementArray[0].innerText.split(": ")[1]
						: null;
				job["Pay"] = null;
				job["Locations"] =
					locationElementArray.length > 0
						? locationElementArray[0].innerText
								.split("|")
								.map((location) => location.trim())
						: null;
				// also filter any skills that are empty string like ""
				job["Job Skills"] = skillsElementArray
					.map((el) => el.innerText.trim())
					.filter((skill) => skill !== "");
				job["Posted"] =
					postedElementArray.length > 0
						? `Posted ${postedElementArray[0].innerText
								.split(":")[1]
								.trim()
								.toLowerCase()}`
						: null;

				return job;
			});

			// filter any job objects that have null for "Job Link"
			jobObjects = jobObjects.filter((job) => job["Job Link"] !== null);
			return jobObjects;
		});
	} catch (error) {
		console.error(error);
	}

	return jobItems;
}

module.exports = scrapeTopStartups;
