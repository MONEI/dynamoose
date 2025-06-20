const inquirer = require("inquirer");
const fs = require("fs").promises;
const git = require("simple-git/promise")();
const openurl = require("openurl");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const retrieveInformation = require("./information/retrieve");
const {Octokit} = require("@octokit/rest");
const octokit = new Octokit({
	"auth": process.env.GITHUBAUTH
});
const path = require("path");
const ora = require("ora");
const os = require("os");
const npmFetch = require("npm-registry-fetch");
let package = require("../packages/dynamoose/package.json");

(async function main () {
	console.log("Welcome to the Dynamoose Publisher!\n\n\n");
	if (!await checkCleanWorkingDir()) {
		console.error("You must have a clean working directory in order to use this tool.");
		console.error("Exiting.\n");
		process.exit(1);
	}
	if (!process.env.GITHUBAUTH) {
		console.error("You must set `GITHUBAUTH` in order to use this tool.");
		console.error("Exiting.\n");
		process.exit(1);
	}
	const originalBranch = (await git.status()).current;
	let results = await inquirer.prompt([
		{
			"name": "branch",
			"type": "list",
			"message": "What branch would you like to publish?",
			"choices": (await git.branchLocal()).all,
			"default": originalBranch
		}
	]);
	await git.checkout(results.branch);
	package = require("../packages/dynamoose/package.json");
	const gitCoreEditor = await exec("git config --get core.editor");
	results = {
		...results,
		...await inquirer.prompt([
			{
				"name": "version",
				"type": "input",
				"message": "What version would you like to publish?",
				"default": package.version,
				"validate": (val) => val !== package.version ? true : `${val} is the current version in the package.json. Please pick a new version to publish.`
			},
			{
				"name": "isPrerelease",
				"type": "confirm",
				"message": "Is this version a prerelease version?",
				"default": (res) => retrieveInformation(res.version).isPrerelease
			},
			{
				"name": "textEditor",
				"type": "input",
				"message": "What is the command line bin to launch your favorite text editor? (ex. `code`, `atom`, `nano`, etc.)",
				"default": gitCoreEditor.stdout
				// "validate": // TODO: ensure the command line thing exists and is valid (maybe by using `which` and checking to see if the output of that exists and is not `_____ not found`)
			}
		])
	};
	process.stdin.resume();
	console.log(retrieveInformation(results.version));
	results = {
		...results,
		...await inquirer.prompt([
			{
				"name": "confirm",
				"type": "confirm",
				"message": "Does all of the information look correct?",
				"default": false
			}
		])
	};
	if (!results.confirm) {
		console.error("No action has been taken.");
		console.error("Exiting.\n");
		process.exit(1);
	}

	// Create new branch
	const branch = `version/${results.version}`;
	const branchSpinner = ora(`Creating branch ${branch}`).start();
	await git.checkoutBranch(branch, results.branch);
	branchSpinner.succeed(`Created branch ${branch}`);
	// Update version in package.json
	const packageUpdateVersionsSpinner = ora("Updating versions").start();
	await exec(`lerna version ${results.version} --yes --no-git-tag-version --no-push`);
	packageUpdateVersionsSpinner.succeed("Updated versions");
	// Add & Commit files to Git
	const gitCommitPackage = ora("Committing files to Git").start();
	await git.add("./*");
	await git.commit(`Bumping version to ${results.version}`);
	gitCommitPackage.succeed("Committed files to Git");

	const versionInfo = retrieveInformation(results.version);
	const versionParts = versionInfo.main.split(".");
	const shouldUpdateAllMinorVersions = versionParts.length === 3 && versionParts[2] === "0"; // If true it will update cases of `x.x` instead of `x.x.x` (ignoring patch version) as well

	// Update README
	if (!versionInfo.isPrerelease) {
		const readmePath = path.join(__dirname, "..", "README.md");
		const readmeFileContents = await fs.readFile(readmePath, "utf8");
		if (readmeFileContents.includes(package.version)) {
			let newREADME = readmeFileContents.replaceAll(package.version, results.version);
			if (shouldUpdateAllMinorVersions) {
				let oldVersionParts = package.version.split(".");
				newREADME = newREADME.replaceAll(`${oldVersionParts[0]}.${oldVersionParts[1]}`, `${versionParts[0]}.${versionParts[1]}`);
			}
			await fs.writeFile(readmePath, `${newREADME}\n`);
			const readmeUpdateVersionsSpinner = ora("Updating version in README.md").start();
			readmeUpdateVersionsSpinner.succeed("Updated version in README.md");
			// Add & Commit files to Git
			const gitCommitReadme = ora("Committing files to Git").start();
			await git.commit(`Updating README to ${results.version}`, ["README.md"].map((file) => path.join(__dirname, "..", file)));
			gitCommitReadme.succeed("Committed files to Git");
		} else {
			const readmeUpdateVersionsSpinner = ora("Nothing to update in README.md").start();
			readmeUpdateVersionsSpinner.succeed("Nothing to update in README.md");
		}
	}
	// Push to GitHub
	const gitPush = ora("Pushing files to GitHub").start();
	await git.push("origin", branch);
	gitPush.succeed("Pushed files to GitHub");
	// Changelog
	console.log("This tool will now open a web browser with a list of commits since the last version.\nPlease use this information to fill out a change log.\n");
	console.log("Press any key to proceed.");
	await keypress();
	openurl.open(`https://github.com/dynamoose/dynamoose/compare/v${package.version}...${results.branch}`);
	// await exec("npm i");
	const utils = require("../packages/dynamoose/dist/utils").default;
	const versionFriendlyTitle = `Version ${[versionInfo.main, versionInfo.tag ? utils.capitalize_first_letter(versionInfo.tag) : "", versionInfo.tagNumber].filter((a) => Boolean(a)).join(" ")}`;
	const changelogFilePath = path.join(os.tmpdir(), `${results.version}-changelog.md`);
	let changelogTemplate = `## ${versionFriendlyTitle}`;
	if (!versionInfo.isPrerelease) {
		changelogTemplate += `\n\n${await fs.readFile(path.join(__dirname, "CHANGELOG_TEMPLATE.md"), "utf8")}`;
	}
	await fs.writeFile(changelogFilePath, changelogTemplate);
	await exec(`${results.textEditor.trim()} ${changelogFilePath.trim()}`);
	const pendingChangelogSpinner = ora("Waiting for user to finish changelog, press enter to continue.").start();
	await keypress();
	pendingChangelogSpinner.succeed("Finished changelog");
	const versionChangelog = (await fs.readFile(changelogFilePath, "utf8")).trim();
	if (!versionInfo.isPrerelease) {
		const existingChangelog = await fs.readFile(path.join(__dirname, "..", "CHANGELOG.md"), "utf8");
		const existingChangelogArray = existingChangelog.split("\n---\n");
		existingChangelogArray.splice(1, 0, `\n${versionChangelog}\n`);
		await fs.writeFile(path.join(__dirname, "..", "CHANGELOG.md"), existingChangelogArray.join("\n---\n"));
		const gitCommit2 = ora("Committing files to Git").start();
		await git.commit(`Adding changelog for ${results.version}`, [path.join(__dirname, "..", "CHANGELOG.md")]);
		gitCommit2.succeed("Committed files to Git");
		const gitPush2 = ora("Pushing files to GitHub").start();
		await git.push("origin", branch);
		gitPush2.succeed("Pushed files to GitHub");
	}
	// Create PR
	if (!await checkCleanWorkingDir()) {
		console.error("INTERNAL ERROR: We should have a clean working directory before creating a PR.");
		console.error("Exiting.\n");
		process.exit(1);
	}
	const gitPR = ora("Creating PR on GitHub").start();
	const labels = [versionInfo.isPrerelease ? "type:prerelease" : "type:version"];
	const pr = (await octokit.pulls.create({
		"owner": "dynamoose",
		"repo": "dynamoose",
		"title": versionFriendlyTitle,
		"body": versionChangelog,
		"labels": labels.join(","),
		"head": branch,
		"base": results.branch
	})).data;
	gitPR.succeed(`Created PR ${pr.number} on GitHub`);
	openurl.open(`https://github.com/dynamoose/dynamoose/pull/${pr.number}`);
	// Poll for PR to be merged
	const gitPRPoll = ora(`Polling GitHub for PR ${pr.number} to be merged`).start();
	await isPRMerged(pr.number);
	gitPRPoll.succeed(`PR ${pr.number} has been merged`);
	// Create release
	const gitRelease = ora("Creating release on GitHub").start();
	await octokit.repos.createRelease({
		"owner": "dynamoose",
		"repo": "dynamoose",
		"tag_name": `v${results.version}`,
		"target_commitish": results.branch,
		"name": `v${results.version}`,
		"body": versionChangelog,
		"prerelease": versionInfo.isPrerelease
	});
	gitRelease.succeed("GitHub release created");
	// Poll NPM for release
	const npmPoll = ora("Polling NPM for release").start();
	await isReleaseSubmitted(results.version);
	npmPoll.succeed("Version successfully published to NPM");
	// Restore Git to original state
	const gitCheckoutOriginal = ora(`Checking out ${originalBranch} branch`).start();
	await git.checkout(originalBranch);
	gitCheckoutOriginal.succeed(`Checked out ${originalBranch} branch`);
	const gitDeleteNewBranch = ora(`Deleting ${branch} branch`).start();
	// TODO: using `raw` instead of `deleteLocalBranch` until https://github.com/steveukx/git-js/issues/441 gets fixed
	// await git.deleteLocalBranch(branch);
	await git.raw(["branch", "-D", branch]);
	gitDeleteNewBranch.succeed(`Deleted ${branch} branch`);
	// Complete
	process.exit(0);

	async function isPRMerged (pr) {
		let data;
		do {
			data = (await octokit.pulls.get({
				"owner": "dynamoose",
				"repo": "dynamoose",
				"pull_number": pr
			})).data;
			await utils.timeout(5000);
		} while (!data.merged);
	}
	async function isReleaseSubmitted (release) {
		try {
			await npmFetch(`/dynamoose/${release}`);
		} catch (e) {
			await utils.timeout(5000);
			return isReleaseSubmitted(release);
		}
	}
})();

async function checkCleanWorkingDir () {
	return (await git.status()).isClean();
}
function keypress () {
	process.stdin.resume();
	process.stdin.setRawMode(true);
	return new Promise((resolve) => {
		process.stdin.once("data", () => {
			process.stdin.setRawMode(false);
			resolve();
			process.stdin.pause();
		});
	});
}
