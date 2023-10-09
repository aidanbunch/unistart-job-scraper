require("dotenv").config();
const AWS = require("aws-sdk");
// const s3 = new AWS.S3({
// 	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
// 	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   });
const { Cluster } = require("puppeteer-cluster");

const ScrapingMap = require("./utils/map.cjs");
const {
	writeJSONToOutputFile,
	prepareJobData,
} = require("./utils/utils.cjs");

exports.handler = async (event, context) => {
	const cluster = await Cluster.launch({
		concurrency: Cluster.CONCURRENCY_CONTEXT,
		maxConcurrency: 4,
		timeout: 900000,
	});

	const results = [];

	await cluster.task(async ({ page, data: url }) => {
		const scrapedData = await ScrapingMap[url](page, url);
		results.push(...scrapedData);
	});

	for (const url in ScrapingMap) {
		cluster.queue(url);
	}

	await cluster.idle();
	await cluster.close();

	const formattedJobItems = prepareJobData(results);

	// write jobs.json file to s3 bucket
	// const params = {
	// 	Bucket: "scraped-job-objects",
	// 	Key: "jobs.json",
	// 	Body: JSON.stringify({
	// 		formattedResults
	// 	}),
	// };
	// await s3.putObject(params).promise();

	writeJSONToOutputFile("jobs.json", formattedJobItems);
};
