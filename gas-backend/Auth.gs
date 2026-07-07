/**
 * Auth.gs
 * -----------------------------------------------------------------------
 * Password hashing (SHA-256 + per-user salt + a global pepper) and a
 * from-scratch HS256 JWT implementation, since Apps Script can't install
 * npm packages like jsonwebtoken. Also the requireRole_() gate that every
 * protected action calls — the server NEVER trusts the frontend's idea
 * of who is logged in or what they're allowed to do.
 * -----------------------------------------------------------------------
 */

function randomSalt_() {
  return Utilities.getUuid().replace(/-/g, '');
}

function hashPassword_(password, salt) {
  var pepper = getPasswordPepper_();
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt + pepper);
  return raw.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function verifyPassword_(password, salt, expectedHash) {
  return hashPassword_(password, salt) === expectedHash;
}

function base64url_(bytesOrString) {
  var b64 = Utilities.base64Encode(bytesOrString);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecodeToString_(str) {
  var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString();
}

/** Signs an HS256 JWT that expires after `expiresInSeconds`. */
function signJwt_(payload, expiresInSeconds) {
  var header = { alg: 'HS256', typ: 'JWT' };
  var now = Math.floor(Date.now() / 1000);
  var body = Object.assign({}, payload, { iat: now, exp: now + (expiresInSeconds || 3600) });
  var headerEnc = base64url_(JSON.stringify(header));
  var bodyEnc = base64url_(JSON.stringify(body));
  var toSign = headerEnc + '.' + bodyEnc;
  var sig = Utilities.computeHmacSha256Signature(toSign, getJwtSecret_());
  var sigEnc = base64url_(sig);
  return toSign + '.' + sigEnc;
}

/** Verifies signature + expiry. Returns the decoded payload, or throws. */
function verifyJwt_(token) {
  if (!token) throw new Error('Missing auth token.');
  var parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed auth token.');
  var toSign = parts[0] + '.' + parts[1];
  var expectedSig = base64url_(Utilities.computeHmacSha256Signature(toSign, getJwtSecret_()));
  if (expectedSig !== parts[2]) throw new Error('Invalid auth token signature.');
  var payload = JSON.parse(base64urlDecodeToString_(parts[1]));
  var now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) throw new Error('Session expired, please log in again.');
  return payload;
}

/** Throws "Forbidden" unless payload.role is one of allowedRoles.
 *  Call this at the very top of every protected handler. */
function requireRole_(payload, allowedRoles) {
  if (!payload || allowedRoles.indexOf(payload.role) === -1) {
    throw new Error('Forbidden: your role does not have permission to do this.');
  }
}
