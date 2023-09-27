const Constants = require("../utils/constants.cjs");
const axios = require("axios");
const { delay } = require("../utils/utils.cjs");

async function scrapePallet(page, url) {
  await delay(Constants.Delays.Medium)
	await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

	// Extract the CSRF token from the cookies
	await delay(Constants.Delays.Short);
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

module.exports = scrapePallet;
