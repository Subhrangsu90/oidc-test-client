const crypto = require("node:crypto");
const {
	parseCookies,
	redirect,
	sendHtml,
	serializeCookie,
	escapeHtml,
} = require("./utils");
const { renderMetaList, renderPage } = require("./templates");
const { verifyIdToken } = require("./oidc-token");

function createHandlers(config, sessionStore) {
	function getSession(req) {
		return sessionStore.get(req, parseCookies);
	}

	function handleIndex(req, res) {
		const session = getSession(req);

		if (session) {
			redirect(res, "/home");
			return;
		}

		sendHtml(
			res,
			200,
			renderPage(
				"OIDC Test Client",
				[
					"<p>This app is the relying-party client running separately from your provider.</p>",
					"<p><a class='button' href='/login'>Sign in with OIDC provider</a></p>",
					renderMetaList([
						{ label: "Provider", value: config.oidcIssuer },
						{ label: "Callback", value: config.redirectUri },
					]),
				].join(""),
			),
		);
	}

	function handleLogin(req, res) {
		const session = getSession(req);

		if (session) {
			redirect(res, "/home");
			return;
		}

		if (!config.clientId || !config.clientSecret) {
			sendHtml(
				res,
				500,
				renderPage(
					"Missing Client Config",
					"<p>Set CLIENT_ID and CLIENT_SECRET in the client app .env file first.</p>",
				),
			);
			return;
		}

		const state = crypto.randomBytes(16).toString("hex");
		const stateCookieName = `${config.stateCookie}_${state}`;
		const authorizeUrl = new URL(`${config.oidcIssuer}/auth/authorize`);

		authorizeUrl.searchParams.set("client_id", config.clientId);
		authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
		authorizeUrl.searchParams.set("response_type", "code");
		authorizeUrl.searchParams.set("scope", "openid profile email");
		authorizeUrl.searchParams.set("state", state);

		redirect(res, authorizeUrl.toString(), [
			serializeCookie(stateCookieName, "1", {
				httpOnly: true,
				maxAge: 600,
				path: "/",
				sameSite: "Lax",
			}),
		]);
	}

	async function handleCallback(req, res, requestUrl) {
		const code = requestUrl.searchParams.get("code");
		const state = requestUrl.searchParams.get("state");
		const cookies = parseCookies(req);
		const stateCookieName = state ? `${config.stateCookie}_${state}` : "";
		const hasExpectedState = Boolean(
			stateCookieName && cookies[stateCookieName],
		);

		if (!code) {
			sendHtml(
				res,
				400,
				renderPage(
					"Missing Code",
					"<p>No authorization code was returned.</p>",
				),
			);
			return;
		}

		if (!state || !hasExpectedState) {
			sendHtml(
				res,
				400,
				renderPage(
					"Invalid State",
					"<p>The callback state did not match.</p>",
				),
			);
			return;
		}

		const tokenResponse = await fetch(`${config.oidcIssuer}/auth/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				grant_type: "authorization_code",
				code,
				redirect_uri: config.redirectUri,
				client_id: config.clientId,
				client_secret: config.clientSecret,
			}),
		});
		const tokenData = await tokenResponse.json();

		if (!tokenResponse.ok) {
			sendHtml(
				res,
				tokenResponse.status,
				renderPage(
					"Token Exchange Failed",
					`<p>${escapeHtml(tokenData.message || "Unable to exchange code for tokens.")}</p>`,
				),
			);
			return;
		}

		try {
			await verifyIdToken(
				tokenData.id_token,
				config.oidcIssuer,
				config.clientId,
			);
		} catch (error) {
			sendHtml(
				res,
				401,
				renderPage(
					"Token Verification Failed",
					`<p>${escapeHtml(error.message || "Unable to verify ID token.")}</p>`,
				),
			);
			return;
		}

		const profileResponse = await fetch(
			`${config.oidcIssuer}/user/userinfo`,
			{
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
				},
			},
		);
		const profileData = await profileResponse.json();

		if (!profileResponse.ok) {
			sendHtml(
				res,
				profileResponse.status,
				renderPage(
					"Userinfo Failed",
					`<p>${escapeHtml(profileData.message || "Unable to fetch user profile.")}</p>`,
				),
			);
			return;
		}

		const sessionId = crypto.randomBytes(24).toString("hex");

		sessionStore.set(sessionId, {
			profile: profileData,
			tokens: tokenData,
			createdAt: Date.now(),
		});

		redirect(res, "/home", [
			serializeCookie(config.sessionCookie, sessionId, {
				httpOnly: true,
				secure: true,
				maxAge: 3600,
				path: "/",
				sameSite: "Lax",
			}),
			serializeCookie(config.stateCookie, "", {
				httpOnly: true,
				secure: true,
				maxAge: 0,
				path: "/",
				sameSite: "Lax",
			}),
			serializeCookie(stateCookieName, "", {
				httpOnly: true,
				secure: true,
				maxAge: 0,
				path: "/",
				sameSite: "Lax",
			}),
		]);
	}

	function handleHome(req, res) {
		const session = getSession(req);

		if (!session) {
			redirect(res, "/");
			return;
		}

		const { profile } = session;

		sendHtml(
			res,
			200,
			renderPage(
				"Client Home",
				[
					"<p>You are signed into the relying-party client with your OIDC provider account.</p>",
					"<div class='card'>",
					`<p><strong>Name:</strong> ${escapeHtml(profile.name || "Unknown")}</p>`,
					`<p><strong>Email:</strong> ${escapeHtml(profile.email || "Unknown")}</p>`,
					`<p><strong>Subject:</strong> ${escapeHtml(profile.sub || "Unknown")}</p>`,
					"</div>",
					"<p><a class='button secondary' href='/logout'>Logout</a></p>",
				].join(""),
			),
		);
	}

	function handleLogout(req, res) {
		const cookies = parseCookies(req);

		sessionStore.remove(cookies[config.sessionCookie]);

		redirect(res, "/", [
			serializeCookie(config.sessionCookie, "", {
				httpOnly: true,
				maxAge: 0,
				path: "/",
				sameSite: "Lax",
			}),
		]);
	}

	return {
		handleCallback,
		handleHome,
		handleIndex,
		handleLogin,
		handleLogout,
	};
}

module.exports = {
	createHandlers,
};
