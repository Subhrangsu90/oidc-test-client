const { escapeHtml } = require("./utils");

function renderPage(title, body) {
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${escapeHtml(title)}</title>
	<link rel="stylesheet" href="/styles.css" />
</head>
<body>
	<main>
		<h1>${escapeHtml(title)}</h1>
		${body}
	</main>
</body>
</html>`;
}

function renderMetaList(items) {
	return `<dl class="meta">${items
		.map(
			(item) =>
				`<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`
		)
		.join("")}</dl>`;
}

module.exports = {
	renderMetaList,
	renderPage,
};
