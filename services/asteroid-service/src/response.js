const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const ok      = (body) => ({ statusCode: 200, headers: { "Content-Type": "application/json", ...CORS }, body: JSON.stringify(body) });
const error   = (message, statusCode = 500) => ({ statusCode, headers: { "Content-Type": "application/json", ...CORS }, body: JSON.stringify({ error: message }) });
const notFound   = (message = "Not found") => error(message, 404);

module.exports = { ok, error, notFound };
