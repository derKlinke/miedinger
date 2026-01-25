#!/usr/bin/env node
"use strict";

const crypto = require("crypto");

const appId = process.env.MIEDINGER_APP_ID;
const privateKeyRaw = process.env.MIEDINGER_APP_PRIVATE_KEY;
const eventType = process.env.MIEDINGER_DISPATCH_EVENT || "sync-format-configs";
const mode = process.env.MIEDINGER_DISPATCH_MODE || "detect";
const force = process.env.MIEDINGER_DISPATCH_FORCE || "true";
const selfRepo = process.env.GITHUB_REPOSITORY;

if (!appId || !privateKeyRaw) {
    console.error("error: missing MIEDINGER_APP_ID or MIEDINGER_APP_PRIVATE_KEY");
    process.exit(1);
}

const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

function base64url(input) {
    return Buffer.from(input)
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

function signJwt() {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
        iat: now - 60,
        exp: now + 9 * 60,
        iss: appId,
    };
    const encoded = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
    const signature = crypto.sign("RSA-SHA256", Buffer.from(encoded), privateKey);
    return `${encoded}.${base64url(signature)}`;
}

async function request(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }
    return response;
}

function nextLink(linkHeader) {
    if (!linkHeader) return null;
    const parts = linkHeader.split(",");
    for (const part of parts) {
        const match = part.match(/<([^>]+)>;\s*rel="next"/);
        if (match) return match[1];
    }
    return null;
}

async function listInstallations(jwt) {
    const installations = [];
    let url = "https://api.github.com/app/installations?per_page=100";
    while (url) {
        const res = await request(url, {
            headers: {
                Authorization: `Bearer ${jwt}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "miedinger-dispatch",
            },
        });
        const data = await res.json();
        installations.push(...data);
        url = nextLink(res.headers.get("link"));
    }
    return installations;
}

async function createInstallationToken(jwt, installationId) {
    const res = await request(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${jwt}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "miedinger-dispatch",
            },
        }
    );
    const data = await res.json();
    return data.token;
}

async function listRepos(token) {
    const repos = [];
    let url = "https://api.github.com/installation/repositories?per_page=100";
    while (url) {
        const res = await request(url, {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "miedinger-dispatch",
            },
        });
        const data = await res.json();
        if (Array.isArray(data.repositories)) {
            repos.push(...data.repositories);
        }
        url = nextLink(res.headers.get("link"));
    }
    return repos;
}

async function dispatchRepo(token, fullName) {
    const body = {
        event_type: eventType,
        client_payload: {
            mode,
            force: force === "true",
        },
    };
    await request(`https://api.github.com/repos/${fullName}/dispatches`, {
        method: "POST",
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "miedinger-dispatch",
        },
        body: JSON.stringify(body),
    });
}

async function main() {
    const jwt = signJwt();
    const installations = await listInstallations(jwt);
    if (installations.length === 0) {
        console.log("no installations found");
        return;
    }

    const dispatched = [];
    for (const installation of installations) {
        const token = await createInstallationToken(jwt, installation.id);
        const repos = await listRepos(token);
        for (const repo of repos) {
            if (repo.archived || repo.disabled) continue;
            if (selfRepo && repo.full_name === selfRepo) continue;
            await dispatchRepo(token, repo.full_name);
            dispatched.push(repo.full_name);
        }
    }

    if (dispatched.length === 0) {
        console.log("no repositories dispatched");
        return;
    }

    console.log(`dispatched ${dispatched.length} repositories`);
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
