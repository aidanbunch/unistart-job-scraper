const path = require("path");
const fs = require("fs");
const Fuse = require("fuse.js");
const Constants = require("./constants.cjs");

function parseMappingFile(mappingPath) {
	return JSON.parse(fs.readFileSync(`./mappings/${mappingPath}`, "utf8"));
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
	const jobCategoriesMap = parseMappingFile(
		Constants.Path.JobCategoriesMapping
	);
	// remove all "\", "/", ",", "(", ")","-" and "+" from job titles and skills and replace them with a space
	const cleanedJobTitle = jobTitle.replace(/\\|\/|\,|\(|\)|\-|\+/g, " ");
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
		jobCategoriesMap
	);
	if (category) {
		return category;
	}

	category = checkKeywordsAndPhrases(
		jobSkillsWords,
		cleanedJobSkills.join(" "),
		jobCategoriesMap
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

function filterOutSeniorPositions(jobs) {
	// parse senior keywords mapping
	const seniorFilters = parseMappingFile(Constants.Path.SeniorFiltersMapping);
	return jobs.filter((job) => {
		const title = job["Job Title"];
		return !seniorFilters.Seniors.keywords.some((position) =>
			title.includes(position)
		);
	});
}

function cleanLocationFields(jobs) {
	return jobs.map((job) => {
		if (job["Locations"] === null) {
			return job;
		}
		let locations = job["Locations"].filter(
			(location) => !location.toLowerCase().includes("location")
		);
		if (locations.length === 0) {
			locations = null;
		}
		return { ...job, Locations: locations };
	});
}

function cleanJobLinks(jobs) {
	const cleanedJobs = jobs.map((job) => {
		const jobLink = job["Job Link"];
		// remove all query params from the url
		if (!jobLink) {
			return null;
		}
		let cleanedJobLink = jobLink.split("?")[0];
		// filter out any jobs that don't have an a number in the url 
		// they used query params to track specific job IDs, so we remove them
		if (!cleanedJobLink.match(/\d+/g)) {
			return null;
		}
		return { ...job, "Job Link": cleanedJobLink };
	});
	return cleanedJobs.filter((job) => job);
}

function normalizeLocationFields(jobs) {
	const usCities = parseMappingFile(Constants.Path.USCityStateMapping);
	const intlCapitals = parseMappingFile(Constants.Path.CapitalCityCountryMapping);

	// Combine the US cities and international capitals into one object
	const allCities = { ...usCities, ...intlCapitals };

	const options = {
		includeScore: true,
		threshold: 0.25,
		keys: ["city"],
	};
	const fuse = new Fuse(
		Object.keys(allCities).map((city) => ({ city })),
		options
	);

	// Normalize the "Locations" field for each job
	jobs.forEach((job) => {
		if (job.Locations) {
			job.Locations = job.Locations.map((location) => {
				let primaryLocation = location;

				if (primaryLocation.toLowerCase().includes("remote")) {
					primaryLocation = location
						.split("/")
						.find((loc) => loc.toLowerCase().includes("remote"));
				} else {
					primaryLocation = location.split("/")[0];
				}

				// If location has multiple commas, only consider the first one
				primaryLocation = primaryLocation.split(",")[0];

				// If location is a remote location, format it accordingly
				if (primaryLocation.toLowerCase().includes("remote")) {
					let remoteLocation = primaryLocation.replace("remote", "");
					remoteLocation = remoteLocation.replace(
						/\\|\/|\-|\,|\(|\)|\.|\s/g,
						""
					);
					let remoteResult = fuse.search(remoteLocation);
					if (remoteResult.length > 0) {
						let bestMatch = remoteResult[0].item.city;
						return `Remote (${usCities[bestMatch] ? "US" : "Worldwide"})`;
					} else {
						return "Remote (Worldwide)";
					}
				}

				// Perform a fuzzy search for the location
				const result = fuse.search(primaryLocation);
				if (result.length > 0) {
					const bestMatch = result[0].item.city;
					return `${bestMatch}, ${allCities[bestMatch]}`;
				}

				// if no match has been found yet, remove obstructing words and try again
				const cleanedLocation = primaryLocation
					.replace(
						/greater|area|city|metro|north|south|east|west|central/gi,
						""
					)
					.trim();
				const cleanedResult = fuse.search(cleanedLocation);
				if (cleanedResult.length > 0) {
					const bestMatch = cleanedResult[0].item.city;
					return `${bestMatch}, ${allCities[bestMatch]}`;
				}
				// If no match is found, return null
				return null;
			});
			job.Locations = job.Locations.filter((location) => location);
			if (job.Locations.length === 0) {
				job.Locations = null;
			}
		}
	});

	return jobs;
}

async function delay(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function prepareJobData(jobData) {
	const cleanedJobLinks = cleanJobLinks(jobData);
	const uniqueJobs = removeDuplicates(cleanedJobLinks);
	const jobsWithoutSeniorPositions = filterOutSeniorPositions(uniqueJobs);
	const cleanedJobs = cleanLocationFields(jobsWithoutSeniorPositions);
	const normalizedJobs = normalizeLocationFields(cleanedJobs);
	const categorizedJobs = categorizeJobs(normalizedJobs);
	return categorizedJobs;
}

function writeJSONToOutputFile(fileName, newData) {
	if (!fs.existsSync("output")) {
		fs.mkdirSync("output");
	}
	const fullPath = path.join("output", fileName);

	fs.writeFileSync(fullPath, JSON.stringify(newData, null, 2));
}

function appendJSONToFile(fileName, newData) {
	if (!fs.existsSync("output")) {
		fs.mkdirSync("output");
	}
	const fullPath = path.join("output", fileName);

	let existingData = [];
	if (fs.existsSync(fullPath)) {
		const fileContent = fs.readFileSync(fullPath, "utf8");
		existingData = JSON.parse(fileContent);
	}

	const updatedData = [...existingData, ...newData];
	fs.writeFileSync(fullPath, JSON.stringify(updatedData, null, 2));
}

module.exports = {
	delay,
	writeJSONToOutputFile,
	appendJSONToFile,
	prepareJobData,
};
