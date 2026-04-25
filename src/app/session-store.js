function createSessionStore(sessionCookie) {
	const sessions = new Map();

	function get(req, parseCookies) {
		const cookies = parseCookies(req);
		const sessionId = cookies[sessionCookie];

		if (!sessionId) {
			return null;
		}

		return sessions.get(sessionId) || null;
	}

	function set(sessionId, value) {
		sessions.set(sessionId, value);
	}

	function remove(sessionId) {
		if (sessionId) {
			sessions.delete(sessionId);
		}
	}

	return {
		get,
		set,
		remove,
	};
}

module.exports = {
	createSessionStore,
};
