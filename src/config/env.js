const fs = require("node:fs");
const path = require("node:path");

function loadEnv() {
	const envPath = path.join(process.cwd(), ".env");

	if (!fs.existsSync(envPath)) {
		return;
	}

	const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const separatorIndex = trimmed.indexOf("=");

		if (separatorIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		const value = trimmed.slice(separatorIndex + 1).trim();

		if (key && !process.env[key]) {
			process.env[key] = value;
		}
	}
}

function getConfig() {
	loadEnv();

	const port = process.env.PORT || "3000";

	return {
		port,
		oidcIssuer: process.env.OIDC_ISSUER || "http://localhost:8000",
		clientId: process.env.CLIENT_ID || "",
		clientSecret: process.env.CLIENT_SECRET || "",
		redirectUri: process.env.REDIRECT_URI || `http://localhost:${port}/callback`,
		sessionCookie: "oidc_test_session",
		stateCookie: "oidc_test_state",
	};
}

module.exports = {
	getConfig,
};
