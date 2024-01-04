const Constants = require("../utils/constants.cjs");
const { delay } = require("../utils/utils.cjs");
const axios = require("axios");

async function scrapeSimplifyGithub(page, url) {
	const { createMarkdownArrayTable } = await import("parse-markdown-table");

	// Download the markdown file
	const response = await axios.get(url);
	const content = response.data;

	// Split the content into lines
	const lines = content.split("\n");

	// Find the start and end of the table
	// print every line with a number next to it to find the line numbers
	// console.log(lines.map((line, index) => `${index}: ${line}`).join("\n"));
	const startIndex =
		lines.findIndex((line) => line.includes("TABLE_START")) + 2;
	const endIndex = lines.findIndex((line) => line.includes("TABLE_END")) - 2;

	// Extract the table content
	const tableContent = lines.slice(startIndex, endIndex).join("\n");

	// Parse the markdown table
	const table = await createMarkdownArrayTable(tableContent);

	let jobs = [];
	for await (const row of table.rows) {
		console.log(row)
		const jobTitle = row[2];
		const companyNameMatch = row[2].match(/\[(.*?)\]/);
		const companyName = companyNameMatch ? companyNameMatch[1] : null;
		const jobLinkMatch = row[2].match(/\((https?:\/\/[^)]+)\)/);
		const jobLink = jobLinkMatch ? jobLinkMatch[1] : null;
		const locations = [row[3]];

		// console.log(
		// 	JSON.stringify({
		// 		"Job Title": jobTitle,
		// 		"Company Name": companyName,
		// 		"Job Link": jobLink,
		// 		Role: "Internship",
		// 		"Experience requirement": null,
		// 		Pay: null,
		// 		Locations: locations,
		// 		"Job Skills": [],
		// 		Posted: null,
		// 	})
		// );

		jobs.push({
			"Job Title": jobTitle,
			"Company Name": companyName,
			"Job Link": jobLink,
			Role: "Internship",
			"Experience requirement": null,
			Pay: null,
			Locations: locations,
			"Job Skills": [],
			Posted: null,
		});
	}

	return jobs;
}

module.exports = scrapeSimplifyGithub;
