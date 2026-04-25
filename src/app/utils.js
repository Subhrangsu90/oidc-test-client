function parseCookies(req) {
	const header = req.headers.cookie || "";

	return header.split(/;\s*/).reduce((cookies, pair) => {
		if (!pair) {
			return cookies;
		}

		const separatorIndex = pair.indexOf("=");

		if (separatorIndex === -1) {
			return cookies;
		}

		const key = pair.slice(0, separatorIndex);
		const value = pair.slice(separatorIndex + 1);
		cookies[key] = decodeURIComponent(value);
		return cookies;
	}, {});
}

function serializeCookie(name, value, options) {
	const parts = [`${name}=${encodeURIComponent(value)}`];

	if (options.maxAge !== undefined) {
		parts.push(`Max-Age=${options.maxAge}`);
	}

	if (options.httpOnly) {
		parts.push("HttpOnly");
	}

	if (options.path) {
		parts.push(`Path=${options.path}`);
	}

	if (options.sameSite) {
		parts.push(`SameSite=${options.sameSite}`);
	}

	return parts.join("; ");
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function redirect(res, location, cookies = []) {
	const headers = {
		Location: location,
	};

	if (cookies.length > 0) {
		headers["Set-Cookie"] = cookies;
	}

	res.writeHead(302, headers);
	res.end();
}

function sendHtml(res, statusCode, html) {
	res.writeHead(statusCode, {
		"Content-Type": "text/html; charset=utf-8",
	});
	res.end(html);
}

function sendCss(res, statusCode, css) {
	res.writeHead(statusCode, {
		"Content-Type": "text/css; charset=utf-8",
	});
	res.end(css);
}

module.exports = {
	escapeHtml,
	parseCookies,
	redirect,
	sendCss,
	sendHtml,
	serializeCookie,
};
