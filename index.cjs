const puppeteer = require("puppeteer");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { Cluster } = require("puppeteer-cluster");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const Constants = {
	ScrapingMap: {
		"https://jobs.sequoiacap.com/jobs/?internshipOnly=true":
			scrapeConsiderJobBoards,
		"https://jobs.usv.com/jobs?internshipOnly=true": scrapeConsiderJobBoards,
		"https://gen-z-vcs-jobs.pallet.com/jobs": scrapePallet,
		"https://www.workatastartup.com/companies?demographic=any&hasEquity=any&hasSalary=any&industry=any&interviewProcess=any&jobType=any&layout=list-compact&minExperience=0&minExperience=1&sortBy=created_desc&tab=any&usVisaNotRequired=any":
			scrapeYComb,
		"https://www.trueup.io/jobs": scrapeTrueUp,
		"https://builtin.com/jobs/entry-level": scrapeBuiltIn,
		"https://topstartups.io/jobs/?yoe=0-1+year&yoe=2-3+years":
			scrapeTopStartups,
	},
	JobCategoriesMap: {
		"Biz Dev": {
			keywords: [
				"business",
				"entrepreneur",
				"sales",
				"partnerships",
				"strategy",
				"growth",
				"client",
				"mba",
				"customer",
				"relations",
				"sdr",
			],
			phrases: ["account executive", "account manager", "account management"],
		},
		Design: {
			keywords: [
				"design",
				"graphic",
				"ui",
				"ux",
				"art",
				"artist",
				"visual",
				"creative",
				"illustration",
				"branding",
				"photoshop",
				"figma",
				"sketch",
			],
			phrases: ["user interface", "user experience"],
		},
		Engineering: {
			keywords: [
				"engineer",
				"engineering",
				"developer",
				"database",
				"robotics",
				"hardware",
				"programmer",
				"software",
				"frontend",
				"backend",
				"fullstack",
				"java",
				"python",
				"javascript",
				"c++",
				"ruby",
				"php",
				"ios",
				"android",
				"devops",
				"cloud",
				"aws",
				"azure",
				"it",
				"mechatronics",
				"computational",
				"compilers",
				"devops",
				"mlops",
				"compilers",
				"gcp",
				"trading",
				"cybersecurity",
				"trader",
			],
			phrases: [
				"software engineer",
				"electrical engineer",
				"cyber security",
				"full stack",
				"information technology",
				"solutions architect",
				"launch internship", // citadel calls their eng internships this
				"open source",
				"computer vision",
				"deep learning",
				"machine learning",
			],
		},
		Finance: {
			keywords: [
				"finance",
				"analyst",
				"accounting",
				"accountant",
				"financial",
				"budget",
				"tax",
				"audit",
				"treasury",
				"revenue",
				"investment",
				"actuarial",
				"equity",
				"controller",
				"debt",
				"risk",
				"compliance",
			],
			phrases: ["financial analyst", "market analysis"],
		},
		Legal: {
			keywords: [
				"legal",
				"law",
				"compliance",
				"regulatory",
				"counsel",
				"litigation",
				"corporate",
				"attorney",
				"solicitor",
				"paralegal",
			],
			phrases: [
				"legal counsel",
				"legal analyst",
				"legal assistant",
				"intellectual property",
			],
		},
		Marketing: {
			keywords: [
				"marketing",
				"seo",
				"social media",
				"content",
				"brand",
				"advertising",
				"copywriter",
				"email",
				"crm",
				"analytics",
				"ppc",
				"sem",
			],
			phrases: [],
		},
		Operations: {
			keywords: [
				"operations",
				"logistics",
				"facilities",
				"fulfillment",
				"admin",
				"receptionist",
				"workplace",
				"purchasing",
				"coordinator",
				"procurement",
				"inventory",
				"production",
				"manufacturing",
				"operating",
				"process",
				"assistant",
				"ceo's",
			],
			phrases: ["right hand", "supply chain", "founder office"],
		},
		PR: {
			keywords: [
				"pr",
				"communications",
				"communication",
				"translation",
				"media",
				"press",
				"journalism",
				"journalist",
				"events",
				"community",
				"english",
			],
			phrases: ["public relations"],
		},
		Product: {
			keywords: [
				"product",
				"project",
				"owner",
				"po",
				"pm",
				"roadmap",
				"scrum",
				"agile",
			],
			phrases: ["product manager", "product owner", "product management"],
		},
		Research: {
			keywords: [
				"research",
				"researcher",
				"data",
				"statistics",
				"science",
				"study",
				"survey",
			],
			phrases: [],
		},
		VC: {
			keywords: [
				"venture",
				"capital",
				"vc",
				"investment",
				"fund",
				"equity",
				"investor",
				"startup",
				"angel",
				"portfolio",
			],
			phrases: [],
		},
		HR: {
			keywords: [
				"hr",
				"hrbp",
				"recruiting",
				"recruitment",
				"talent",
				"benefits",
				"payroll",
				"training",
				"development",
			],
			phrases: ["human resources", "talent acquisition", "employee relations"],
		},
	},
	Pallet: {
		JobsApiEndpoint: "https://gen-z-vcs-jobs.pallet.com/api/v1/graphql",
		ConstructJobLink: (listingUuid) =>
			`https://gen-z-vcs-jobs.pallet.com/jobs/${listingUuid}`,
	},
	YComb: {
		LoginUrl:
			"https://account.ycombinator.com/?continue=https%3A%2F%2Fwww.workatastartup.com%2F",
		InternshipsUrl:
			"https://www.workatastartup.com/companies?demographic=any&hasEquity=any&hasSalary=any&industry=any&interviewProcess=any&jobType=intern&layout=list-compact&sortBy=created_desc&tab=any&usVisaNotRequired=any",
	},
	TrueUp: {
		HomeUrl: "https://www.trueup.io/",
	},
	Delays: {
		Short: 1000,
		Medium: 3000,
		Long: 6000,
	},
	WideViewportDimensions: {
		width: 1920,
		height: 1080,
	},
	Credentials: {
		Username: process.env.UNISTART_USERNAME,
		Password: process.env.UNISTART_PASSWORD,
	},
};

