const crypto = require("node:crypto");

const discoveryCache = new Map();
const jwksCache = new Map();
const CLOCK_SKEW_SECONDS = 60;

function decodeBase64Url(value) {
	return Buffer.from(value, "base64url");
}

function decodeJsonPart(value, label) {
	try {
		return JSON.parse(decodeBase64Url(value).toString("utf8"));
	} catch {
		throw new Error(`Invalid JWT ${label}.`);
	}
}

async function fetchJson(url, label) {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Unable to fetch ${label}.`);
	}

	return response.json();
}

async function getDiscoveryMetadata(issuer) {
	if (!discoveryCache.has(issuer)) {
		discoveryCache.set(
			issuer,
			fetchJson(
				`${issuer}/.well-known/openid-configuration`,
				"OIDC discovery metadata",
			),
		);
	}

	return discoveryCache.get(issuer);
}

async function getJwks(jwksUri) {
	if (!jwksCache.has(jwksUri)) {
		jwksCache.set(jwksUri, fetchJson(jwksUri, "JWKS"));
	}

	return jwksCache.get(jwksUri);
}

function findSigningKey(keys, kid) {
	const candidates = Array.isArray(keys) ? keys : [];
	const key = kid
		? candidates.find(
				(candidate) =>
					candidate.kid === kid &&
					(!candidate.use || candidate.use === "sig") &&
					(!candidate.alg || candidate.alg === "RS256"),
			)
		: candidates.find(
				(candidate) =>
					(!candidate.use || candidate.use === "sig") &&
					(!candidate.alg || candidate.alg === "RS256"),
			);

	if (!key) {
		throw new Error("No matching JWKS signing key was found.");
	}

	return key;
}

function hasAudience(claims, expectedAudience) {
	if (Array.isArray(claims.aud)) {
		return claims.aud.includes(expectedAudience);
	}

	return claims.aud === expectedAudience;
}

function validateClaims(claims, issuer, audience) {
	const now = Math.floor(Date.now() / 1000);

	if (claims.iss !== issuer) {
		throw new Error("ID token issuer does not match the provider.");
	}

	if (!hasAudience(claims, audience)) {
		throw new Error("ID token audience does not match this client.");
	}

	if (typeof claims.exp !== "number" || claims.exp <= now - CLOCK_SKEW_SECONDS) {
		throw new Error("ID token has expired.");
	}

	if (typeof claims.nbf === "number" && claims.nbf > now + CLOCK_SKEW_SECONDS) {
		throw new Error("ID token is not valid yet.");
	}

	if (typeof claims.iat === "number" && claims.iat > now + CLOCK_SKEW_SECONDS) {
		throw new Error("ID token was issued in the future.");
	}
}

async function verifyIdToken(idToken, issuer, audience) {
	if (typeof idToken !== "string" || !idToken) {
		throw new Error("Token response did not include an ID token.");
	}

	const parts = idToken.split(".");

	if (parts.length !== 3) {
		throw new Error("Invalid ID token format.");
	}

	const [encodedHeader, encodedPayload, encodedSignature] = parts;
	const header = decodeJsonPart(encodedHeader, "header");
	const claims = decodeJsonPart(encodedPayload, "payload");

	if (header.alg !== "RS256") {
		throw new Error("ID token must be signed with RS256.");
	}

	const metadata = await getDiscoveryMetadata(issuer);

	if (metadata.issuer !== issuer) {
		throw new Error("Discovery issuer does not match configured issuer.");
	}

	if (!metadata.jwks_uri) {
		throw new Error("Discovery metadata did not include jwks_uri.");
	}

	const jwks = await getJwks(metadata.jwks_uri);
	const key = findSigningKey(jwks.keys, header.kid);
	const publicKey = crypto.createPublicKey({ key, format: "jwk" });
	const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`);
	const signature = decodeBase64Url(encodedSignature);
	const isValidSignature = crypto.verify(
		"RSA-SHA256",
		signingInput,
		publicKey,
		signature,
	);

	if (!isValidSignature) {
		throw new Error("ID token signature is invalid.");
	}

	validateClaims(claims, metadata.issuer, audience);

	return claims;
}

module.exports = {
	verifyIdToken,
};
