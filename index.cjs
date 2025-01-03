require("dotenv").config();
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
	accessKeyId: process.env.UNISTART_AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.UNISTART_AWS_SECRET_ACCESS_KEY,
});
const chromium = require("@sparticuz/chromium");
// chromium-min doesn't bundle the executable with the package
// const chromium = require("@sparticuz/chromium-min");
const { Cluster } = require("puppeteer-cluster");

const ScrapingMap = require("./utils/map.cjs");
const { prepareJobData, writeJSONToOutputFile } = require("./utils/utils.cjs");
const Constants = require("./utils/constants.cjs");

exports.handler = async (event, context) => {
	let cluster;
	if (Constants.RunningLocally) {
		cluster = await Cluster.launch({
			concurrency: Cluster.CONCURRENCY_CONTEXT,
			maxConcurrency: 4,
			timeout: 900000,
		});
	} else {
		// use old headless mode
		chromium.headless = true;
		
		cluster = await Cluster.launch({
			puppeteerOptions: {
				args: chromium.args,
				defaultViewport: chromium.defaultViewport,
				// for using chromium-min and downloading executable from github
				// executablePath: await chromium.executablePath(
				// 	"https://github.com/Sparticuz/chromium/releases/download/v116.0.0/chromium-v116.0.0-pack.tar"
				// ),
				executablePath: await chromium.executablePath(),
				headless: chromium.headless,
				ignoreHTTPSErrors: true,
			},
			concurrency: Cluster.CONCURRENCY_CONTEXT,
			maxConcurrency: 4,
			timeout: 900000,
		});
	}

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

	if (Constants.RunningLocally) {
		writeJSONToOutputFile("jobs.json", formattedJobItems);
	} else {
		// log the first few job objects
		console.log(formattedJobItems.slice(0, 5));
		const params = {
			Bucket: "scraped-job-objects",
			Key: "jobs.json",
			Body: JSON.stringify(formattedJobItems),
		};
		await s3.putObject(params).promise();
	}
};
