const scrapeConsider = require("../scrapers/scrapeConsider.cjs");
const scrapePallet = require("../scrapers/scrapePallet.cjs");
const scrapeYComb = require("../scrapers/scrapeYComb.cjs");
const scrapeTrueUp = require("../scrapers/scrapeTrueUp.cjs");
const scrapeBuiltIn = require("../scrapers/scrapeBuiltIn.cjs");
const scrapeTopStartups = require("../scrapers/scrapeTopStartups.cjs");

const ScrapingMap = {
	"https://jobs.sequoiacap.com/jobs/?internshipOnly=true":
		scrapeConsider,
	"https://jobs.usv.com/jobs?internshipOnly=true": scrapeConsider,
	"https://gen-z-vcs-jobs.pallet.com/jobs": scrapePallet,
	"https://www.workatastartup.com/companies?demographic=any&hasEquity=any&hasSalary=any&industry=any&interviewProcess=any&jobType=any&layout=list-compact&minExperience=0&minExperience=1&sortBy=created_desc&tab=any&usVisaNotRequired=any":
		scrapeYComb,
	"https://www.trueup.io/jobs": scrapeTrueUp,
	"https://builtin.com/jobs/entry-level": scrapeBuiltIn,
	"https://topstartups.io/jobs/?yoe=0-1+year&yoe=2-3+years":
		scrapeTopStartups,
}

module.exports = ScrapingMap