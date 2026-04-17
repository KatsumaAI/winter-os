const crypto = require('crypto');

function scryptAsync(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (error, derivedKey) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(derivedKey);
        });
    });
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(password, salt);
    return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
    if (!storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
        return false;
    }

    const [salt, expectedHex] = storedHash.split(':');
    if (!salt || !expectedHex) {
        return false;
    }

    const derivedKey = await scryptAsync(password, salt);
    const expected = Buffer.from(expectedHex, 'hex');

    if (expected.length !== derivedKey.length) {
        return false;
    }

    return crypto.timingSafeEqual(expected, derivedKey);
}

module.exports = {
    hashPassword,
    verifyPassword
};
