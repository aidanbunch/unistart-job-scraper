require("dotenv").config();

const Constants = {
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
	Path: {
		USCityStateMapping: "city_states_mapping.json",
		CapitalCityCountryMapping: "cities_countries_mapping.json",
		SeniorFiltersMapping: "senior_filters_mapping.json",
		JobCategoriesMapping: "job_categories_mapping.json",
	},
	RunningLocally: process.env.RUNNING_LOCALLY === "true" || false,
};

module.exports = Constants;
