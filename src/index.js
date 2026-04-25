const { getConfig } = require("./config/env");
const { createServer } = require("./app/server");

const config = getConfig();
const server = createServer(config);

server.listen(Number(config.port), () => {
	console.log(`OIDC test client running on http://localhost:${config.port}`);
});
