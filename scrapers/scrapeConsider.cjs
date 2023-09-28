const Constants = require("../utils/constants.cjs");
const { delay } = require("../utils/utils.cjs");

async function scrapeConsider(page, url) {
	await delay(Constants.Delays.Short);
	await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

	let previousJobListLength = await page.evaluate(() => {
		return document.querySelectorAll(".job-list.job-list-grouped .job-list-job")
			.length;
	});

	// loop to load all jobs on page before scraping
	while (true) {
		await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
		// wait for page to load
		await delay(Constants.Delays.Medium);

		const currentJobListLength = await page.evaluate(() => {
			return document.querySelectorAll(
				".job-list.job-list-grouped .job-list-job"
			).length;
		});

		if (currentJobListLength === previousJobListLength) {
			break;
		}

		previousJobListLength = currentJobListLength;
	}

	let jobItems = [];
	try {
		const jobList = await page.evaluate(() => {
			const jobArray = [];
			const groupedJobContainers = document.querySelectorAll(
				".grouped-job-result"
			);

			groupedJobContainers.forEach((container) => {
				const companyNameElement = container.querySelector(
					".grouped-job-result-header a"
				);
				const companyNameText = companyNameElement
					.getAttribute("href")
					.split("/jobs/")[1];
				const companyName = companyNameText
					.split("-")
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(" ");

				const jobListContainer = container.querySelectorAll(".job-list-job");
				jobListContainer.forEach((job) => {
					const metaNodes = Array.from(
						job.querySelectorAll(".job-list-company-meta-item")
					);
					// location regex, matches strings like: "New York, NY", "Los Angeles, CA, USA", "Paris, France"
					// doesn't match words without commas like "Finance" or "Perception" since the keywords are found
					// in the same list as the locations
					const locationRegex =
						/^(?=.*,)[A-Za-z\s]+(?:,\s[A-Z]{2})?(?:,\s[A-Za-z\s]+)?$/;
					const locations = metaNodes
						.map((node) => node.innerText.trim())
						.filter((location) => locationRegex.test(location))
						.filter((location) => location.includes(","));

					const posted = metaNodes
						.map((node) => node.innerText.trim())
						.filter((node) => node.toLowerCase().includes("posted"));

					jobArray.push({
						"Job Title": job.querySelector(".job-list-job-title a").innerText,
						"Company Name": companyName,
						"Job Link": job.querySelector(".job-list-job-title a").href,
						Role: "Internship", // default to internship since we use internships only filter
						"Experience requirement": null,
						Pay: null,
						Locations: locations.length > 0 ? locations : null,
						"Job Skills": Array.from(
							job.querySelectorAll(".job-list-job-skill")
						).map((skill) => skill.innerText),
						Posted: posted.length > 0 ? posted[0] : null,
					});
				});
			});

			return jobArray;
		});

		return jobList;
	} catch (error) {
		console.error(error);
	}
	return jobItems;
}

module.exports = scrapeConsider;
