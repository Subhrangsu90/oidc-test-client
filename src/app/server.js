const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createSessionStore } = require("./session-store");
const { createHandlers } = require("./handlers");
const { renderPage } = require("./templates");
const { escapeHtml, sendCss, sendHtml } = require("./utils");

function createServer(config) {
	const sessionStore = createSessionStore(config.sessionCookie);
	const handlers = createHandlers(config, sessionStore);
	const stylesheet = fs.readFileSync(path.join(process.cwd(), "public", "styles.css"), "utf8");

	return http.createServer(async (req, res) => {
		try {
			const requestUrl = new URL(req.url, `http://${req.headers.host}`);

			if (req.method === "GET" && requestUrl.pathname === "/styles.css") {
				sendCss(res, 200, stylesheet);
				return;
			}

			if (req.method === "GET" && requestUrl.pathname === "/") {
				handlers.handleIndex(req, res);
				return;
			}

			if (req.method === "GET" && requestUrl.pathname === "/login") {
				handlers.handleLogin(req, res);
				return;
			}

			if (req.method === "GET" && requestUrl.pathname === "/callback") {
				await handlers.handleCallback(req, res, requestUrl);
				return;
			}

			if (req.method === "GET" && requestUrl.pathname === "/home") {
				handlers.handleHome(req, res);
				return;
			}

			if (req.method === "GET" && requestUrl.pathname === "/logout") {
				handlers.handleLogout(req, res);
				return;
			}

			sendHtml(
				res,
				404,
				renderPage(
					"Not Found",
					"<p>The page you requested does not exist.</p><p><a href='/'>Go home</a></p>"
				)
			);
		} catch (error) {
			sendHtml(
				res,
				500,
				renderPage(
					"Client Error",
					`<p>${escapeHtml(error.message || "Unexpected error.")}</p><p><a href='/'>Go home</a></p>`
				)
			);
		}
	});
}

module.exports = {
	createServer,
};
