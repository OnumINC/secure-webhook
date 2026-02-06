const axios = require("axios");
const crypto = require("crypto");
const core = require("@actions/core");

async function run() {
  const hmacSecret = core.getInput("hmacSecret");

  if (!hmacSecret || hmacSecret.trim() === "") {
    core.setFailed("The hmac secret seems empty. This doesn't seem like what you want.");
    return;
  }
  if (hmacSecret.length < 32) {
    core.setFailed("The hmac secret seems weak. You should use at least 32 secure random hex chars.");
    return;
  }
  const uniqueChars = new Set(hmacSecret).size;
  if (uniqueChars < 4) {
    core.setFailed("The hmac secret has too little entropy. Use a properly random secret.");
    return;
  }

  const url = core.getInput("url");
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      core.setFailed("URL must use http or https protocol.");
      return;
    }
  } catch {
    core.setFailed("Invalid URL provided.");
    return;
  }

  const dataInput = core.getInput("data");
  let data;
  try {
    const parsed = JSON.parse(dataInput);
    data = typeof parsed === "object" ? parsed : dataInput;
  } catch {
    data = dataInput;
  }

  const headersInput = core.getInput("headers");
  let extraHeaders = {};
  if (headersInput) {
    try {
      extraHeaders = JSON.parse(headersInput);
    } catch {
      core.setFailed("Invalid JSON in headers input.");
      return;
    }
  }

  const createHmacSignature = (body) => {
    const hmac = crypto.createHmac("sha256", hmacSecret);
    if (body === "") {
      return hmac.digest("hex");
    }
    return hmac.update(JSON.stringify(body)).digest("hex");
  };

  const signature = createHmacSignature(data);
  const timeout = parseInt(core.getInput("timeout") || "30000", 10);
  const retries = parseInt(core.getInput("retries") || "3", 10);

  const headers = {
    "X-Hub-Signature": signature,
    "X-Hub-Signature-256": "sha256=" + signature,
    "X-Hub-SHA": process.env.GITHUB_SHA,
    ...extraHeaders,
  };

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(url, data, { headers, timeout });
      core.info(`Webhook sent successfully`);
      core.setOutput("response", JSON.stringify({
        status: response.status,
        data: response.data,
      }));
      return;
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const message = status
        ? `status code ${status}`
        : error.code || error.message;
      core.warning(`Attempt ${attempt}/${retries} failed: ${message}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  const status = lastError.response?.status;
  const message = status
    ? `status code ${status}`
    : lastError.code || lastError.message;
  core.setFailed(`Request failed after ${retries} attempts: ${message}`);
}

run();
