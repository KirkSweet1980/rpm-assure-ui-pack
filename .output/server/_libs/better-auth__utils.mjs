import { G as getWebcryptoSubtle, U as base64, W as base64Url } from "./@better-auth/core+[...].mjs";
import { randomBytes, scrypt } from "node:crypto";
//#region node_modules/@better-auth/utils/dist/password.node.mjs
var config = {
	N: 16384,
	r: 16,
	p: 1,
	dkLen: 64
};
function generateKey(password, salt) {
	return new Promise((resolve, reject) => {
		scrypt(password.normalize("NFKC"), salt, config.dkLen, {
			N: config.N,
			r: config.r,
			p: config.p,
			maxmem: 128 * config.N * config.r * 2
		}, (err, key) => {
			if (err) reject(err);
			else resolve(key);
		});
	});
}
async function hashPassword(password) {
	const salt = randomBytes(16).toString("hex");
	return `${salt}:${(await generateKey(password, salt)).toString("hex")}`;
}
async function verifyPassword(hash, password) {
	const [salt, key] = hash.split(":");
	if (!salt || !key) throw new Error("Invalid password hash");
	return (await generateKey(password, salt)).toString("hex") === key;
}
//#endregion
//#region node_modules/@better-auth/utils/dist/binary.mjs
var decoders = /* @__PURE__ */ new Map();
var binary = {
	decode: (data, encoding = "utf-8") => {
		if (!decoders.has(encoding)) decoders.set(encoding, new TextDecoder(encoding));
		return decoders.get(encoding).decode(data);
	},
	encode: new TextEncoder().encode
};
//#endregion
//#region node_modules/@better-auth/utils/dist/hex.mjs
var hexadecimal = "0123456789abcdef";
var hex = {
	encode: (data) => {
		if (typeof data === "string") data = new TextEncoder().encode(data);
		if (data.byteLength === 0) return "";
		const buffer = new Uint8Array(data);
		let result = "";
		for (const byte of buffer) result += byte.toString(16).padStart(2, "0");
		return result;
	},
	decode: (data) => {
		if (!data) return "";
		if (typeof data === "string") {
			if (data.length % 2 !== 0) throw new Error("Invalid hexadecimal string");
			if (!new RegExp(`^[${hexadecimal}]+$`).test(data)) throw new Error("Invalid hexadecimal string");
			const result = new Uint8Array(data.length / 2);
			for (let i = 0; i < data.length; i += 2) result[i / 2] = parseInt(data.slice(i, i + 2), 16);
			return new TextDecoder().decode(result);
		}
		return new TextDecoder().decode(data);
	}
};
//#endregion
//#region node_modules/@better-auth/utils/dist/hmac.mjs
var createHMAC = (algorithm = "SHA-256", encoding = "none") => {
	const hmac = {
		importKey: async (key, keyUsage) => {
			return getWebcryptoSubtle().importKey("raw", typeof key === "string" ? new TextEncoder().encode(key) : key, {
				name: "HMAC",
				hash: { name: algorithm }
			}, false, [keyUsage]);
		},
		sign: async (hmacKey, data) => {
			if (typeof hmacKey === "string") hmacKey = await hmac.importKey(hmacKey, "sign");
			const signature = await getWebcryptoSubtle().sign("HMAC", hmacKey, typeof data === "string" ? new TextEncoder().encode(data) : data);
			if (encoding === "hex") return hex.encode(signature);
			if (encoding === "base64" || encoding === "base64url" || encoding === "base64urlnopad") return base64Url.encode(signature, { padding: encoding !== "base64urlnopad" });
			return signature;
		},
		verify: async (hmacKey, data, signature) => {
			if (typeof hmacKey === "string") hmacKey = await hmac.importKey(hmacKey, "verify");
			if (encoding === "hex") signature = hex.decode(signature);
			if (encoding === "base64" || encoding === "base64url" || encoding === "base64urlnopad") signature = await base64.decode(signature);
			return getWebcryptoSubtle().verify("HMAC", hmacKey, typeof signature === "string" ? new TextEncoder().encode(signature) : signature, typeof data === "string" ? new TextEncoder().encode(data) : data);
		}
	};
	return hmac;
};
//#endregion
//#region node_modules/@better-auth/utils/dist/base32.mjs
function getAlphabet(hex) {
	return hex ? "0123456789ABCDEFGHIJKLMNOPQRSTUV" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
}
function createDecodeMap(alphabet) {
	const decodeMap = /* @__PURE__ */ new Map();
	for (let i = 0; i < alphabet.length; i++) decodeMap.set(alphabet[i], i);
	return decodeMap;
}
function base32Encode(data, alphabet, padding) {
	let result = "";
	let buffer = 0;
	let shift = 0;
	for (const byte of data) {
		buffer = buffer << 8 | byte;
		shift += 8;
		while (shift >= 5) {
			shift -= 5;
			result += alphabet[buffer >> shift & 31];
		}
	}
	if (shift > 0) result += alphabet[buffer << 5 - shift & 31];
	if (padding) {
		const padCount = (8 - result.length % 8) % 8;
		result += "=".repeat(padCount);
	}
	return result;
}
function base32Decode(data, alphabet) {
	const decodeMap = createDecodeMap(alphabet);
	const result = [];
	let buffer = 0;
	let bitsCollected = 0;
	for (const char of data) {
		if (char === "=") break;
		const value = decodeMap.get(char);
		if (value === void 0) throw new Error(`Invalid Base32 character: ${char}`);
		buffer = buffer << 5 | value;
		bitsCollected += 5;
		while (bitsCollected >= 8) {
			bitsCollected -= 8;
			result.push(buffer >> bitsCollected & 255);
		}
	}
	return Uint8Array.from(result);
}
var base32 = {
	/**
	* Encodes data into a Base32 string.
	* @param data - The data to encode (ArrayBuffer, TypedArray, or string).
	* @param options - Encoding options.
	* @returns The Base32 encoded string.
	*/
	encode(data, options = {}) {
		const alphabet = getAlphabet(false);
		return base32Encode(typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data), alphabet, options.padding ?? true);
	},
	/**
	* Decodes a Base32 string into a Uint8Array.
	* @param data - The Base32 encoded string or ArrayBuffer/TypedArray.
	* @returns The decoded Uint8Array.
	*/
	decode(data) {
		if (typeof data !== "string") data = new TextDecoder().decode(data);
		const alphabet = getAlphabet(false);
		return base32Decode(data, alphabet);
	}
};
//#endregion
//#region node_modules/@better-auth/utils/dist/otp.mjs
var defaultPeriod = 30;
var defaultDigits = 6;
function constantTimeEqualOTP(input, expected) {
	let difference = input.length ^ expected.length;
	for (let i = 0; i < expected.length; i++) difference |= input.charCodeAt(i) ^ expected.charCodeAt(i);
	return difference === 0;
}
async function generateHOTP(secret, { counter, digits, hash = "SHA-1" }) {
	const _digits = digits ?? defaultDigits;
	if (_digits < 1 || _digits > 8) throw new TypeError("Digits must be between 1 and 8");
	const buffer = /* @__PURE__ */ new ArrayBuffer(8);
	new DataView(buffer).setBigUint64(0, BigInt(counter), false);
	const bytes = new Uint8Array(buffer);
	const hmacResult = new Uint8Array(await createHMAC(hash).sign(secret, bytes));
	const offset = hmacResult[hmacResult.length - 1] & 15;
	return (((hmacResult[offset] & 127) << 24 | (hmacResult[offset + 1] & 255) << 16 | (hmacResult[offset + 2] & 255) << 8 | hmacResult[offset + 3] & 255) % 10 ** _digits).toString().padStart(_digits, "0");
}
async function generateTOTP(secret, options) {
	const digits = options?.digits ?? defaultDigits;
	const milliseconds = (options?.period ?? defaultPeriod) * 1e3;
	return await generateHOTP(secret, {
		counter: Math.floor(Date.now() / milliseconds),
		digits,
		hash: options?.hash
	});
}
async function verifyTOTP(otp, { window = 1, digits = defaultDigits, secret, period = defaultPeriod }) {
	const milliseconds = period * 1e3;
	const counter = Math.floor(Date.now() / milliseconds);
	let matched = false;
	for (let i = -window; i <= window; i++) matched = constantTimeEqualOTP(otp, await generateHOTP(secret, {
		counter: counter + i,
		digits
	})) || matched;
	return matched;
}
function generateQRCode({ issuer, account, secret, digits = defaultDigits, period = defaultPeriod }) {
	const baseURI = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
	const params = new URLSearchParams({
		secret: base32.encode(secret, { padding: false }),
		issuer
	});
	if (digits !== void 0) params.set("digits", digits.toString());
	if (period !== void 0) params.set("period", period.toString());
	return `${baseURI}?${params.toString()}`;
}
var createOTP = (secret, opts) => {
	const digits = opts?.digits ?? defaultDigits;
	const period = opts?.period ?? defaultPeriod;
	return {
		hotp: (counter) => generateHOTP(secret, {
			counter,
			digits
		}),
		totp: () => generateTOTP(secret, {
			digits,
			period
		}),
		verify: (otp, options) => verifyTOTP(otp, {
			secret,
			digits,
			period,
			...options
		}),
		url: (issuer, account) => generateQRCode({
			issuer,
			account,
			secret,
			digits,
			period
		})
	};
};
//#endregion
export { verifyPassword as a, hashPassword as i, createHMAC as n, binary as r, createOTP as t };
