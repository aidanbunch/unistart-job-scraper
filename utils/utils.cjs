const path = require("path");
const fs = require("fs");
const Constants = require("./constants.cjs");

async function delay(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function checkKeywordsAndPhrases(words, fullString, jobCategoriesMap) {
	for (const word of words) {
		for (const [category, keywordsAndPhrases] of Object.entries(
			jobCategoriesMap
		)) {
			if (keywordsAndPhrases.keywords.includes(word)) {
				return category;
			}
		}
	}
	for (const [category, keywordsAndPhrases] of Object.entries(
		jobCategoriesMap
	)) {
		for (const phrase of keywordsAndPhrases.phrases) {
			if (fullString.toLowerCase().includes(phrase)) {
				return category;
			}
		}
	}
	return null;
}

function categorizeJob(jobTitle, jobSkills) {
	// remove all "\", "/", ",", "(" and ")" from job titles and skills
	const cleanedJobTitle = jobTitle.replace(/\\|\/|\,|\(|\)/g, "");
	const cleanedJobSkills = jobSkills.map((skill) =>
		skill.replace(/\\|\/|\,|\(|\)/g, "")
	);

	const jobTitleWords = cleanedJobTitle.toLowerCase().split(" ");
	const jobSkillsWords = cleanedJobSkills.flatMap((skill) =>
		skill.toLowerCase().split(" ")
	);

	let category = checkKeywordsAndPhrases(
		jobTitleWords,
		cleanedJobTitle,
		Constants.JobCategoriesMap
	);
	if (category) {
		return category;
	}

	category = checkKeywordsAndPhrases(
		jobSkillsWords,
		cleanedJobSkills.join(" "),
		Constants.JobCategoriesMap
	);
	if (category) {
		return category;
	}
	return "Uncategorized";
}

function categorizeJobs(jobs) {
	return jobs.map((job) => {
		let title = job["Job Title"] ? job["Job Title"] : "";
		let skills = job["Job Skills"] ? job["Job Skills"] : [];
		let category = categorizeJob(title, skills);
		return { ...job, Category: category };
	});
}

function removeDuplicates(data) {
	const seen = new Set();
	const uniqueJobs = data.filter((el) => {
		const duplicate = seen.has(el["Job Link"]);
		seen.add(el["Job Link"]);
		return !duplicate;
	});
	return uniqueJobs;
}

function writeJSONToOutputFile(fileName, data) {
	if (!fs.existsSync("output")) {
		fs.mkdirSync("output");
	}

	const fullPath = path.join("output", fileName);

	fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
}

module.exports = {
	delay,
	categorizeJobs,
	removeDuplicates,
	writeJSONToOutputFile,
};
