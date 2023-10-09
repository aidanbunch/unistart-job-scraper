const Constants = require("../utils/constants.cjs");
const { delay } = require("../utils/utils.cjs");

async function scrapeYComb(page, url) {
	await page.goto(Constants.YComb.LoginUrl, {
		waitUntil: "networkidle2",
		timeout: 0,
	});

	// Login to YC
	const usernameInput = await page.$("#ycid-input");
	const passwordInput = await page.$("#password-input");
	await usernameInput.type(Constants.Credentials.Username);
	await passwordInput.type(Constants.Credentials.Password);
	await page.click(".sign-in-button");

	// wait for authentication to load and go through
	await delay(Constants.Delays.Long);

	// Scrape jobs
	let jobItems = [];
	for (let i = 0; i < 2; i++) {
		// run twice, once on entry level url (passed as arg), once on internships url
		if (i === 0) {
			await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
		} else if (i === 1) {
			await page.goto(Constants.YComb.InternshipsUrl, {
				waitUntil: "networkidle2",
				timeout: 0,
			});
		} else {
			break;
		}
		let previousJobListLength = await page.evaluate(() => {
			return document.querySelectorAll(".directory-list.list-compact > div")
				.length;
		});

		// loop to load all jobs on page before scraping
		while (true) {
			await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
			// Give items a chance to load
			await delay(Constants.Delays.Medium);

			const currentJobListLength = await page.evaluate(() => {
				return document.querySelectorAll(".directory-list.list-compact > div")
					.length;
			});

			if (currentJobListLength === previousJobListLength) {
				break;
			}

			previousJobListLength = currentJobListLength;
		}

		try {
			jobItems = jobItems.concat(
				await page.evaluate(() => {
					let companies = document.querySelectorAll(
						".directory-list .bg-beige-lighter"
					);
					let jobs = [];

					companies.forEach((company) => {
						let jobElements = company
							.querySelector(".mt-8")
							.querySelectorAll(".mb-4");

						jobElements.forEach((jobElement) => {
							try {
								const jobProperties = Array.from(
									jobElement.querySelector(
										".mr-2.text-sm.sm\\:mr-3.sm\\:flex.sm\\:flex-wrap"
									).children
								);

								const roleElements = jobProperties.filter((el) => {
									const text = el.innerText.toLowerCase();
									return (
										text.includes("fulltime") ||
										text.includes("contract") ||
										text.includes("internship")
									);
								});
								const formattedRole =
									roleElements.length > 0
										? roleElements[0].innerText.replace("time", " time")
										: null;

								const payElements = jobProperties.filter(
									(el) =>
										el.innerText.includes("K") && el.innerText.includes("-")
								);
								const experienceElements = jobProperties.filter((el) =>
									el.innerText.includes("Year")
								);

								const jobJson = {
									"Job Title":
										jobElement.querySelector(".job-name a").innerText,
									"Company Name":
										company.querySelector(".company-name").innerText,
									"Job Link": jobElement.querySelector(".job-name a").href,
									Role: formattedRole,
									"Experience requirement":
										experienceElements.length > 0
											? experienceElements[0].innerText
											: null,
									Pay:
										payElements.length > 0
											? /\d/.test(payElements[0].innerText)
												? payElements[0].innerText
												: null
											: null,
									Locations: [jobProperties[0].innerText],
									"Job Skills": null, // skills not listed on YC
									Posted: null, // YC doesn't provide this info
								};
								jobs.push(jobJson);
							} catch (exception) {
								console.log(exception);
							}
						});
					});
					return jobs; // Return the jobs array
				})
			);
		} catch (error) {
			console.error(error);
		}
	}
	return jobItems;
}

module.exports = scrapeYComb;