async function scrapeConsiderJobBoards(page, url) {
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
		await delay(Constants.Delays.Medium)

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
						Role: "Internship",
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

async function scrapePallet(page, url) {
	await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

	// Extract the CSRF token from the cookies
	await delay(Constants.Delays.Short)
	const client = await page.target().createCDPSession();
	const cookies = (await client.send("Network.getAllCookies")).cookies;
	const csrfTokenCookie = cookies.find((cookie) => cookie.name === "csrftoken");
	const csrfToken = csrfTokenCookie.value;

	const apiUrl = Constants.Pallet.JobsApiEndpoint;
	const headers = {
		"Content-Type": "application/json",
		Cookie: `csrftoken=${csrfToken};`,
	};

	await page.close();

	const payload = {
		operationName: "ListJobPostsQuery",
		variables: {
			slug: "gen-z-vcs-jobs",
			applylist: "gen-z-vcs-jobs",
			offset: 0,
			experiences: ["entry-level-new-grad", "junior-1-2-years"],
			locations2: [],
			isOpenToRemote: true,
			jobTypes: [],
			selectedCategory: "",
			ignoreJobTypes: false,
		},
		query: `query ListJobPostsQuery($slug: String!, $applylist: String, $cursor: String, $offset: Int!, $jobTypes: [String], $locations2: [LocationInputType!], $isOpenToRemote: Boolean, $experiences: [String], $selectedCategory: String, $ignoreJobTypes: Boolean!) {
    applylist(slug: $slug) {
      ... on ApplylistType {
        id
        slug
        postCount
        canEdit
        notifyOnUpdate
        categoryTags {
          name
          slug
          count
          __typename
        }
        posts(
          first: $offset
          after: $cursor
          jobTypes: $jobTypes
          locations2: $locations2
          isOpenToRemote: $isOpenToRemote
          experiences: $experiences
          selectedCategory: $selectedCategory
          ignoreJobTypes: $ignoreJobTypes
        ) {
          ...JobList_postconnection
          __typename
        }
        __typename
      }
      __typename
    }
  }

  fragment JobList_postconnection on PostTypeConnection {
    pageInfo {
      hasNextPage
      endCursor
      __typename
    }
    edges {
      node {
        ...JobItem_post
        matchesGlobalPreferences
        jobTypeCategories
        __typename
      }
      __typename
    }
    __typename
  }

  fragment JobItem_post on PostType {
    id
    canEdit
    deadline(applylist: $applylist)
    listingUuid(applylist: $applylist)
    isFeatured(applylist: $applylist)
    uuid
    originEnum
    ...CoreJobItem_post
    ...ApproveDeny_post
    matchesGlobalPreferences
    ...ShareToButton_post
    ...UpdateDateModal_post
    ...ToggleFeatureButton_post
    __typename
  }

  fragment CoreJobItem_post on PostType {
    uuid
    jobTitle
    isFeatured(applylist: $applylist)
    company {
      id
      name
      website
      ...CompanyImagePreview_company
      __typename
    }
    salary
    locations {
      id
      shortLabel
      __typename
    }
    isOpenToRemote
    experience {
      id
      shortName
      __typename
    }
    workType {
      id
      name
      __typename
    }
    __typename
  }

  fragment CompanyImagePreview_company on CompanyType {
    slug
    image
    __typename
  }

  fragment ApproveDeny_post on PostType {
    uuid
    jobTitle
    company {
      name
      __typename
    }
    status(applylist: $applylist)
    __typename
  }

  fragment ShareToButton_post on PostType {
    ...ShareListing_post
    __typename
  }

  fragment ShareListing_post on PostType {
    id
    jobTitle
    applyLink
    company {
      id
      name
      twitter
      website
      __typename
    }
    listingUuid(applylist: $applylist)
    __typename
  }

  fragment UpdateDateModal_post on PostType {
    id
    listingUuid(applylist: $applylist)
    jobTitle
    deadline(applylist: $applylist)
    company {
      id
      name
      __typename
    }
    __typename
  }

  fragment ToggleFeatureButton_post on PostType {
    id
    listingUuid(applylist: $applylist)
    isFeatured(applylist: $applylist)
    __typename
  }`,
	};

	try {
		const response = await axios.post(apiUrl, payload, { headers });
		const jobs = response.data.data.applylist.posts.edges;

		const parsedJobs = jobs.map((job) => {
			const {
				listingUuid,
				jobTitle,
				company: { name: companyName },
				workType: { name: role },
				experience,
				salary,
				locations,
				jobTypeCategories,
			} = job.node;

			// Construct job link URL
			const jobLink = Constants.Pallet.ConstructJobLink(listingUuid);

			// Format skills
			const formattedJobSkills = jobTypeCategories.map((category) => {
				// Replace dashes with spaces and capitalize first letters
				return category
					.replace(/-/g, " ")
					.replace(/\b\w/g, (c) => c.toUpperCase());
			});

			// Append experience requirements
			let formattedExperience = null;
			if (experience.length > 0) {
				const shortName = experience[0].shortName.toLowerCase();
				if (shortName.includes("entry level")) {
					formattedExperience = `${experience[0].shortName} (New Grad)`;
				} else if (shortName.includes("junior")) {
					formattedExperience = `${experience[0].shortName} (1-2 years)`;
				} else {
					formattedExperience = experience[0].shortName;
				}
			}

			return {
				"Job Title": jobTitle,
				"Company Name": companyName,
				"Job Link": jobLink,
				Role: role,
				"Experience requirement": formattedExperience,
				Pay: salary ? salary : null,
				Locations:
					locations.length > 0
						? locations.map((location) => location.shortLabel)
						: null,
				"Job Skills": formattedJobSkills,
				Posted: null, // Pallet doesn't provide this info
			};
		});
		return parsedJobs;
	} catch (error) {
		console.error(error);
		return [];
	}
}

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
	await delay(Constants.Delays.Long)

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
			await delay(Constants.Delays.Medium)

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
									Pay: payElements.length > 0 ? payElements[0].innerText : null,
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

async function scrapeTrueUp(page, url) {
	// must navigate to login instead of going to page directly
	// because of the way they handle auth state
	await page.goto(Constants.TrueUp.HomeUrl, {
		waitUntil: "networkidle2",
		timeout: 0,
	});
	await page.click("button.btn.btn-link.font-monospace.me-1.text-dark");
	await delay(Constants.Delays.Medium)

	// Login to TrueUp
	const usernameInput = await page.$("#username");
	const passwordInput = await page.$("#password");
	await usernameInput.type(Constants.Credentials.Username);
	await passwordInput.type(Constants.Credentials.Password);
	await page.waitForSelector("form.cfef2bd89.ceee48832");
	await page.$eval("form.cfef2bd89.ceee48832", (form) => form.submit());

	// wait for authentication to load and go through
	await delay(Constants.Delays.Long)

	// Scrape jobs
	await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
	await page.setViewport({
		width: Constants.WideViewportDimensions.width,
		height: Constants.WideViewportDimensions.height,
	}); // so filters are visible
	// auth state only loads after page is loaded via JS
	await delay(Constants.Delays.Medium)
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
			await delay(Constants.Delays.Medium) // let new filters load

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
				await delay(Constants.Delays.Medium)

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
								Pay: pay,
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

async function scrapeBuiltIn(page, url) {
	await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
	await page.setViewport({
		width: Constants.WideViewportDimensions.width,
		height: Constants.WideViewportDimensions.height,
	});

	let jobItems = [];

	while (true) {
		try {
			await delay(Constants.Delays.Medium)
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
		await delay(Constants.Delays.Medium)

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

exports.handler = async (event, context) => {
	const cluster = await Cluster.launch({
		concurrency: Cluster.CONCURRENCY_BROWSER,
		maxConcurrency: 4,
		timeout: 900000,
	});

	const results = [];

	await cluster.task(async ({ page, data: url }) => {
		const scrapedData = await Constants.ScrapingMap[url](page, url);
		results.push(...scrapedData);
	});

	for (const url in Constants.ScrapingMap) {
		cluster.queue(url);
	}

	await cluster.idle();
	await cluster.close();

	const jobItems = removeDuplicates(results);

	const categorizedJobItems = categorizeJobs(jobItems);

	// const params = {
	// 	Bucket: "scraped-job-objects",
	// 	Key: "jobs.json",
	// 	Body: JSON.stringify({
	// 		formattedResults
	// 	}),
	// };
	// await s3.putObject(params).promise();

	writeJSONToOutputFile("jobs.json", categorizedJobItems);

};
