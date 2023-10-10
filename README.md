# Unistart Job Scraper
This script utilizes Puppeteer bots to scrape entry-level jobs from various job boards in parallel. The service is set up to be deployed on AWS with the Serverless framework. It deploys to a Lambda function and runs periodically on an EventBridge rule scheduled to trigger an invocation at 7:00 AM PST every Monday. It then stores the results of the scraping in a file called `jobs.json` in an S3 bucket. The data scraped is cleaned, processed and normalized using fuzzy searching and mapping algorithms for the presentation layer of an application.

## Boards Scraped
- Sequoia Capital
- Union Square Ventures
- Pallet
- YCombinator's Work at a Startup
- TrueUp
- BuiltIn
- TopStartups

## Deployment
To deploy the job scraper, follow these steps:
1. Clone the repository:
```
git clone https://github.com/aidanbunch/unistart-job-scraper.git
```
2. Install dependencies with the following commands:
```
npm install -g serverless
```
```
npm install
```
3. Configure the script: You can open [constants.cjs](utils/constants.cjs) and [map.cjs](utils/map.cjs) to edit the URLs to scrape and constants used by the script.
4. Add your credentials to a `.env` file in the root of the directory with the credentials for boards with an authentication wall (like YCombinator or TrueUp). Use the same credentials for both. Also, add your AWS credentials (so the script can upload the results to an S3 bucket) to the file. The format should be:
```.env
UNISTART_USERNAME='example_username'
UNISTART_PASSWORD='example_password'
UNISTART_AWS_ACCESS_KEY_ID='example_access_key_id'
UNISTART_AWS_SECRET_ACCESS_KEY='example_secret_access_key'
RUNNING_LOCALLY='whether the function will be invoked locally or not, 'true' or 'false''
```
5. Deploy the serverless function. Make sure your `RUNNING_LOCALLY` key is set to `false` before you deploy. Run the following command to deploy the function to AWS (assuming you have your credentials loaded):
```
sls deploy
```

## Testing
To test the scheduling and syntax, use the following command:
```
sls offline start
```
This command starts the serverless offline plugin, allowing you to test the scheduling and syntax locally.
To test the invocation of the function, use the following command:
```
sls invoke local -f entry-level-jobs
```
This command invokes the entry-level-jobs function locally. Change the `RUNNING_LOCALLY` key in the `.env` file
to `true` to use the proper Chromium binary and get results written locally rather than to the S3 bucket.
