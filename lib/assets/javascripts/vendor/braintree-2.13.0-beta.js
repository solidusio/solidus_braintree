/*!
 * Braintree End-to-End Encryption Library
 * https://www.braintreepayments.com
 * Copyright (c) 2009-2014 Braintree, a division of PayPal, Inc.
 *
 * JSBN
 * Copyright (c) 2005  Tom Wu
 *
 * Both Licensed under the MIT License.
 * http://opensource.org/licenses/MIT
 *
 * ASN.1 JavaScript decoder
 * Copyright (c) 2008-2009 Lapo Luchini <lapo@lapo.it>
 * Licensed under the ISC License.
 * http://opensource.org/licenses/ISC
 */

(function () {

// ASN.1 JavaScript decoder
// Copyright (c) 2008-2009 Lapo Luchini <lapo@lapo.it>

// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
// 
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

function Stream(enc, pos) {
    if (enc instanceof Stream) {
        this.enc = enc.enc;
        this.pos = enc.pos;
    } else {
        this.enc = enc;
        this.pos = pos;
    }
}
Stream.prototype.get = function(pos) {
    if (pos == undefined)
        pos = this.pos++;
    if (pos >= this.enc.length)
        throw 'Requesting byte offset ' + pos + ' on a stream of length ' + this.enc.length;
    return this.enc[pos];
}
Stream.prototype.hexDigits = "0123456789ABCDEF";
Stream.prototype.hexByte = function(b) {
    return this.hexDigits.charAt((b >> 4) & 0xF) + this.hexDigits.charAt(b & 0xF);
}
Stream.prototype.hexDump = function(start, end) {
    var s = "";
    for (var i = start; i < end; ++i) {
        s += this.hexByte(this.get(i));
        switch (i & 0xF) {
        case 0x7: s += "  "; break;
        case 0xF: s += "\n"; break;
        default:  s += " ";
        }
    }
    return s;
}
Stream.prototype.parseStringISO = function(start, end) {
    var s = "";
    for (var i = start; i < end; ++i)
        s += String.fromCharCode(this.get(i));
    return s;
}
Stream.prototype.parseStringUTF = function(start, end) {
    var s = "", c = 0;
    for (var i = start; i < end; ) {
        var c = this.get(i++);
        if (c < 128)
            s += String.fromCharCode(c);
        else if ((c > 191) && (c < 224))
            s += String.fromCharCode(((c & 0x1F) << 6) | (this.get(i++) & 0x3F));
        else
            s += String.fromCharCode(((c & 0x0F) << 12) | ((this.get(i++) & 0x3F) << 6) | (this.get(i++) & 0x3F));
        //TODO: this doesn't check properly 'end', some char could begin before and end after
    }
    return s;
}
Stream.prototype.reTime = /^((?:1[89]|2\d)?\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
Stream.prototype.parseTime = function(start, end) {
    var s = this.parseStringISO(start, end);
    var m = this.reTime.exec(s);
    if (!m)
        return "Unrecognized time: " + s;
    s = m[1] + "-" + m[2] + "-" + m[3] + " " + m[4];
    if (m[5]) {
        s += ":" + m[5];
        if (m[6]) {
            s += ":" + m[6];
            if (m[7])
                s += "." + m[7];
        }
    }
    if (m[8]) {
        s += " UTC";
        if (m[8] != 'Z') {
            s += m[8];
            if (m[9])
                s += ":" + m[9];
        }
    }
    return s;
}
Stream.prototype.parseInteger = function(start, end) {
    //TODO support negative numbers
    var len = end - start;
    if (len > 4) {
        len <<= 3;
        var s = this.get(start);
        if (s == 0)
            len -= 8;
        else
            while (s < 128) {
                s <<= 1;
                --len;
            }
        return "(" + len + " bit)";
    }
    var n = 0;
    for (var i = start; i < end; ++i)
        n = (n << 8) | this.get(i);
    return n;
}
Stream.prototype.parseBitString = function(start, end) {
    var unusedBit = this.get(start);
    var lenBit = ((end - start - 1) << 3) - unusedBit;
    var s  = "(" + lenBit + " bit)";
    if (lenBit <= 20) {
        var skip = unusedBit;
        s += " ";
        for (var i = end - 1; i > start; --i) {
            var b = this.get(i);
            for (var j = skip; j < 8; ++j)
                s += (b >> j) & 1 ? "1" : "0";
            skip = 0;
        }
    }
    return s;
}
Stream.prototype.parseOctetString = function(start, end) {
    var len = end - start;
    var s = "(" + len + " byte) ";
    if (len > 20)
        end = start + 20;
    for (var i = start; i < end; ++i)
        s += this.hexByte(this.get(i));
    if (len > 20)
        s += String.fromCharCode(8230); // ellipsis
    return s;
}
Stream.prototype.parseOID = function(start, end) {
    var s, n = 0, bits = 0;
    for (var i = start; i < end; ++i) {
        var v = this.get(i);
        n = (n << 7) | (v & 0x7F);
        bits += 7;
        if (!(v & 0x80)) { // finished
            if (s == undefined)
                s = parseInt(n / 40) + "." + (n % 40);
            else
                s += "." + ((bits >= 31) ? "bigint" : n);
            n = bits = 0;
        }
        s += String.fromCharCode();
    }
    return s;
}

function ASN1(stream, header, length, tag, sub) {
    this.stream = stream;
    this.header = header;
    this.length = length;
    this.tag = tag;
    this.sub = sub;
}
ASN1.prototype.typeName = function() {
    if (this.tag == undefined)
        return "unknown";
    var tagClass = this.tag >> 6;
    var tagConstructed = (this.tag >> 5) & 1;
    var tagNumber = this.tag & 0x1F;
    switch (tagClass) {
    case 0: // universal
        switch (tagNumber) {
        case 0x00: return "EOC";
        case 0x01: return "BOOLEAN";
        case 0x02: return "INTEGER";
        case 0x03: return "BIT_STRING";
        case 0x04: return "OCTET_STRING";
        case 0x05: return "NULL";
        case 0x06: return "OBJECT_IDENTIFIER";
        case 0x07: return "ObjectDescriptor";
        case 0x08: return "EXTERNAL";
        case 0x09: return "REAL";
        case 0x0A: return "ENUMERATED";
        case 0x0B: return "EMBEDDED_PDV";
        case 0x0C: return "UTF8String";
        case 0x10: return "SEQUENCE";
        case 0x11: return "SET";
        case 0x12: return "NumericString";
        case 0x13: return "PrintableString"; // ASCII subset
        case 0x14: return "TeletexString"; // aka T61String
        case 0x15: return "VideotexString";
        case 0x16: return "IA5String"; // ASCII
        case 0x17: return "UTCTime";
        case 0x18: return "GeneralizedTime";
        case 0x19: return "GraphicString";
        case 0x1A: return "VisibleString"; // ASCII subset
        case 0x1B: return "GeneralString";
        case 0x1C: return "UniversalString";
        case 0x1E: return "BMPString";
        default: return "Universal_" + tagNumber.toString(16);
        }
    case 1: return "Application_" + tagNumber.toString(16);
    case 2: return "[" + tagNumber + "]"; // Context
    case 3: return "Private_" + tagNumber.toString(16);
    }
}
ASN1.prototype.content = function() {
    if (this.tag == undefined)
        return null;
    var tagClass = this.tag >> 6;
    if (tagClass != 0) // universal
        return (this.sub == null) ? null : "(" + this.sub.length + ")";
    var tagNumber = this.tag & 0x1F;
    var content = this.posContent();
    var len = Math.abs(this.length);
    switch (tagNumber) {
    case 0x01: // BOOLEAN
        return (this.stream.get(content) == 0) ? "false" : "true";
    case 0x02: // INTEGER
        return this.stream.parseInteger(content, content + len);
    case 0x03: // BIT_STRING
        return this.sub ? "(" + this.sub.length + " elem)" :
            this.stream.parseBitString(content, content + len)
    case 0x04: // OCTET_STRING
        return this.sub ? "(" + this.sub.length + " elem)" :
            this.stream.parseOctetString(content, content + len)
    //case 0x05: // NULL
    case 0x06: // OBJECT_IDENTIFIER
        return this.stream.parseOID(content, content + len);
    //case 0x07: // ObjectDescriptor
    //case 0x08: // EXTERNAL
    //case 0x09: // REAL
    //case 0x0A: // ENUMERATED
    //case 0x0B: // EMBEDDED_PDV
    case 0x10: // SEQUENCE
    case 0x11: // SET
        return "(" + this.sub.length + " elem)";
    case 0x0C: // UTF8String
        return this.stream.parseStringUTF(content, content + len);
    case 0x12: // NumericString
    case 0x13: // PrintableString
    case 0x14: // TeletexString
    case 0x15: // VideotexString
    case 0x16: // IA5String
    //case 0x19: // GraphicString
    case 0x1A: // VisibleString
    //case 0x1B: // GeneralString
    //case 0x1C: // UniversalString
    //case 0x1E: // BMPString
        return this.stream.parseStringISO(content, content + len);
    case 0x17: // UTCTime
    case 0x18: // GeneralizedTime
        return this.stream.parseTime(content, content + len);
    }
    return null;
}
ASN1.prototype.toString = function() {
    return this.typeName() + "@" + this.stream.pos + "[header:" + this.header + ",length:" + this.length + ",sub:" + ((this.sub == null) ? 'null' : this.sub.length) + "]";
}
ASN1.prototype.print = function(indent) {
    if (indent == undefined) indent = '';
    document.writeln(indent + this);
    if (this.sub != null) {
        indent += '  ';
        for (var i = 0, max = this.sub.length; i < max; ++i)
            this.sub[i].print(indent);
    }
}
ASN1.prototype.toPrettyString = function(indent) {
    if (indent == undefined) indent = '';
    var s = indent + this.typeName() + " @" + this.stream.pos;
    if (this.length >= 0)
        s += "+";
    s += this.length;
    if (this.tag & 0x20)
        s += " (constructed)";
    else if (((this.tag == 0x03) || (this.tag == 0x04)) && (this.sub != null))
        s += " (encapsulates)";
    s += "\n";
    if (this.sub != null) {
        indent += '  ';
        for (var i = 0, max = this.sub.length; i < max; ++i)
            s += this.sub[i].toPrettyString(indent);
    }
    return s;
}
ASN1.prototype.posStart = function() {
    return this.stream.pos;
}
ASN1.prototype.posContent = function() {
    return this.stream.pos + this.header;
}
ASN1.prototype.posEnd = function() {
    return this.stream.pos + this.header + Math.abs(this.length);
}
ASN1.decodeLength = function(stream) {
    var buf = stream.get();
    var len = buf & 0x7F;
    if (len == buf)
        return len;
    if (len > 3)
        throw "Length over 24 bits not supported at position " + (stream.pos - 1);
    if (len == 0)
        return -1; // undefined
    buf = 0;
    for (var i = 0; i < len; ++i)
        buf = (buf << 8) | stream.get();
    return buf;
}
ASN1.hasContent = function(tag, len, stream) {
    if (tag & 0x20) // constructed
        return true;
    if ((tag < 0x03) || (tag > 0x04))
        return false;
    var p = new Stream(stream);
    if (tag == 0x03) p.get(); // BitString unused bits, must be in [0, 7]
    var subTag = p.get();
    if ((subTag >> 6) & 0x01) // not (universal or context)
        return false;
    try {
        var subLength = ASN1.decodeLength(p);
        return ((p.pos - stream.pos) + subLength == len);
    } catch (exception) {
        return false;
    }
}
ASN1.decode = function(stream) {
    if (!(stream instanceof Stream))
        stream = new Stream(stream, 0);
    var streamStart = new Stream(stream);
    var tag = stream.get();
    var len = ASN1.decodeLength(stream);
    var header = stream.pos - streamStart.pos;
    var sub = null;
    if (ASN1.hasContent(tag, len, stream)) {
        // it has content, so we decode it
        var start = stream.pos;
        if (tag == 0x03) stream.get(); // skip BitString unused bits, must be in [0, 7]
        sub = [];
        if (len >= 0) {
            // definite length
            var end = start + len;
            while (stream.pos < end)
                sub[sub.length] = ASN1.decode(stream);
            if (stream.pos != end)
                throw "Content size is not correct for container starting at offset " + start;
        } else {
            // undefined length
            try {
                for (;;) {
                    var s = ASN1.decode(stream);
                    if (s.tag == 0)
                        break;
                    sub[sub.length] = s;
                }
                len = start - stream.pos;
            } catch (e) {
                throw "Exception while decoding undefined length content: " + e;
            }
        }
    } else
        stream.pos += len; // skip content
    return new ASN1(streamStart, header, len, tag, sub);
}

var b64map="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var b64padchar="=";

function hex2b64(h) {
  var i;
  var c;
  var ret = "";
  for(i = 0; i+3 <= h.length; i+=3) {
    c = parseInt(h.substring(i,i+3),16);
    ret += b64map.charAt(c >> 6) + b64map.charAt(c & 63);
  }
  if(i+1 == h.length) {
    c = parseInt(h.substring(i,i+1),16);
    ret += b64map.charAt(c << 2);
  }
  else if(i+2 == h.length) {
    c = parseInt(h.substring(i,i+2),16);
    ret += b64map.charAt(c >> 2) + b64map.charAt((c & 3) << 4);
  }
  while((ret.length & 3) > 0) ret += b64padchar;
  return ret;
}

// convert a base64 string to hex
function b64tohex(s) {
  var ret = "";
  var i;
  var k = 0; // b64 state, 0-3
  var slop;
  var v;
  for(i = 0; i < s.length; ++i) {
    if(s.charAt(i) == b64padchar) break;
    v = b64map.indexOf(s.charAt(i));
    if(v < 0) continue;
    if(k == 0) {
      ret += int2char(v >> 2);
      slop = v & 3;
      k = 1;
    }
    else if(k == 1) {
      ret += int2char((slop << 2) | (v >> 4));
      slop = v & 0xf;
      k = 2;
    }
    else if(k == 2) {
      ret += int2char(slop);
      ret += int2char(v >> 2);
      slop = v & 3;
      k = 3;
    }
    else {
      ret += int2char((slop << 2) | (v >> 4));
      ret += int2char(v & 0xf);
      k = 0;
    }
  }
  if(k == 1)
    ret += int2char(slop << 2);
  return ret;
}

// convert a base64 string to a byte/number array
function b64toBA(s) {
  //piggyback on b64tohex for now, optimize later
  var h = b64tohex(s);
  var i;
  var a = new Array();
  for(i = 0; 2*i < h.length; ++i) {
    a[i] = parseInt(h.substring(2*i,2*i+2),16);
  }
  return a;
}

// Copyright (c) 2005  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Basic JavaScript BN library - subset useful for RSA encryption.

// Bits per digit
var dbits;

// JavaScript engine analysis
var canary = 0xdeadbeefcafe;
var j_lm = ((canary&0xffffff)==0xefcafe);

// (public) Constructor
function BigInteger(a,b,c) {
  if(a != null)
    if("number" == typeof a) this.fromNumber(a,b,c);
    else if(b == null && "string" != typeof a) this.fromString(a,256);
    else this.fromString(a,b);
}

// return new, unset BigInteger
function nbi() { return new BigInteger(null); }

// am: Compute w_j += (x*this_i), propagate carries,
// c is initial carry, returns final carry.
// c < 3*dvalue, x < 2*dvalue, this_i < dvalue
// We need to select the fastest one that works in this environment.

// am1: use a single mult and divide to get the high bits,
// max digit bits should be 26 because
// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
function am1(i,x,w,j,c,n) {
  while(--n >= 0) {
    var v = x*this[i++]+w[j]+c;
    c = Math.floor(v/0x4000000);
    w[j++] = v&0x3ffffff;
  }
  return c;
}
// am2 avoids a big mult-and-extract completely.
// Max digit bits should be <= 30 because we do bitwise ops
// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
function am2(i,x,w,j,c,n) {
  var xl = x&0x7fff, xh = x>>15;
  while(--n >= 0) {
    var l = this[i]&0x7fff;
    var h = this[i++]>>15;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
    c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
    w[j++] = l&0x3fffffff;
  }
  return c;
}
// Alternately, set max digit bits to 28 since some
// browsers slow down when dealing with 32-bit numbers.
function am3(i,x,w,j,c,n) {
  var xl = x&0x3fff, xh = x>>14;
  while(--n >= 0) {
    var l = this[i]&0x3fff;
    var h = this[i++]>>14;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x3fff)<<14)+w[j]+c;
    c = (l>>28)+(m>>14)+xh*h;
    w[j++] = l&0xfffffff;
  }
  return c;
}
if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
  BigInteger.prototype.am = am2;
  dbits = 30;
}
else if(j_lm && (navigator.appName != "Netscape")) {
  BigInteger.prototype.am = am1;
  dbits = 26;
}
else { // Mozilla/Netscape seems to prefer am3
  BigInteger.prototype.am = am3;
  dbits = 28;
}

BigInteger.prototype.DB = dbits;
BigInteger.prototype.DM = ((1<<dbits)-1);
BigInteger.prototype.DV = (1<<dbits);

var BI_FP = 52;
BigInteger.prototype.FV = Math.pow(2,BI_FP);
BigInteger.prototype.F1 = BI_FP-dbits;
BigInteger.prototype.F2 = 2*dbits-BI_FP;

// Digit conversions
var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
var BI_RC = new Array();
var rr,vv;
rr = "0".charCodeAt(0);
for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
rr = "a".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
rr = "A".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

function int2char(n) { return BI_RM.charAt(n); }
function intAt(s,i) {
  var c = BI_RC[s.charCodeAt(i)];
  return (c==null)?-1:c;
}

// (protected) copy this to r
function bnpCopyTo(r) {
  for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
  r.t = this.t;
  r.s = this.s;
}

// (protected) set from integer value x, -DV <= x < DV
function bnpFromInt(x) {
  this.t = 1;
  this.s = (x<0)?-1:0;
  if(x > 0) this[0] = x;
  else if(x < -1) this[0] = x+this.DV;
  else this.t = 0;
}

// return bigint initialized to value
function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

// (protected) set from string and radix
function bnpFromString(s,b) {
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 256) k = 8; // byte array
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else { this.fromRadix(s,b); return; }
  this.t = 0;
  this.s = 0;
  var i = s.length, mi = false, sh = 0;
  while(--i >= 0) {
    var x = (k==8)?s[i]&0xff:intAt(s,i);
    if(x < 0) {
      if(s.charAt(i) == "-") mi = true;
      continue;
    }
    mi = false;
    if(sh == 0)
      this[this.t++] = x;
    else if(sh+k > this.DB) {
      this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
      this[this.t++] = (x>>(this.DB-sh));
    }
    else
      this[this.t-1] |= x<<sh;
    sh += k;
    if(sh >= this.DB) sh -= this.DB;
  }
  if(k == 8 && (s[0]&0x80) != 0) {
    this.s = -1;
    if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
  }
  this.clamp();
  if(mi) BigInteger.ZERO.subTo(this,this);
}

// (protected) clamp off excess high words
function bnpClamp() {
  var c = this.s&this.DM;
  while(this.t > 0 && this[this.t-1] == c) --this.t;
}

// (public) return string representation in given radix
function bnToString(b) {
  if(this.s < 0) return "-"+this.negate().toString(b);
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else return this.toRadix(b);
  var km = (1<<k)-1, d, m = false, r = "", i = this.t;
  var p = this.DB-(i*this.DB)%k;
  if(i-- > 0) {
    if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
    while(i >= 0) {
      if(p < k) {
        d = (this[i]&((1<<p)-1))<<(k-p);
        d |= this[--i]>>(p+=this.DB-k);
      }
      else {
        d = (this[i]>>(p-=k))&km;
        if(p <= 0) { p += this.DB; --i; }
      }
      if(d > 0) m = true;
      if(m) r += int2char(d);
    }
  }
  return m?r:"0";
}

// (public) -this
function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

// (public) |this|
function bnAbs() { return (this.s<0)?this.negate():this; }

// (public) return + if this > a, - if this < a, 0 if equal
function bnCompareTo(a) {
  var r = this.s-a.s;
  if(r != 0) return r;
  var i = this.t;
  r = i-a.t;
  if(r != 0) return (this.s<0)?-r:r;
  while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
  return 0;
}

// returns bit length of the integer x
function nbits(x) {
  var r = 1, t;
  if((t=x>>>16) != 0) { x = t; r += 16; }
  if((t=x>>8) != 0) { x = t; r += 8; }
  if((t=x>>4) != 0) { x = t; r += 4; }
  if((t=x>>2) != 0) { x = t; r += 2; }
  if((t=x>>1) != 0) { x = t; r += 1; }
  return r;
}

// (public) return the number of bits in "this"
function bnBitLength() {
  if(this.t <= 0) return 0;
  return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
}

// (protected) r = this << n*DB
function bnpDLShiftTo(n,r) {
  var i;
  for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
  for(i = n-1; i >= 0; --i) r[i] = 0;
  r.t = this.t+n;
  r.s = this.s;
}

// (protected) r = this >> n*DB
function bnpDRShiftTo(n,r) {
  for(var i = n; i < this.t; ++i) r[i-n] = this[i];
  r.t = Math.max(this.t-n,0);
  r.s = this.s;
}

// (protected) r = this << n
function bnpLShiftTo(n,r) {
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<cbs)-1;
  var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
  for(i = this.t-1; i >= 0; --i) {
    r[i+ds+1] = (this[i]>>cbs)|c;
    c = (this[i]&bm)<<bs;
  }
  for(i = ds-1; i >= 0; --i) r[i] = 0;
  r[ds] = c;
  r.t = this.t+ds+1;
  r.s = this.s;
  r.clamp();
}

// (protected) r = this >> n
function bnpRShiftTo(n,r) {
  r.s = this.s;
  var ds = Math.floor(n/this.DB);
  if(ds >= this.t) { r.t = 0; return; }
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<bs)-1;
  r[0] = this[ds]>>bs;
  for(var i = ds+1; i < this.t; ++i) {
    r[i-ds-1] |= (this[i]&bm)<<cbs;
    r[i-ds] = this[i]>>bs;
  }
  if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
  r.t = this.t-ds;
  r.clamp();
}

// (protected) r = this - a
function bnpSubTo(a,r) {
  var i = 0, c = 0, m = Math.min(a.t,this.t);
  while(i < m) {
    c += this[i]-a[i];
    r[i++] = c&this.DM;
    c >>= this.DB;
  }
  if(a.t < this.t) {
    c -= a.s;
    while(i < this.t) {
      c += this[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += this.s;
  }
  else {
    c += this.s;
    while(i < a.t) {
      c -= a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c -= a.s;
  }
  r.s = (c<0)?-1:0;
  if(c < -1) r[i++] = this.DV+c;
  else if(c > 0) r[i++] = c;
  r.t = i;
  r.clamp();
}

// (protected) r = this * a, r != this,a (HAC 14.12)
// "this" should be the larger one if appropriate.
function bnpMultiplyTo(a,r) {
  var x = this.abs(), y = a.abs();
  var i = x.t;
  r.t = i+y.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
  r.s = 0;
  r.clamp();
  if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
}

// (protected) r = this^2, r != this (HAC 14.16)
function bnpSquareTo(r) {
  var x = this.abs();
  var i = r.t = 2*x.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < x.t-1; ++i) {
    var c = x.am(i,x[i],r,2*i,0,1);
    if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
      r[i+x.t] -= x.DV;
      r[i+x.t+1] = 1;
    }
  }
  if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
  r.s = 0;
  r.clamp();
}

// (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
// r != q, this != m.  q or r may be null.
function bnpDivRemTo(m,q,r) {
  var pm = m.abs();
  if(pm.t <= 0) return;
  var pt = this.abs();
  if(pt.t < pm.t) {
    if(q != null) q.fromInt(0);
    if(r != null) this.copyTo(r);
    return;
  }
  if(r == null) r = nbi();
  var y = nbi(), ts = this.s, ms = m.s;
  var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
  if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
  else { pm.copyTo(y); pt.copyTo(r); }
  var ys = y.t;
  var y0 = y[ys-1];
  if(y0 == 0) return;
  var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
  var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
  var i = r.t, j = i-ys, t = (q==null)?nbi():q;
  y.dlShiftTo(j,t);
  if(r.compareTo(t) >= 0) {
    r[r.t++] = 1;
    r.subTo(t,r);
  }
  BigInteger.ONE.dlShiftTo(ys,t);
  t.subTo(y,y);	// "negative" y so we can replace sub with am later
  while(y.t < ys) y[y.t++] = 0;
  while(--j >= 0) {
    // Estimate quotient digit
    var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
    if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
      y.dlShiftTo(j,t);
      r.subTo(t,r);
      while(r[i] < --qd) r.subTo(t,r);
    }
  }
  if(q != null) {
    r.drShiftTo(ys,q);
    if(ts != ms) BigInteger.ZERO.subTo(q,q);
  }
  r.t = ys;
  r.clamp();
  if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
  if(ts < 0) BigInteger.ZERO.subTo(r,r);
}

// (public) this mod a
function bnMod(a) {
  var r = nbi();
  this.abs().divRemTo(a,null,r);
  if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
  return r;
}

// Modular reduction using "classic" algorithm
function Classic(m) { this.m = m; }
function cConvert(x) {
  if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
  else return x;
}
function cRevert(x) { return x; }
function cReduce(x) { x.divRemTo(this.m,null,x); }
function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

Classic.prototype.convert = cConvert;
Classic.prototype.revert = cRevert;
Classic.prototype.reduce = cReduce;
Classic.prototype.mulTo = cMulTo;
Classic.prototype.sqrTo = cSqrTo;

// (protected) return "-1/this % 2^DB"; useful for Mont. reduction
// justification:
//         xy == 1 (mod m)
//         xy =  1+km
//   xy(2-xy) = (1+km)(1-km)
// x[y(2-xy)] = 1-k^2m^2
// x[y(2-xy)] == 1 (mod m^2)
// if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
// should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
// JS multiply "overflows" differently from C/C++, so care is needed here.
function bnpInvDigit() {
  if(this.t < 1) return 0;
  var x = this[0];
  if((x&1) == 0) return 0;
  var y = x&3;		// y == 1/x mod 2^2
  y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
  y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
  y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
  // last step - calculate inverse mod DV directly;
  // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
  y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
  // we really want the negative inverse, and -DV < y < DV
  return (y>0)?this.DV-y:-y;
}

// Montgomery reduction
function Montgomery(m) {
  this.m = m;
  this.mp = m.invDigit();
  this.mpl = this.mp&0x7fff;
  this.mph = this.mp>>15;
  this.um = (1<<(m.DB-15))-1;
  this.mt2 = 2*m.t;
}

// xR mod m
function montConvert(x) {
  var r = nbi();
  x.abs().dlShiftTo(this.m.t,r);
  r.divRemTo(this.m,null,r);
  if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
  return r;
}

// x/R mod m
function montRevert(x) {
  var r = nbi();
  x.copyTo(r);
  this.reduce(r);
  return r;
}

// x = x/R mod m (HAC 14.32)
function montReduce(x) {
  while(x.t <= this.mt2)	// pad x so am has enough room later
    x[x.t++] = 0;
  for(var i = 0; i < this.m.t; ++i) {
    // faster way of calculating u0 = x[i]*mp mod DV
    var j = x[i]&0x7fff;
    var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
    // use am to combine the multiply-shift-add into one call
    j = i+this.m.t;
    x[j] += this.m.am(0,u0,x,i,0,this.m.t);
    // propagate carry
    while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
  }
  x.clamp();
  x.drShiftTo(this.m.t,x);
  if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
}

// r = "x^2/R mod m"; x != r
function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

// r = "xy/R mod m"; x,y != r
function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

Montgomery.prototype.convert = montConvert;
Montgomery.prototype.revert = montRevert;
Montgomery.prototype.reduce = montReduce;
Montgomery.prototype.mulTo = montMulTo;
Montgomery.prototype.sqrTo = montSqrTo;

// (protected) true iff this is even
function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

// (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
function bnpExp(e,z) {
  if(e > 0xffffffff || e < 1) return BigInteger.ONE;
  var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
  g.copyTo(r);
  while(--i >= 0) {
    z.sqrTo(r,r2);
    if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
    else { var t = r; r = r2; r2 = t; }
  }
  return z.revert(r);
}

// (public) this^e % m, 0 <= e < 2^32
function bnModPowInt(e,m) {
  var z;
  if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
  return this.exp(e,z);
}

// protected
BigInteger.prototype.copyTo = bnpCopyTo;
BigInteger.prototype.fromInt = bnpFromInt;
BigInteger.prototype.fromString = bnpFromString;
BigInteger.prototype.clamp = bnpClamp;
BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
BigInteger.prototype.drShiftTo = bnpDRShiftTo;
BigInteger.prototype.lShiftTo = bnpLShiftTo;
BigInteger.prototype.rShiftTo = bnpRShiftTo;
BigInteger.prototype.subTo = bnpSubTo;
BigInteger.prototype.multiplyTo = bnpMultiplyTo;
BigInteger.prototype.squareTo = bnpSquareTo;
BigInteger.prototype.divRemTo = bnpDivRemTo;
BigInteger.prototype.invDigit = bnpInvDigit;
BigInteger.prototype.isEven = bnpIsEven;
BigInteger.prototype.exp = bnpExp;

// public
BigInteger.prototype.toString = bnToString;
BigInteger.prototype.negate = bnNegate;
BigInteger.prototype.abs = bnAbs;
BigInteger.prototype.compareTo = bnCompareTo;
BigInteger.prototype.bitLength = bnBitLength;
BigInteger.prototype.mod = bnMod;
BigInteger.prototype.modPowInt = bnModPowInt;

// "constants"
BigInteger.ZERO = nbv(0);
BigInteger.ONE = nbv(1);

// Depends on jsbn.js and rng.js

// Version 1.1: support utf-8 encoding in pkcs1pad2

// convert a (hex) string to a bignum object
function parseBigInt(str,r) {
  return new BigInteger(str,r);
}

function linebrk(s,n) {
  var ret = "";
  var i = 0;
  while(i + n < s.length) {
    ret += s.substring(i,i+n) + "\n";
    i += n;
  }
  return ret + s.substring(i,s.length);
}

function byte2Hex(b) {
  if(b < 0x10)
    return "0" + b.toString(16);
  else
    return b.toString(16);
}

// PKCS#1 (type 2, random) pad input string s to n bytes, and return a bigint
function pkcs1pad2(s,n) {
  if(n < s.length + 11) { // TODO: fix for utf-8
    throw new Error("Message too long for RSA");
  }
  var ba = new Array();
  var i = s.length - 1;
  while(i >= 0 && n > 0) {
    var c = s.charCodeAt(i--);
    if(c < 128) { // encode using utf-8
      ba[--n] = c;
    }
    else if((c > 127) && (c < 2048)) {
      ba[--n] = (c & 63) | 128;
      ba[--n] = (c >> 6) | 192;
    }
    else {
      ba[--n] = (c & 63) | 128;
      ba[--n] = ((c >> 6) & 63) | 128;
      ba[--n] = (c >> 12) | 224;
    }
  }
  ba[--n] = 0;
  var randomByte = 0;
  var random = 0;
  var shift = 0;
  while(n > 2) { // random non-zero pad
    if (shift == 0) {
      random = sjcl.random.randomWords(1, 0)[0];
    }

    randomByte = (random >> shift) & 0xff;
    shift = (shift + 8) % 32;
    if (randomByte != 0) {
      ba[--n] = randomByte;
    }
  }
  ba[--n] = 2;
  ba[--n] = 0;
  return new BigInteger(ba);
}

// "empty" RSA key constructor
function RSAKey() {
  this.n = null;
  this.e = 0;
  this.d = null;
  this.p = null;
  this.q = null;
  this.dmp1 = null;
  this.dmq1 = null;
  this.coeff = null;
}

// Set the public key fields N and e from hex strings
function RSASetPublic(N,E) {
  if(N != null && E != null && N.length > 0 && E.length > 0) {
    this.n = parseBigInt(N,16);
    this.e = parseInt(E,16);
  }
  else
    throw new Error("Invalid RSA public key");
}

// Perform raw public operation on "x": return x^e (mod n)
function RSADoPublic(x) {
  return x.modPowInt(this.e, this.n);
}

// Return the PKCS#1 RSA encryption of "text" as an even-length hex string
function RSAEncrypt(text) {
  var m = pkcs1pad2(text,(this.n.bitLength()+7)>>3);
  if(m == null) return null;
  var c = this.doPublic(m);
  if(c == null) return null;
  var h = c.toString(16);
  if((h.length & 1) == 0) return h; else return "0" + h;
}

// Return the PKCS#1 RSA encryption of "text" as a Base64-encoded string
//function RSAEncryptB64(text) {
//  var h = this.encrypt(text);
//  if(h) return hex2b64(h); else return null;
//}

// protected
RSAKey.prototype.doPublic = RSADoPublic;

// public
RSAKey.prototype.setPublic = RSASetPublic;
RSAKey.prototype.encrypt = RSAEncrypt;
//RSAKey.prototype.encrypt_b64 = RSAEncryptB64;

/** @fileOverview Javascript cryptography implementation.
 *
 * Crush to remove comments, shorten variable names and
 * generally reduce transmission size.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

"use strict";
/*jslint indent: 2, bitwise: false, nomen: false, plusplus: false, white: false, regexp: false */
/*global document, window, escape, unescape */

/** @namespace The Stanford Javascript Crypto Library, top-level namespace. */
var sjcl = {
  /** @namespace Symmetric ciphers. */
  cipher: {},

  /** @namespace Hash functions.  Right now only SHA256 is implemented. */
  hash: {},

  /** @namespace Key exchange functions.  Right now only SRP is implemented. */
  keyexchange: {},
  
  /** @namespace Block cipher modes of operation. */
  mode: {},

  /** @namespace Miscellaneous.  HMAC and PBKDF2. */
  misc: {},
  
  /**
   * @namespace Bit array encoders and decoders.
   *
   * @description
   * The members of this namespace are functions which translate between
   * SJCL's bitArrays and other objects (usually strings).  Because it
   * isn't always clear which direction is encoding and which is decoding,
   * the method names are "fromBits" and "toBits".
   */
  codec: {},
  
  /** @namespace Exceptions. */
  exception: {
    /** @class Ciphertext is corrupt. */
    corrupt: function(message) {
      this.toString = function() { return "CORRUPT: "+this.message; };
      this.message = message;
    },
    
    /** @class Invalid parameter. */
    invalid: function(message) {
      this.toString = function() { return "INVALID: "+this.message; };
      this.message = message;
    },
    
    /** @class Bug or missing feature in SJCL. */
    bug: function(message) {
      this.toString = function() { return "BUG: "+this.message; };
      this.message = message;
    },

    /** @class Something isn't ready. */
    notReady: function(message) {
      this.toString = function() { return "NOT READY: "+this.message; };
      this.message = message;
    }
  }
};

if(typeof module != 'undefined' && module.exports){
  module.exports = sjcl;
}

/** @fileOverview Low-level AES implementation.
 *
 * This file contains a low-level implementation of AES, optimized for
 * size and for efficiency on several browsers.  It is based on
 * OpenSSL's aes_core.c, a public-domain implementation by Vincent
 * Rijmen, Antoon Bosselaers and Paulo Barreto.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Schedule out an AES key for both encryption and decryption.  This
 * is a low-level class.  Use a cipher mode to do bulk encryption.
 *
 * @constructor
 * @param {Array} key The key as an array of 4, 6 or 8 words.
 *
 * @class Advanced Encryption Standard (low-level interface)
 */
sjcl.cipher.aes = function (key) {
  if (!this._tables[0][0][0]) {
    this._precompute();
  }
  
  var i, j, tmp,
    encKey, decKey,
    sbox = this._tables[0][4], decTable = this._tables[1],
    keyLen = key.length, rcon = 1;
  
  if (keyLen !== 4 && keyLen !== 6 && keyLen !== 8) {
    throw new sjcl.exception.invalid("invalid aes key size");
  }
  
  this._key = [encKey = key.slice(0), decKey = []];
  
  // schedule encryption keys
  for (i = keyLen; i < 4 * keyLen + 28; i++) {
    tmp = encKey[i-1];
    
    // apply sbox
    if (i%keyLen === 0 || (keyLen === 8 && i%keyLen === 4)) {
      tmp = sbox[tmp>>>24]<<24 ^ sbox[tmp>>16&255]<<16 ^ sbox[tmp>>8&255]<<8 ^ sbox[tmp&255];
      
      // shift rows and add rcon
      if (i%keyLen === 0) {
        tmp = tmp<<8 ^ tmp>>>24 ^ rcon<<24;
        rcon = rcon<<1 ^ (rcon>>7)*283;
      }
    }
    
    encKey[i] = encKey[i-keyLen] ^ tmp;
  }
  
  // schedule decryption keys
  for (j = 0; i; j++, i--) {
    tmp = encKey[j&3 ? i : i - 4];
    if (i<=4 || j<4) {
      decKey[j] = tmp;
    } else {
      decKey[j] = decTable[0][sbox[tmp>>>24      ]] ^
                  decTable[1][sbox[tmp>>16  & 255]] ^
                  decTable[2][sbox[tmp>>8   & 255]] ^
                  decTable[3][sbox[tmp      & 255]];
    }
  }
};

sjcl.cipher.aes.prototype = {
  // public
  /* Something like this might appear here eventually
  name: "AES",
  blockSize: 4,
  keySizes: [4,6,8],
  */
  
  /**
   * Encrypt an array of 4 big-endian words.
   * @param {Array} data The plaintext.
   * @return {Array} The ciphertext.
   */
  encrypt:function (data) { return this._crypt(data,0); },
  
  /**
   * Decrypt an array of 4 big-endian words.
   * @param {Array} data The ciphertext.
   * @return {Array} The plaintext.
   */
  decrypt:function (data) { return this._crypt(data,1); },
  
  /**
   * The expanded S-box and inverse S-box tables.  These will be computed
   * on the client so that we don't have to send them down the wire.
   *
   * There are two tables, _tables[0] is for encryption and
   * _tables[1] is for decryption.
   *
   * The first 4 sub-tables are the expanded S-box with MixColumns.  The
   * last (_tables[01][4]) is the S-box itself.
   *
   * @private
   */
  _tables: [[[],[],[],[],[]],[[],[],[],[],[]]],

  /**
   * Expand the S-box tables.
   *
   * @private
   */
  _precompute: function () {
   var encTable = this._tables[0], decTable = this._tables[1],
       sbox = encTable[4], sboxInv = decTable[4],
       i, x, xInv, d=[], th=[], x2, x4, x8, s, tEnc, tDec;

    // Compute double and third tables
   for (i = 0; i < 256; i++) {
     th[( d[i] = i<<1 ^ (i>>7)*283 )^i]=i;
   }
   
   for (x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
     // Compute sbox
     s = xInv ^ xInv<<1 ^ xInv<<2 ^ xInv<<3 ^ xInv<<4;
     s = s>>8 ^ s&255 ^ 99;
     sbox[x] = s;
     sboxInv[s] = x;
     
     // Compute MixColumns
     x8 = d[x4 = d[x2 = d[x]]];
     tDec = x8*0x1010101 ^ x4*0x10001 ^ x2*0x101 ^ x*0x1010100;
     tEnc = d[s]*0x101 ^ s*0x1010100;
     
     for (i = 0; i < 4; i++) {
       encTable[i][x] = tEnc = tEnc<<24 ^ tEnc>>>8;
       decTable[i][s] = tDec = tDec<<24 ^ tDec>>>8;
     }
   }
   
   // Compactify.  Considerable speedup on Firefox.
   for (i = 0; i < 5; i++) {
     encTable[i] = encTable[i].slice(0);
     decTable[i] = decTable[i].slice(0);
   }
  },
  
  /**
   * Encryption and decryption core.
   * @param {Array} input Four words to be encrypted or decrypted.
   * @param dir The direction, 0 for encrypt and 1 for decrypt.
   * @return {Array} The four encrypted or decrypted words.
   * @private
   */
  _crypt:function (input, dir) {
    if (input.length !== 4) {
      throw new sjcl.exception.invalid("invalid aes block size");
    }
    
    var key = this._key[dir],
        // state variables a,b,c,d are loaded with pre-whitened data
        a = input[0]           ^ key[0],
        b = input[dir ? 3 : 1] ^ key[1],
        c = input[2]           ^ key[2],
        d = input[dir ? 1 : 3] ^ key[3],
        a2, b2, c2,
        
        nInnerRounds = key.length/4 - 2,
        i,
        kIndex = 4,
        out = [0,0,0,0],
        table = this._tables[dir],
        
        // load up the tables
        t0    = table[0],
        t1    = table[1],
        t2    = table[2],
        t3    = table[3],
        sbox  = table[4];
 
    // Inner rounds.  Cribbed from OpenSSL.
    for (i = 0; i < nInnerRounds; i++) {
      a2 = t0[a>>>24] ^ t1[b>>16 & 255] ^ t2[c>>8 & 255] ^ t3[d & 255] ^ key[kIndex];
      b2 = t0[b>>>24] ^ t1[c>>16 & 255] ^ t2[d>>8 & 255] ^ t3[a & 255] ^ key[kIndex + 1];
      c2 = t0[c>>>24] ^ t1[d>>16 & 255] ^ t2[a>>8 & 255] ^ t3[b & 255] ^ key[kIndex + 2];
      d  = t0[d>>>24] ^ t1[a>>16 & 255] ^ t2[b>>8 & 255] ^ t3[c & 255] ^ key[kIndex + 3];
      kIndex += 4;
      a=a2; b=b2; c=c2;
    }
        
    // Last round.
    for (i = 0; i < 4; i++) {
      out[dir ? 3&-i : i] =
        sbox[a>>>24      ]<<24 ^ 
        sbox[b>>16  & 255]<<16 ^
        sbox[c>>8   & 255]<<8  ^
        sbox[d      & 255]     ^
        key[kIndex++];
      a2=a; a=b; b=c; c=d; d=a2;
    }
    
    return out;
  }
};


/** @fileOverview Arrays of bits, encoded as arrays of Numbers.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Arrays of bits, encoded as arrays of Numbers.
 *
 * @description
 * <p>
 * These objects are the currency accepted by SJCL's crypto functions.
 * </p>
 *
 * <p>
 * Most of our crypto primitives operate on arrays of 4-byte words internally,
 * but many of them can take arguments that are not a multiple of 4 bytes.
 * This library encodes arrays of bits (whose size need not be a multiple of 8
 * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
 * array of words, 32 bits at a time.  Since the words are double-precision
 * floating point numbers, they fit some extra data.  We use this (in a private,
 * possibly-changing manner) to encode the number of bits actually  present
 * in the last word of the array.
 * </p>
 *
 * <p>
 * Because bitwise ops clear this out-of-band data, these arrays can be passed
 * to ciphers like AES which want arrays of words.
 * </p>
 */
sjcl.bitArray = {
  /**
   * Array slices in units of bits.
   * @param {bitArray} a The array to slice.
   * @param {Number} bstart The offset to the start of the slice, in bits.
   * @param {Number} bend The offset to the end of the slice, in bits.  If this is undefined,
   * slice until the end of the array.
   * @return {bitArray} The requested slice.
   */
  bitSlice: function (a, bstart, bend) {
    a = sjcl.bitArray._shiftRight(a.slice(bstart/32), 32 - (bstart & 31)).slice(1);
    return (bend === undefined) ? a : sjcl.bitArray.clamp(a, bend-bstart);
  },

  /**
   * Extract a number packed into a bit array.
   * @param {bitArray} a The array to slice.
   * @param {Number} bstart The offset to the start of the slice, in bits.
   * @param {Number} length The length of the number to extract.
   * @return {Number} The requested slice.
   */
  extract: function(a, bstart, blength) {
    // FIXME: this Math.floor is not necessary at all, but for some reason
    // seems to suppress a bug in the Chromium JIT.
    var x, sh = Math.floor((-bstart-blength) & 31);
    if ((bstart + blength - 1 ^ bstart) & -32) {
      // it crosses a boundary
      x = (a[bstart/32|0] << (32 - sh)) ^ (a[bstart/32+1|0] >>> sh);
    } else {
      // within a single word
      x = a[bstart/32|0] >>> sh;
    }
    return x & ((1<<blength) - 1);
  },

  /**
   * Concatenate two bit arrays.
   * @param {bitArray} a1 The first array.
   * @param {bitArray} a2 The second array.
   * @return {bitArray} The concatenation of a1 and a2.
   */
  concat: function (a1, a2) {
    if (a1.length === 0 || a2.length === 0) {
      return a1.concat(a2);
    }
    
    var out, i, last = a1[a1.length-1], shift = sjcl.bitArray.getPartial(last);
    if (shift === 32) {
      return a1.concat(a2);
    } else {
      return sjcl.bitArray._shiftRight(a2, shift, last|0, a1.slice(0,a1.length-1));
    }
  },

  /**
   * Find the length of an array of bits.
   * @param {bitArray} a The array.
   * @return {Number} The length of a, in bits.
   */
  bitLength: function (a) {
    var l = a.length, x;
    if (l === 0) { return 0; }
    x = a[l - 1];
    return (l-1) * 32 + sjcl.bitArray.getPartial(x);
  },

  /**
   * Truncate an array.
   * @param {bitArray} a The array.
   * @param {Number} len The length to truncate to, in bits.
   * @return {bitArray} A new array, truncated to len bits.
   */
  clamp: function (a, len) {
    if (a.length * 32 < len) { return a; }
    a = a.slice(0, Math.ceil(len / 32));
    var l = a.length;
    len = len & 31;
    if (l > 0 && len) {
      a[l-1] = sjcl.bitArray.partial(len, a[l-1] & 0x80000000 >> (len-1), 1);
    }
    return a;
  },

  /**
   * Make a partial word for a bit array.
   * @param {Number} len The number of bits in the word.
   * @param {Number} x The bits.
   * @param {Number} [0] _end Pass 1 if x has already been shifted to the high side.
   * @return {Number} The partial word.
   */
  partial: function (len, x, _end) {
    if (len === 32) { return x; }
    return (_end ? x|0 : x << (32-len)) + len * 0x10000000000;
  },

  /**
   * Get the number of bits used by a partial word.
   * @param {Number} x The partial word.
   * @return {Number} The number of bits used by the partial word.
   */
  getPartial: function (x) {
    return Math.round(x/0x10000000000) || 32;
  },

  /**
   * Compare two arrays for equality in a predictable amount of time.
   * @param {bitArray} a The first array.
   * @param {bitArray} b The second array.
   * @return {boolean} true if a == b; false otherwise.
   */
  equal: function (a, b) {
    if (sjcl.bitArray.bitLength(a) !== sjcl.bitArray.bitLength(b)) {
      return false;
    }
    var x = 0, i;
    for (i=0; i<a.length; i++) {
      x |= a[i]^b[i];
    }
    return (x === 0);
  },

  /** Shift an array right.
   * @param {bitArray} a The array to shift.
   * @param {Number} shift The number of bits to shift.
   * @param {Number} [carry=0] A byte to carry in
   * @param {bitArray} [out=[]] An array to prepend to the output.
   * @private
   */
  _shiftRight: function (a, shift, carry, out) {
    var i, last2=0, shift2;
    if (out === undefined) { out = []; }
    
    for (; shift >= 32; shift -= 32) {
      out.push(carry);
      carry = 0;
    }
    if (shift === 0) {
      return out.concat(a);
    }
    
    for (i=0; i<a.length; i++) {
      out.push(carry | a[i]>>>shift);
      carry = a[i] << (32-shift);
    }
    last2 = a.length ? a[a.length-1] : 0;
    shift2 = sjcl.bitArray.getPartial(last2);
    out.push(sjcl.bitArray.partial(shift+shift2 & 31, (shift + shift2 > 32) ? carry : out.pop(),1));
    return out;
  },
  
  /** xor a block of 4 words together.
   * @private
   */
  _xor4: function(x,y) {
    return [x[0]^y[0],x[1]^y[1],x[2]^y[2],x[3]^y[3]];
  }
};

/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Hexadecimal */
sjcl.codec.hex = {
  /** Convert from a bitArray to a hex string. */
  fromBits: function (arr) {
    var out = "", i, x;
    for (i=0; i<arr.length; i++) {
      out += ((arr[i]|0)+0xF00000000000).toString(16).substr(4);
    }
    return out.substr(0, sjcl.bitArray.bitLength(arr)/4);//.replace(/(.{8})/g, "$1 ");
  },
  /** Convert from a hex string to a bitArray. */
  toBits: function (str) {
    var i, out=[], len;
    str = str.replace(/\s|0x/g, "");
    len = str.length;
    str = str + "00000000";
    for (i=0; i<str.length; i+=8) {
      out.push(parseInt(str.substr(i,8),16)^0);
    }
    return sjcl.bitArray.clamp(out, len*4);
  }
};


/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */
 
/** @namespace UTF-8 strings */
sjcl.codec.utf8String = {
  /** Convert from a bitArray to a UTF-8 string. */
  fromBits: function (arr) {
    var out = "", bl = sjcl.bitArray.bitLength(arr), i, tmp;
    for (i=0; i<bl/8; i++) {
      if ((i&3) === 0) {
        tmp = arr[i/4];
      }
      out += String.fromCharCode(tmp >>> 24);
      tmp <<= 8;
    }
    return decodeURIComponent(escape(out));
  },
  
  /** Convert from a UTF-8 string to a bitArray. */
  toBits: function (str) {
    str = unescape(encodeURIComponent(str));
    var out = [], i, tmp=0;
    for (i=0; i<str.length; i++) {
      tmp = tmp << 8 | str.charCodeAt(i);
      if ((i&3) === 3) {
        out.push(tmp);
        tmp = 0;
      }
    }
    if (i&3) {
      out.push(sjcl.bitArray.partial(8*(i&3), tmp));
    }
    return out;
  }
};

/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Base64 encoding/decoding */
sjcl.codec.base64 = {
  /** The base64 alphabet.
   * @private
   */
  _chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  
  /** Convert from a bitArray to a base64 string. */
  fromBits: function (arr, _noEquals, _url) {
    var out = "", i, bits=0, c = sjcl.codec.base64._chars, ta=0, bl = sjcl.bitArray.bitLength(arr);
    if (_url) c = c.substr(0,62) + '-_';
    for (i=0; out.length * 6 < bl; ) {
      out += c.charAt((ta ^ arr[i]>>>bits) >>> 26);
      if (bits < 6) {
        ta = arr[i] << (6-bits);
        bits += 26;
        i++;
      } else {
        ta <<= 6;
        bits -= 6;
      }
    }
    while ((out.length & 3) && !_noEquals) { out += "="; }
    return out;
  },
  
  /** Convert from a base64 string to a bitArray */
  toBits: function(str, _url) {
    str = str.replace(/\s|=/g,'');
    var out = [], i, bits=0, c = sjcl.codec.base64._chars, ta=0, x;
    if (_url) c = c.substr(0,62) + '-_';
    for (i=0; i<str.length; i++) {
      x = c.indexOf(str.charAt(i));
      if (x < 0) {
        throw new sjcl.exception.invalid("this isn't base64!");
      }
      if (bits > 26) {
        bits -= 26;
        out.push(ta ^ x>>>bits);
        ta  = x << (32-bits);
      } else {
        bits += 6;
        ta ^= x << (32-bits);
      }
    }
    if (bits&56) {
      out.push(sjcl.bitArray.partial(bits&56, ta, 1));
    }
    return out;
  }
};

sjcl.codec.base64url = {
  fromBits: function (arr) { return sjcl.codec.base64.fromBits(arr,1,1); },
  toBits: function (str) { return sjcl.codec.base64.toBits(str,1); }
};

/** @fileOverview CBC mode implementation
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace
 * Dangerous: CBC mode with PKCS#5 padding.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */
if (sjcl.beware === undefined) {
  sjcl.beware = {};
}
sjcl.beware["CBC mode is dangerous because it doesn't protect message integrity."
] = function() {
  sjcl.mode.cbc = {
    /** The name of the mode.
     * @constant
     */
    name: "cbc",
    
    /** Encrypt in CBC mode with PKCS#5 padding.
     * @param {Object} prp The block cipher.  It must have a block size of 16 bytes.
     * @param {bitArray} plaintext The plaintext data.
     * @param {bitArray} iv The initialization value.
     * @param {bitArray} [adata=[]] The authenticated data.  Must be empty.
     * @return The encrypted data, an array of bytes.
     * @throws {sjcl.exception.invalid} if the IV isn't exactly 128 bits, or if any adata is specified.
     */
    encrypt: function(prp, plaintext, iv, adata) {
      if (adata && adata.length) {
        throw new sjcl.exception.invalid("cbc can't authenticate data");
      }
      if (sjcl.bitArray.bitLength(iv) !== 128) {
        throw new sjcl.exception.invalid("cbc iv must be 128 bits");
      }
      var i,
          w = sjcl.bitArray,
          xor = w._xor4,
          bl = w.bitLength(plaintext),
          bp = 0,
          output = [];

      if (bl&7) {
        throw new sjcl.exception.invalid("pkcs#5 padding only works for multiples of a byte");
      }
    
      for (i=0; bp+128 <= bl; i+=4, bp+=128) {
        /* Encrypt a non-final block */
        iv = prp.encrypt(xor(iv, plaintext.slice(i,i+4)));
        output.splice(i,0,iv[0],iv[1],iv[2],iv[3]);
      }
      
      /* Construct the pad. */
      bl = (16 - ((bl >> 3) & 15)) * 0x1010101;

      /* Pad and encrypt. */
      iv = prp.encrypt(xor(iv,w.concat(plaintext,[bl,bl,bl,bl]).slice(i,i+4)));
      output.splice(i,0,iv[0],iv[1],iv[2],iv[3]);
      return output;
    },
    
    /** Decrypt in CBC mode.
     * @param {Object} prp The block cipher.  It must have a block size of 16 bytes.
     * @param {bitArray} ciphertext The ciphertext data.
     * @param {bitArray} iv The initialization value.
     * @param {bitArray} [adata=[]] The authenticated data.  It must be empty.
     * @return The decrypted data, an array of bytes.
     * @throws {sjcl.exception.invalid} if the IV isn't exactly 128 bits, or if any adata is specified.
     * @throws {sjcl.exception.corrupt} if if the message is corrupt.
     */
    decrypt: function(prp, ciphertext, iv, adata) {
      if (adata && adata.length) {
        throw new sjcl.exception.invalid("cbc can't authenticate data");
      }
      if (sjcl.bitArray.bitLength(iv) !== 128) {
        throw new sjcl.exception.invalid("cbc iv must be 128 bits");
      }
      if ((sjcl.bitArray.bitLength(ciphertext) & 127) || !ciphertext.length) {
        throw new sjcl.exception.corrupt("cbc ciphertext must be a positive multiple of the block size");
      }
      var i,
          w = sjcl.bitArray,
          xor = w._xor4,
          bi, bo,
          output = [];
          
      adata = adata || [];
    
      for (i=0; i<ciphertext.length; i+=4) {
        bi = ciphertext.slice(i,i+4);
        bo = xor(iv,prp.decrypt(bi));
        output.splice(i,0,bo[0],bo[1],bo[2],bo[3]);
        iv = bi;
      }

      /* check and remove the pad */
      bi = output[i-1] & 255;
      if (bi == 0 || bi > 16) {
        throw new sjcl.exception.corrupt("pkcs#5 padding corrupt");
      }
      bo = bi * 0x1010101;
      if (!w.equal(w.bitSlice([bo,bo,bo,bo], 0, bi*8),
                   w.bitSlice(output, output.length*32 - bi*8, output.length*32))) {
        throw new sjcl.exception.corrupt("pkcs#5 padding corrupt");
      }

      return w.bitSlice(output, 0, output.length*32 - bi*8);
    }
  };
};

/** @fileOverview HMAC implementation.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** HMAC with the specified hash function.
 * @constructor
 * @param {bitArray} key the key for HMAC.
 * @param {Object} [hash=sjcl.hash.sha256] The hash function to use.
 */
sjcl.misc.hmac = function (key, Hash) {
  this._hash = Hash = Hash || sjcl.hash.sha256;
  var exKey = [[],[]], i,
      bs = Hash.prototype.blockSize / 32;
  this._baseHash = [new Hash(), new Hash()];

  if (key.length > bs) {
    key = Hash.hash(key);
  }
  
  for (i=0; i<bs; i++) {
    exKey[0][i] = key[i]^0x36363636;
    exKey[1][i] = key[i]^0x5C5C5C5C;
  }
  
  this._baseHash[0].update(exKey[0]);
  this._baseHash[1].update(exKey[1]);
};

/** HMAC with the specified hash function.  Also called encrypt since it's a prf.
 * @param {bitArray|String} data The data to mac.
 * @param {Codec} [encoding] the encoding function to use.
 */
sjcl.misc.hmac.prototype.encrypt = sjcl.misc.hmac.prototype.mac = function (data, encoding) {
  var w = new (this._hash)(this._baseHash[0]).update(data, encoding).finalize();
  return new (this._hash)(this._baseHash[1]).update(w).finalize();
};


/** @fileOverview Javascript SHA-256 implementation.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * Special thanks to Aldo Cortesi for pointing out several bugs in
 * this code.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Context for a SHA-256 operation in progress.
 * @constructor
 * @class Secure Hash Algorithm, 256 bits.
 */
sjcl.hash.sha256 = function (hash) {
  if (!this._key[0]) { this._precompute(); }
  if (hash) {
    this._h = hash._h.slice(0);
    this._buffer = hash._buffer.slice(0);
    this._length = hash._length;
  } else {
    this.reset();
  }
};

/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 16 big-endian words.
 */
sjcl.hash.sha256.hash = function (data) {
  return (new sjcl.hash.sha256()).update(data).finalize();
};

sjcl.hash.sha256.prototype = {
  /**
   * The hash's block size, in bits.
   * @constant
   */
  blockSize: 512,
   
  /**
   * Reset the hash state.
   * @return this
   */
  reset:function () {
    this._h = this._init.slice(0);
    this._buffer = [];
    this._length = 0;
    return this;
  },
  
  /**
   * Input several words to the hash.
   * @param {bitArray|String} data the data to hash.
   * @return this
   */
  update: function (data) {
    if (typeof data === "string") {
      data = sjcl.codec.utf8String.toBits(data);
    }
    var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data),
        ol = this._length,
        nl = this._length = ol + sjcl.bitArray.bitLength(data);
    for (i = 512+ol & -512; i <= nl; i+= 512) {
      this._block(b.splice(0,16));
    }
    return this;
  },
  
  /**
   * Complete hashing and output the hash value.
   * @return {bitArray} The hash value, an array of 16 big-endian words.
   */
  finalize:function () {
    var i, b = this._buffer, h = this._h;

    // Round out and push the buffer
    b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1,1)]);
    
    // Round out the buffer to a multiple of 16 words, less the 2 length words.
    for (i = b.length + 2; i & 15; i++) {
      b.push(0);
    }
    
    // append the length
    b.push(Math.floor(this._length / 0x100000000));
    b.push(this._length | 0);

    while (b.length) {
      this._block(b.splice(0,16));
    }

    this.reset();
    return h;
  },

  /**
   * The SHA-256 initialization vector, to be precomputed.
   * @private
   */
  _init:[],
  /*
  _init:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
  */
  
  /**
   * The SHA-256 hash key, to be precomputed.
   * @private
   */
  _key:[],
  /*
  _key:
    [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
     0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
     0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
     0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
     0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
     0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
     0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
     0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2],
  */


  /**
   * Function to precompute _init and _key.
   * @private
   */
  _precompute: function () {
    var i = 0, prime = 2, factor;

    function frac(x) { return (x-Math.floor(x)) * 0x100000000 | 0; }

    outer: for (; i<64; prime++) {
      for (factor=2; factor*factor <= prime; factor++) {
        if (prime % factor === 0) {
          // not a prime
          continue outer;
        }
      }
      
      if (i<8) {
        this._init[i] = frac(Math.pow(prime, 1/2));
      }
      this._key[i] = frac(Math.pow(prime, 1/3));
      i++;
    }
  },
  
  /**
   * Perform one cycle of SHA-256.
   * @param {bitArray} words one block of words.
   * @private
   */
  _block:function (words) {  
    var i, tmp, a, b,
      w = words.slice(0),
      h = this._h,
      k = this._key,
      h0 = h[0], h1 = h[1], h2 = h[2], h3 = h[3],
      h4 = h[4], h5 = h[5], h6 = h[6], h7 = h[7];

    /* Rationale for placement of |0 :
     * If a value can overflow is original 32 bits by a factor of more than a few
     * million (2^23 ish), there is a possibility that it might overflow the
     * 53-bit mantissa and lose precision.
     *
     * To avoid this, we clamp back to 32 bits by |'ing with 0 on any value that
     * propagates around the loop, and on the hash state h[].  I don't believe
     * that the clamps on h4 and on h0 are strictly necessary, but it's close
     * (for h4 anyway), and better safe than sorry.
     *
     * The clamps on h[] are necessary for the output to be correct even in the
     * common case and for short inputs.
     */
    for (i=0; i<64; i++) {
      // load up the input word for this round
      if (i<16) {
        tmp = w[i];
      } else {
        a   = w[(i+1 ) & 15];
        b   = w[(i+14) & 15];
        tmp = w[i&15] = ((a>>>7  ^ a>>>18 ^ a>>>3  ^ a<<25 ^ a<<14) + 
                         (b>>>17 ^ b>>>19 ^ b>>>10 ^ b<<15 ^ b<<13) +
                         w[i&15] + w[(i+9) & 15]) | 0;
      }
      
      tmp = (tmp + h7 + (h4>>>6 ^ h4>>>11 ^ h4>>>25 ^ h4<<26 ^ h4<<21 ^ h4<<7) +  (h6 ^ h4&(h5^h6)) + k[i]); // | 0;
      
      // shift register
      h7 = h6; h6 = h5; h5 = h4;
      h4 = h3 + tmp | 0;
      h3 = h2; h2 = h1; h1 = h0;

      h0 = (tmp +  ((h1&h2) ^ (h3&(h1^h2))) + (h1>>>2 ^ h1>>>13 ^ h1>>>22 ^ h1<<30 ^ h1<<19 ^ h1<<10)) | 0;
    }

    h[0] = h[0]+h0 | 0;
    h[1] = h[1]+h1 | 0;
    h[2] = h[2]+h2 | 0;
    h[3] = h[3]+h3 | 0;
    h[4] = h[4]+h4 | 0;
    h[5] = h[5]+h5 | 0;
    h[6] = h[6]+h6 | 0;
    h[7] = h[7]+h7 | 0;
  }
};



/** @fileOverview Random number generator.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Random number generator
 *
 * @description
 * <p>
 * This random number generator is a derivative of Ferguson and Schneier's
 * generator Fortuna.  It collects entropy from various events into several
 * pools, implemented by streaming SHA-256 instances.  It differs from
 * ordinary Fortuna in a few ways, though.
 * </p>
 *
 * <p>
 * Most importantly, it has an entropy estimator.  This is present because
 * there is a strong conflict here between making the generator available
 * as soon as possible, and making sure that it doesn't "run on empty".
 * In Fortuna, there is a saved state file, and the system is likely to have
 * time to warm up.
 * </p>
 *
 * <p>
 * Second, because users are unlikely to stay on the page for very long,
 * and to speed startup time, the number of pools increases logarithmically:
 * a new pool is created when the previous one is actually used for a reseed.
 * This gives the same asymptotic guarantees as Fortuna, but gives more
 * entropy to early reseeds.
 * </p>
 *
 * <p>
 * The entire mechanism here feels pretty klunky.  Furthermore, there are
 * several improvements that should be made, including support for
 * dedicated cryptographic functions that may be present in some browsers;
 * state files in local storage; cookies containing randomness; etc.  So
 * look for improvements in future versions.
 * </p>
 */
sjcl.random = {
  /** Generate several random words, and return them in an array
   * @param {Number} nwords The number of words to generate.
   */
  randomWords: function (nwords, paranoia) {
    var out = [], i, readiness = this.isReady(paranoia), g;
  
    if (readiness === this._NOT_READY) {
      throw new sjcl.exception.notReady("generator isn't seeded");
    } else if (readiness & this._REQUIRES_RESEED) {
      this._reseedFromPools(!(readiness & this._READY));
    }
  
    for (i=0; i<nwords; i+= 4) {
      if ((i+1) % this._MAX_WORDS_PER_BURST === 0) {
        this._gate();
      }
   
      g = this._gen4words();
      out.push(g[0],g[1],g[2],g[3]);
    }
    this._gate();
  
    return out.slice(0,nwords);
  },
  
  setDefaultParanoia: function (paranoia) {
    this._defaultParanoia = paranoia;
  },
  
  /**
   * Add entropy to the pools.
   * @param data The entropic value.  Should be a 32-bit integer, array of 32-bit integers, or string
   * @param {Number} estimatedEntropy The estimated entropy of data, in bits
   * @param {String} source The source of the entropy, eg "mouse"
   */
  addEntropy: function (data, estimatedEntropy, source) {
    source = source || "user";
  
    var id,
      i, tmp,
      t = (new Date()).valueOf(),
      robin = this._robins[source],
      oldReady = this.isReady(), err = 0;
      
    id = this._collectorIds[source];
    if (id === undefined) { id = this._collectorIds[source] = this._collectorIdNext ++; }
      
    if (robin === undefined) { robin = this._robins[source] = 0; }
    this._robins[source] = ( this._robins[source] + 1 ) % this._pools.length;
  
    switch(typeof(data)) {
      
    case "number":
      if (estimatedEntropy === undefined) {
        estimatedEntropy = 1;
      }
      this._pools[robin].update([id,this._eventId++,1,estimatedEntropy,t,1,data|0]);
      break;
      
    case "object":
      var objName = Object.prototype.toString.call(data);
      if (objName === "[object Uint32Array]") {
        tmp = [];
        for (i = 0; i < data.length; i++) {
          tmp.push(data[i]);
        }
        data = tmp;
      } else {
        if (objName !== "[object Array]") {
          err = 1;
        }
        for (i=0; i<data.length && !err; i++) {
          if (typeof(data[i]) != "number") {
            err = 1;
          }
        }
      }
      if (!err) {
        if (estimatedEntropy === undefined) {
          /* horrible entropy estimator */
          estimatedEntropy = 0;
          for (i=0; i<data.length; i++) {
            tmp= data[i];
            while (tmp>0) {
              estimatedEntropy++;
              tmp = tmp >>> 1;
            }
          }
        }
        this._pools[robin].update([id,this._eventId++,2,estimatedEntropy,t,data.length].concat(data));
      }
      break;
      
    case "string":
      if (estimatedEntropy === undefined) {
       /* English text has just over 1 bit per character of entropy.
        * But this might be HTML or something, and have far less
        * entropy than English...  Oh well, let's just say one bit.
        */
       estimatedEntropy = data.length;
      }
      this._pools[robin].update([id,this._eventId++,3,estimatedEntropy,t,data.length]);
      this._pools[robin].update(data);
      break;
      
    default:
      err=1;
    }
    if (err) {
      throw new sjcl.exception.bug("random: addEntropy only supports number, array of numbers or string");
    }
  
    /* record the new strength */
    this._poolEntropy[robin] += estimatedEntropy;
    this._poolStrength += estimatedEntropy;
  
    /* fire off events */
    if (oldReady === this._NOT_READY) {
      if (this.isReady() !== this._NOT_READY) {
        this._fireEvent("seeded", Math.max(this._strength, this._poolStrength));
      }
      this._fireEvent("progress", this.getProgress());
    }
  },
  
  /** Is the generator ready? */
  isReady: function (paranoia) {
    var entropyRequired = this._PARANOIA_LEVELS[ (paranoia !== undefined) ? paranoia : this._defaultParanoia ];
  
    if (this._strength && this._strength >= entropyRequired) {
      return (this._poolEntropy[0] > this._BITS_PER_RESEED && (new Date()).valueOf() > this._nextReseed) ?
        this._REQUIRES_RESEED | this._READY :
        this._READY;
    } else {
      return (this._poolStrength >= entropyRequired) ?
        this._REQUIRES_RESEED | this._NOT_READY :
        this._NOT_READY;
    }
  },
  
  /** Get the generator's progress toward readiness, as a fraction */
  getProgress: function (paranoia) {
    var entropyRequired = this._PARANOIA_LEVELS[ paranoia ? paranoia : this._defaultParanoia ];
  
    if (this._strength >= entropyRequired) {
      return 1.0;
    } else {
      return (this._poolStrength > entropyRequired) ?
        1.0 :
        this._poolStrength / entropyRequired;
    }
  },
  
  /** start the built-in entropy collectors */
  startCollectors: function () {
    if (this._collectorsStarted) { return; }
  
    if (window.addEventListener) {
      window.addEventListener("load", this._loadTimeCollector, false);
      window.addEventListener("mousemove", this._mouseCollector, false);
    } else if (document.attachEvent) {
      document.attachEvent("onload", this._loadTimeCollector);
      document.attachEvent("onmousemove", this._mouseCollector);
    }
    else {
      throw new sjcl.exception.bug("can't attach event");
    }
  
    this._collectorsStarted = true;
  },
  
  /** stop the built-in entropy collectors */
  stopCollectors: function () {
    if (!this._collectorsStarted) { return; }
  
    if (window.removeEventListener) {
      window.removeEventListener("load", this._loadTimeCollector, false);
      window.removeEventListener("mousemove", this._mouseCollector, false);
    } else if (window.detachEvent) {
      window.detachEvent("onload", this._loadTimeCollector);
      window.detachEvent("onmousemove", this._mouseCollector);
    }
    this._collectorsStarted = false;
  },
  
  /* use a cookie to store entropy.
  useCookie: function (all_cookies) {
      throw new sjcl.exception.bug("random: useCookie is unimplemented");
  },*/
  
  /** add an event listener for progress or seeded-ness. */
  addEventListener: function (name, callback) {
    this._callbacks[name][this._callbackI++] = callback;
  },
  
  /** remove an event listener for progress or seeded-ness */
  removeEventListener: function (name, cb) {
    var i, j, cbs=this._callbacks[name], jsTemp=[];
  
    /* I'm not sure if this is necessary; in C++, iterating over a
     * collection and modifying it at the same time is a no-no.
     */
  
    for (j in cbs) {
	if (cbs.hasOwnProperty(j) && cbs[j] === cb) {
        jsTemp.push(j);
      }
    }
  
    for (i=0; i<jsTemp.length; i++) {
      j = jsTemp[i];
      delete cbs[j];
    }
  },
  
  /* private */
  _pools                   : [new sjcl.hash.sha256()],
  _poolEntropy             : [0],
  _reseedCount             : 0,
  _robins                  : {},
  _eventId                 : 0,
  
  _collectorIds            : {},
  _collectorIdNext         : 0,
  
  _strength                : 0,
  _poolStrength            : 0,
  _nextReseed              : 0,
  _key                     : [0,0,0,0,0,0,0,0],
  _counter                 : [0,0,0,0],
  _cipher                  : undefined,
  _defaultParanoia         : 6,
  
  /* event listener stuff */
  _collectorsStarted       : false,
  _callbacks               : {progress: {}, seeded: {}},
  _callbackI               : 0,
  
  /* constants */
  _NOT_READY               : 0,
  _READY                   : 1,
  _REQUIRES_RESEED         : 2,

  _MAX_WORDS_PER_BURST     : 65536,
  _PARANOIA_LEVELS         : [0,48,64,96,128,192,256,384,512,768,1024],
  _MILLISECONDS_PER_RESEED : 30000,
  _BITS_PER_RESEED         : 80,
  
  /** Generate 4 random words, no reseed, no gate.
   * @private
   */
  _gen4words: function () {
    for (var i=0; i<4; i++) {
      this._counter[i] = this._counter[i]+1 | 0;
      if (this._counter[i]) { break; }
    }
    return this._cipher.encrypt(this._counter);
  },
  
  /* Rekey the AES instance with itself after a request, or every _MAX_WORDS_PER_BURST words.
   * @private
   */
  _gate: function () {
    this._key = this._gen4words().concat(this._gen4words());
    this._cipher = new sjcl.cipher.aes(this._key);
  },
  
  /** Reseed the generator with the given words
   * @private
   */
  _reseed: function (seedWords) {
    this._key = sjcl.hash.sha256.hash(this._key.concat(seedWords));
    this._cipher = new sjcl.cipher.aes(this._key);
    for (var i=0; i<4; i++) {
      this._counter[i] = this._counter[i]+1 | 0;
      if (this._counter[i]) { break; }
    }
  },
  
  /** reseed the data from the entropy pools
   * @param full If set, use all the entropy pools in the reseed.
   */
  _reseedFromPools: function (full) {
    var reseedData = [], strength = 0, i;
  
    this._nextReseed = reseedData[0] =
      (new Date()).valueOf() + this._MILLISECONDS_PER_RESEED;
    
    for (i=0; i<16; i++) {
      /* On some browsers, this is cryptographically random.  So we might
       * as well toss it in the pot and stir...
       */
      reseedData.push(Math.random()*0x100000000|0);
    }
    
    for (i=0; i<this._pools.length; i++) {
     reseedData = reseedData.concat(this._pools[i].finalize());
     strength += this._poolEntropy[i];
     this._poolEntropy[i] = 0;
   
     if (!full && (this._reseedCount & (1<<i))) { break; }
    }
  
    /* if we used the last pool, push a new one onto the stack */
    if (this._reseedCount >= 1 << this._pools.length) {
     this._pools.push(new sjcl.hash.sha256());
     this._poolEntropy.push(0);
    }
  
    /* how strong was this reseed? */
    this._poolStrength -= strength;
    if (strength > this._strength) {
      this._strength = strength;
    }
  
    this._reseedCount ++;
    this._reseed(reseedData);
  },
  
  _mouseCollector: function (ev) {
    var x = ev.x || ev.clientX || ev.offsetX || 0, y = ev.y || ev.clientY || ev.offsetY || 0;
    sjcl.random.addEntropy([x,y], 2, "mouse");
  },
  
  _loadTimeCollector: function (ev) {
    sjcl.random.addEntropy((new Date()).valueOf(), 2, "loadtime");
  },
  
  _fireEvent: function (name, arg) {
    var j, cbs=sjcl.random._callbacks[name], cbsTemp=[];
    /* TODO: there is a race condition between removing collectors and firing them */ 

    /* I'm not sure if this is necessary; in C++, iterating over a
     * collection and modifying it at the same time is a no-no.
     */
  
    for (j in cbs) {
     if (cbs.hasOwnProperty(j)) {
        cbsTemp.push(cbs[j]);
     }
    }
  
    for (j=0; j<cbsTemp.length; j++) {
     cbsTemp[j](arg);
    }
  }
};

(function(){
  try {
    // get cryptographically strong entropy in Webkit
    var ab = new Uint32Array(32);
    crypto.getRandomValues(ab);
    sjcl.random.addEntropy(ab, 1024, "crypto.getRandomValues");
  } catch (e) {
    // no getRandomValues :-(
  }
})();

(function () {
  for (var key in sjcl.beware) {
    if (sjcl.beware.hasOwnProperty(key)) {
      sjcl.beware[key]();
    }
  }
})();

var Braintree = {
  sjcl: sjcl,
  version: "1.3.10"
};

Braintree.generateAesKey = function () {
  return {
    key: sjcl.random.randomWords(8, 0),
    encrypt: function (plainText) {
      return this.encryptWithIv(plainText, sjcl.random.randomWords(4, 0));
    },
    encryptWithIv: function (plaintext, iv) {
      var aes = new sjcl.cipher.aes(this.key),
          plaintextBits = sjcl.codec.utf8String.toBits(plaintext),
          ciphertextBits = sjcl.mode.cbc.encrypt(aes, plaintextBits, iv),
          ciphertextAndIvBits = sjcl.bitArray.concat(iv, ciphertextBits);

      return sjcl.codec.base64.fromBits(ciphertextAndIvBits);
    }
  };
};

Braintree.create = function (publicKey) {
  return new Braintree.EncryptionClient(publicKey);
};

Braintree.EncryptionClient = function (publicKey) {
  var self = this,
      hiddenFields = [];

  self.publicKey = publicKey;
  self.version = Braintree.version;

  var createElement = function (tagName, attrs) {
    var element, attr, value;

    element = document.createElement(tagName);

    for (attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        value = attrs[attr];
        element.setAttribute(attr, value);
      }
    }

    return element;
  };

  var extractForm = function (object) {
    if (window.jQuery && object instanceof jQuery) {
      return object[0];
    } else if (object.nodeType && object.nodeType === 1) {
      return object;
    } else {
      return document.getElementById(object);
    }
  };

  var extractIntegers = function (asn1) {
    var parts = [],
        start, end, data,
        i;

    if (asn1.typeName() === "INTEGER") {
      start = asn1.posContent();
      end   = asn1.posEnd();
      data  = asn1.stream.hexDump(start, end).replace(/[ \n]/g, "");
      parts.push(data);
    }

    if (asn1.sub !== null) {
      for (i = 0; i < asn1.sub.length; i++) {
        parts = parts.concat(extractIntegers(asn1.sub[i]));
      }
    }

    return parts;
  };

  var findInputs = function (element) {
    var found = [],
        children = element.children,
        child, i;

    for (i = 0; i < children.length; i++) {
      child = children[i];

      if (child.nodeType === 1 && child.attributes["data-encrypted-name"]) {
        found.push(child);
      } else if (child.children && child.children.length > 0) {
        found = found.concat(findInputs(child));
      }
    }

    return found;
  };

  var generateRsaKey = function () {
    var asn1, exponent, parts, modulus, rawKey, rsa;

    try {
      rawKey = b64toBA(publicKey);
      asn1 = ASN1.decode(rawKey);
    } catch (e) {
      throw "Invalid encryption key. Please use the key labeled 'Client-Side Encryption Key'";
    }

    parts = extractIntegers(asn1);

    if (parts.length !== 2) {
      throw "Invalid encryption key. Please use the key labeled 'Client-Side Encryption Key'";
    }

    modulus = parts[0];
    exponent = parts[1];

    rsa = new RSAKey();
    rsa.setPublic(modulus, exponent);

    return rsa;
  };

  var generateHmacKey = function () {
    return {
      key: sjcl.random.randomWords(8, 0),
      sign: function (message) {
        var hmac = new sjcl.misc.hmac(this.key, sjcl.hash.sha256),
            signature = hmac.encrypt(message);

        return sjcl.codec.base64.fromBits(signature);
      }
    };
  };

  self.encrypt = function (plaintext) {
    var rsa = generateRsaKey(),
        aes = Braintree.generateAesKey(),
        hmac = generateHmacKey(),
        ciphertext = aes.encrypt(plaintext),
        signature = hmac.sign(sjcl.codec.base64.toBits(ciphertext)),
        combinedKey = sjcl.bitArray.concat(aes.key, hmac.key),
        encodedKey = sjcl.codec.base64.fromBits(combinedKey),
        hexEncryptedKey = rsa.encrypt(encodedKey),
        prefix = "$bt4|javascript_" + self.version.replace(/\./g, "_") + "$",
        encryptedKey = null;

    if(hexEncryptedKey) {
      encryptedKey = hex2b64(hexEncryptedKey);
    }

    return prefix + encryptedKey + "$" + ciphertext + "$" + signature;
  };

  self.encryptForm = function (form) {
    var element, encryptedValue,
        fieldName, hiddenField,
        i, inputs;

    form = extractForm(form);
    inputs = findInputs(form);

    while (hiddenFields.length > 0) {
      try {
        form.removeChild(hiddenFields[0]);
      } catch (err) {}
      hiddenFields.splice(0, 1);
    }

    for (i = 0; i < inputs.length; i++) {
      element = inputs[i];
      fieldName = element.getAttribute("data-encrypted-name");
      encryptedValue = self.encrypt(element.value);
      element.removeAttribute("name");
      hiddenField = createElement("input", {
        value: encryptedValue,
        type: "hidden",
        name: fieldName
      });
      hiddenFields.push(hiddenField);
      form.appendChild(hiddenField);
    }
  };

  self.onSubmitEncryptForm = function (form, callback) {
    var wrappedCallback;

    form = extractForm(form);

    wrappedCallback = function (e) {
      self.encryptForm(form);
      return (!!callback) ? callback(e) : e;
    };

    if (window.jQuery) {
      window.jQuery(form).submit(wrappedCallback);
    } else if (form.addEventListener) {
      form.addEventListener("submit", wrappedCallback, false);
    } else if (form.attachEvent) {
      form.attachEvent("onsubmit", wrappedCallback);
    }
  };

  // backwards compatibility
  self.formEncrypter = {
    encryptForm: self.encryptForm,
    extractForm: extractForm,
    onSubmitEncryptForm: self.onSubmitEncryptForm
  };

  sjcl.random.startCollectors();
};

window.Braintree = Braintree;

})();

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.braintree=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

var VERSION = "2.13.0";
var api = require('braintree-api');
var paypal = require('braintree-paypal');
var dropin = require('braintree-dropin');
var integrations = require('./integrations');
var constants = require('./constants');
var fallbackErrorHandler = require('./lib/fallback-error-handler');
var lookupCallbackFor = require('./lib/lookup-callback-for');
var uuid = require('braintree-utilities').uuid;

function setup(clientToken, integrationType, merchantConfiguration) {
  if (!integrations.hasOwnProperty(integrationType)) {
    throw new Error(integrationType + ' is an unsupported integration');
  }

  merchantConfiguration = merchantConfiguration || {};

  api._getConfiguration({
    enableCORS: merchantConfiguration.enableCORS || false,
    clientToken: clientToken
  }, function (err, gatewayConfiguration) {
    var errorFallback;

    if (err) {
      errorFallback = lookupCallbackFor(merchantConfiguration)(constants.ROOT_ERROR_CALLBACK, fallbackErrorHandler);
      errorFallback({message: err.errors});
      return;
    }

    new integrations[integrationType]({ // eslint-disable-line no-new
      channel: uuid(),
      gatewayConfiguration: gatewayConfiguration,
      integrationType: integrationType,
      merchantConfiguration: merchantConfiguration,
      analyticsConfiguration: {
        sdkVersion: 'braintree/web/' + VERSION,
        merchantAppId: global.location.host
      }
    });
  });
}

module.exports = {
  api: api,
  cse: global.Braintree,
  paypal: paypal,
  dropin: dropin,
  setup: setup,
  VERSION: VERSION
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./constants":399,"./integrations":404,"./lib/fallback-error-handler":406,"./lib/lookup-callback-for":407,"braintree-api":21,"braintree-dropin":237,"braintree-paypal":345,"braintree-utilities":373}],2:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtils = require('braintree-utilities');
var braintree3ds = require('braintree-3ds');
var parseClientToken = require('./parse-client-token');
var util = require('./util');
var SEPAMandate = require('./sepa-mandate');
var EuropeBankAccount = require('./europe-bank-account');
var CreditCard = require('./credit-card');
var CoinbaseAccount = require('./coinbase-account');
var PayPalAccount = require('./paypal-account');
var normalizeCreditCardFields = require('./normalize-api-fields').normalizeCreditCardFields;
var chooseRequestDriver = require('./request/choose-driver');
var shouldEnableCORS = require('./should-enable-cors');
var constants = require('./constants');

function getAnalyticsConfiguration(options) {
  var analyticsConfiguration = options.analyticsConfiguration || {};
  var globalBraintreeVersion = global.braintree ? global.braintree.VERSION : null;
  var defaultSdkVersion = globalBraintreeVersion ? 'braintree/web/' + globalBraintreeVersion : '';

  return {
    sdkVersion: analyticsConfiguration.sdkVersion || defaultSdkVersion,
    merchantAppId: analyticsConfiguration.merchantAppId || global.location.host
  };
}

function Client(options) {
  var parsedClientToken, secure3d, analyticsConfiguration;

  this.attrs = {};

  if (options.hasOwnProperty('sharedCustomerIdentifier')) {
    this.attrs.sharedCustomerIdentifier = options.sharedCustomerIdentifier;
  }

  parsedClientToken = parseClientToken(options.clientToken);
  analyticsConfiguration = getAnalyticsConfiguration(options);

  this.driver = options.driver || chooseRequestDriver({enableCORS: shouldEnableCORS(options)});
  this.analyticsUrl = parsedClientToken.analytics ? parsedClientToken.analytics.url : undefined;
  this.clientApiUrl = parsedClientToken.clientApiUrl;
  this.customerId = options.customerId;
  this.challenges = parsedClientToken.challenges;
  this.integration = options.integration || '';
  this.sdkVersion = analyticsConfiguration.sdkVersion;
  this.merchantAppId = analyticsConfiguration.merchantAppId;

  secure3d = braintree3ds.create(this, {
    container: options.container,
    clientToken: parsedClientToken
  });
  this.verify3DS = braintreeUtils.bind(secure3d.verify, secure3d);

  this.attrs.sharedCustomerIdentifierType = options.sharedCustomerIdentifierType;

  if (parsedClientToken.merchantAccountId) {
    this.attrs.merchantAccountId = parsedClientToken.merchantAccountId;
  }

  if (options.clientKey) {
    this.attrs.clientKey = options.clientKey;
  } else if (parsedClientToken.authorizationFingerprint) {
    this.attrs.authorizationFingerprint = parsedClientToken.authorizationFingerprint;
  }

  if (options.hasOwnProperty('timeout')) {
    this.requestTimeout = options.timeout;
  } else {
    this.requestTimeout = 60000;
  }
}

Client.prototype.getCreditCards = function (callback) {
  this.driver.get(
    util.joinUrlFragments([this.clientApiUrl, 'v1', 'payment_methods']),
    this.attrs,
    function (d) {
      var i = 0;
      var len = d.paymentMethods.length;
      var creditCards = [];

      for (i; i < len; i++) {
        creditCards.push(new CreditCard(d.paymentMethods[i]));
      }

      return creditCards;
    },
    callback,
    this.requestTimeout
  );
};

Client.prototype.tokenizeCoinbase = function (attrs, callback) {
  attrs.options = { validate: false };
  this.addCoinbase(attrs, function (err, result) {
    if (err) {
      callback(err, null);
    } else if (result && result.nonce) {
      callback(err, result);
    } else {
      callback('Unable to tokenize coinbase account.', null);
    }
  });
};

Client.prototype.tokenizePayPalAccount = function (attrs, callback) {
  attrs.options = {validate: false};
  this.addPayPalAccount(attrs, function (err, result) {
    if (err) {
      callback(err, null);
    } else if (result && result.nonce) {
      callback(null, result);
    } else {
      callback('Unable to tokenize paypal account.', null);
    }
  });
};

Client.prototype.tokenizeCard = function (attrs, callback) {
  attrs.options = { validate: false };
  this.addCreditCard(attrs, function (err, result) {
    if (result && result.nonce) {
      callback(err, result.nonce, {type: result.type, details: result.details});
    } else {
      callback('Unable to tokenize card.', null);
    }
  });
};

Client.prototype.lookup3DS = function (attrs, callback) {
  var url = util.joinUrlFragments([this.clientApiUrl, 'v1/payment_methods', attrs.nonce, 'three_d_secure/lookup']);
  var mergedAttrs = util.mergeOptions(this.attrs, {amount: attrs.amount});
  this.driver.post(url, mergedAttrs, function (d) {
      return d;
    },
    callback,
    this.requestTimeout
  );
};

Client.prototype.createSEPAMandate = function (attrs, callback) {
  var mergedAttrs = util.mergeOptions(this.attrs, {sepaMandate: attrs});
  this.driver.post(
    util.joinUrlFragments([this.clientApiUrl, 'v1', 'sepa_mandates.json']),
    mergedAttrs,
    function (d) { return {sepaMandate: new SEPAMandate(d.europeBankAccounts[0].sepaMandates[0]), sepaBankAccount: new EuropeBankAccount(d.europeBankAccounts[0])}; },
    callback,
    this.requestTimeout
  );
};

Client.prototype.getSEPAMandate = function (attrs, callback) {
  var mergedAttrs = util.mergeOptions(this.attrs, attrs);
  this.driver.get(
    util.joinUrlFragments([this.clientApiUrl, 'v1', 'sepa_mandates.json']),
    mergedAttrs,
    function (d) { return {sepaMandate: new SEPAMandate(d.sepaMandates[0])}; },
    callback,
    this.requestTimeout
  );
};

Client.prototype.addCoinbase = function (attrs, callback) {
  var mergedAttrs;
  delete attrs.share;

  mergedAttrs = util.mergeOptions(this.attrs, {
    coinbaseAccount: attrs,
    _meta: {
      integration: this.integration || 'custom',
      source: 'coinbase'
    }
  });

  this.driver.post(
    util.joinUrlFragments([this.clientApiUrl, 'v1', 'payment_methods/coinbase_accounts']),
    mergedAttrs,
    function (d) {
      return new CoinbaseAccount(d.coinbaseAccounts[0]);
    },
    callback,
    this.requestTimeout
  );
};

Client.prototype.addPayPalAccount = function (attrs, callback) {
  var mergedAttrs;
  delete attrs.share;

  mergedAttrs = util.mergeOptions(this.attrs, {
    paypalAccount: attrs,
    _meta: {
      integration: this.integration || 'paypal',
      source: 'paypal'
    }
  });

  this.driver.post(
    util.joinUrlFragments([this.clientApiUrl, 'v1', 'payment_methods', 'paypal_accounts']),
    mergedAttrs,
    function (d) {
      return new PayPalAccount(d.paypalAccounts[0]);
    },
    callback,
    this.requestTimeout
  );
};

Client.prototype.addCreditCard = function (attrs, callback) {
  var mergedAttrs, creditCard;
  var share = attrs.share;
  delete attrs.share;

  creditCard = normalizeCreditCardFields(attrs);

  mergedAttrs = util.mergeOptions(this.attrs, {
    share: share,
    creditCard: creditCard,
    _meta: {
      integration: this.integration || 'custom',
      source: 'form'
    }
  });

  this.driver.post(
    util.joinUrlFragments([this.clientApiUrl, 'v1', 'payment_methods/credit_cards']),
    mergedAttrs,
    function (d) {
      return new CreditCard(d.creditCards[0]);
    },
    callback,
    this.requestTimeout
  );
};

Client.prototype.sendAnalyticsEvents = function (events, callback) {
  var attrs, event;
  var url = this.analyticsUrl;
  var eventObjects = [];
  events = util.isArray(events) ? events : [events];

  if (!url) {
    if (callback) {
      callback.apply(null, [null, {}]);
    }
    return;
  }

  for (event in events) {
    if (events.hasOwnProperty(event)) {
      eventObjects.push({ kind: events[event] });
    }
  }

  attrs = util.mergeOptions(this.attrs, {
    /*eslint-disable */
    braintree_library_version: this.sdkVersion,
    /*eslint-ensable */
    analytics: eventObjects,
    _meta: {
      merchantAppId: this.merchantAppId,
      platform: 'web',
      platformVersion: global.navigator.userAgent,
      integrationType: this.integration,
      sdkVersion: this.sdkVersion
    }
  });

  this.driver.post(url, attrs, function (d) { return d; }, callback, constants.ANALYTICS_TIMEOUT_MS);
};

Client.prototype.decryptBrowserswitchPayload = function (encryptedPayload, callback) {
  var attrs = util.mergeOptions(this.attrs, {asymmetric_encrypted_payload: encryptedPayload});
  var url = util.joinUrlFragments([this.clientApiUrl, '/v1/paypal_browser_switch/decrypt']);
  this.driver.post(
    url,
    attrs,
    function (d) { return d; },
    callback,
    this.requestTimeout
  );
};

Client.prototype.encryptBrowserswitchReturnPayload = function(payload, aesKey, callback) {
  var attrs = util.mergeOptions(this.attrs, {
    payload: payload,
    aesKey: aesKey
  });
  var url = util.joinUrlFragments([this.clientApiUrl, '/v1/paypal_browser_switch/encrypt']);
  this.driver.post(
    url,
    attrs,
    function (d) { return d; },
    callback,
    this.requestTimeout
  );
};

Client.prototype.exchangePaypalTokenForConsentCode = function (tokensObj, callback) {
  var attrs = util.mergeOptions(this.attrs, tokensObj);
  if (this.attrs.merchantAccountId) {
    attrs.merchant_account_id = this.attrs.merchantAccountId;
  }
  var url = util.joinUrlFragments([this.clientApiUrl, '/v1/paypal_account_service/merchant_consent']);
  this.driver.post(
    url,
    attrs,
    function (d) { return d; },
    callback,
    this.requestTimeout
  );
};

Client.prototype.getAmexRewardsBalance = function (attrs, callback) {
  var mergedAttrs = util.mergeOptions(this.attrs, attrs);
  if (mergedAttrs.nonce) {
    mergedAttrs.payment_method_nonce = mergedAttrs.nonce;
    delete mergedAttrs.nonce;
  }

  this.driver.get(
    util.joinUrlFragments([this.clientApiUrl, 'v1/payment_methods/amex_rewards_balance']),
    mergedAttrs,
    function (d) { return d; },
    callback,
    this.requestTimeout
  );
};

module.exports = Client;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./coinbase-account":3,"./constants":4,"./credit-card":5,"./europe-bank-account":6,"./normalize-api-fields":8,"./parse-client-token":9,"./paypal-account":10,"./request/choose-driver":13,"./sepa-mandate":18,"./should-enable-cors":19,"./util":20,"braintree-3ds":29,"braintree-utilities":43}],3:[function(require,module,exports){
'use strict';

var ATTRIBUTES = [
  'nonce',
  'type',
  'description',
  'details'
];

function CoinbaseAccount(attributes) {
  var i, attribute;

  for (i = 0; i < ATTRIBUTES.length; i++) {
    attribute = ATTRIBUTES[i];
    this[attribute] = attributes[attribute];
  }
}

module.exports = CoinbaseAccount;

},{}],4:[function(require,module,exports){
module.exports={
  "apiUrls": {
    "production": "https://api.braintreegateway.com:443",
    "sandbox": "https://api.sandbox.braintreegateway.com:443"
  },
  "errors": {
    "UNKNOWN_ERROR": "Unknown error",
    "INVALID_TIMEOUT": "Timeout must be a number"
  },
  "ANALYTICS_TIMEOUT_MS": 4000
};

},{}],5:[function(require,module,exports){
'use strict';

var ATTRIBUTES = [
  'billingAddress',
  'branding',
  'createdAt',
  'createdAtMerchant',
  'createdAtMerchantName',
  'details',
  'isLocked',
  'lastUsedAt',
  'lastUsedAtMerchant',
  'lastUsedAtMerchantName',
  'lastUsedByCurrentMerchant',
  'nonce',
  'securityQuestions',
  'type'
];

function CreditCard(attributes) {
  var i, attribute;

  for (i = 0; i < ATTRIBUTES.length; i++) {
    attribute = ATTRIBUTES[i];
    this[attribute] = attributes[attribute];
  }
}

module.exports = CreditCard;

},{}],6:[function(require,module,exports){
'use strict';

function EuropeBankAccount(attributes) {
  var allAttributes = [
    'bic',
    'maskedIBAN',
    'nonce',
    'accountHolderName'
  ];
  var attribute;
  var i = 0;

  for (i = 0; i < allAttributes.length; i++) {
    attribute = allAttributes[i];
    this[attribute] = attributes[attribute];
  }
}

module.exports = EuropeBankAccount;

},{}],7:[function(require,module,exports){
'use strict';

var parseClientToken = require('./parse-client-token');
var util = require('./util');
var chooseRequestDriver = require('./request/choose-driver');
var shouldEnableCORS = require('./should-enable-cors');
var constants = require('./constants');

function _tokenizeClientKey(clientKey) {
  var tokens = clientKey.split('_');
  var environment = tokens[0];
  var merchantId = tokens.slice(2).join('_');

  return {
    merchantId: merchantId,
    environment: environment
  };
}

function getConfiguration(options, callback) {
  var configUrl, clientKeyParts, parsedClientToken;
  var driver = chooseRequestDriver({enableCORS: shouldEnableCORS(options)});
  var clientKey = options.clientKey;
  var attrs = {};

  if (clientKey) {
    attrs.clientKey = clientKey;
    clientKeyParts = _tokenizeClientKey(clientKey);
    configUrl = constants.apiUrls[clientKeyParts.environment] + '/merchants/' + clientKeyParts.merchantId + '/client_api/v1/configuration';
  } else {
    parsedClientToken = parseClientToken(options.clientToken);

    if (parsedClientToken.authorizationFingerprint) {
      attrs.authorizationFingerprint = parsedClientToken.authorizationFingerprint;
      configUrl = parsedClientToken.configUrl;
    }
  }

  driver.get(
    configUrl,
    attrs,
    function (d) {
      return util.mergeOptions(parsedClientToken, d);
    },
    callback,
    options.timeout
  );
}

module.exports = getConfiguration;

},{"./constants":4,"./parse-client-token":9,"./request/choose-driver":13,"./should-enable-cors":19,"./util":20}],8:[function(require,module,exports){
'use strict';

function normalizeCreditCardFields(attrs) {
  var key;
  var creditCard = {
    billingAddress: attrs.billingAddress || {}
  };

  for (key in attrs) {
    if (!attrs.hasOwnProperty(key)) { continue; }

    switch (key.replace(/_/, '').toLowerCase()) {
      case 'postalcode':
      case 'countryname':
      case 'countrycodenumeric':
      case 'countrycodealpha2':
      case 'countrycodealpha3':
      case 'region':
      case 'extendedaddress':
      case 'locality':
      case 'firstname':
      case 'lastname':
      case 'company':
      case 'streetaddress':
        creditCard.billingAddress[key] = attrs[key];
        break;
      default:
        creditCard[key] = attrs[key];
    }
  }

  return creditCard;
}

module.exports = {
  normalizeCreditCardFields: normalizeCreditCardFields
};

},{}],9:[function(require,module,exports){
'use strict';

var braintreeUtils = require('braintree-utilities');
require('./polyfill');

function parseClientToken(rawClientToken) {
  var clientToken;

  if (!rawClientToken) {
    throw new Error('Braintree API Client Misconfigured: clientToken required.');
  }

  if (typeof rawClientToken === 'object' && rawClientToken !== null) {
    clientToken = rawClientToken;
  } else {
    try {
      rawClientToken = window.atob(rawClientToken);
    } catch (b64Error) {}

    try {
      clientToken = JSON.parse(rawClientToken);
    } catch (jsonError) {
      throw new Error('Braintree API Client Misconfigured: clientToken is not valid JSON.');
    }
  }

  if (!clientToken.hasOwnProperty('clientApiUrl') || !braintreeUtils.isWhitelistedDomain(clientToken.clientApiUrl)) {
    throw new Error('Braintree API Client Misconfigured: the clientApiUrl provided in the clientToken is invalid.');
  }

  return clientToken;
}

module.exports = parseClientToken;

},{"./polyfill":11,"braintree-utilities":43}],10:[function(require,module,exports){
'use strict';

var ATTRIBUTES = [
  'nonce',
  'type',
  'description',
  'details'
];

function PayPalAccount(attributes) {
  var i, attribute;

  for (i = 0; i < ATTRIBUTES.length; i++) {
    attribute = ATTRIBUTES[i];
    this[attribute] = attributes[attribute];
  }
}

module.exports = PayPalAccount;

},{}],11:[function(require,module,exports){
(function (global){
'use strict';

var atobPolyfill = function (base64String) {
  var base64Matcher = new RegExp("^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})([=]{1,2})?$");
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var result = "";

  if (!base64Matcher.test(base64String)) {
    throw new Error("Non base64 encoded input passed to window.atob polyfill");
  }

  var i = 0;
  do {
    var b1 = characters.indexOf( base64String.charAt(i++) );
    var b2 = characters.indexOf( base64String.charAt(i++) );
    var b3 = characters.indexOf( base64String.charAt(i++) );
    var b4 = characters.indexOf( base64String.charAt(i++) );

    var a = ( ( b1 & 0x3F ) << 2 ) | ( ( b2 >> 4 ) & 0x3 );
    var b = ( ( b2 & 0xF  ) << 4 ) | ( ( b3 >> 2 ) & 0xF );
    var c = ( ( b3 & 0x3  ) << 6 ) | ( b4 & 0x3F );

    result += String.fromCharCode(a) + (b?String.fromCharCode(b):"") + (c?String.fromCharCode(c):"");

  } while( i < base64String.length );

  return result;
};

global.atob = global.atob || atobPolyfill;

module.exports = {
  atobPolyfill: atobPolyfill
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],12:[function(require,module,exports){
(function (global){
'use strict';

var util = require('../util');
var prepBody = require('./prep-body');
var parseBody = require('./parse-body');
var constants = require('../constants');
var isXHRAvailable = global.XMLHttpRequest && 'withCredentials' in new global.XMLHttpRequest();

function getRequestObject() {
  return isXHRAvailable ? new XMLHttpRequest() : new XDomainRequest();
}

function get(url, attrs, deserializer, callback, timeout) {
  var urlParams = util.createURLParams(url, attrs);
  makeRequest('GET', urlParams, null, deserializer, callback, timeout);
}

function post(url, attrs, deserializer, callback, timeout) {
  makeRequest('POST', url, attrs, deserializer, callback, timeout);
}

function makeRequest(method, url, body, deserializer, callback, timeout) {
  var status, resBody;
  var req = getRequestObject();

  callback = callback || function () {};

  if (isXHRAvailable) {
    req.onreadystatechange = function () {
      if (req.readyState !== 4) { return; }

      status = req.status;
      resBody = parseBody(req.responseText);

      if (status >= 400 || status === 0) {
        callback.call(null, resBody || {errors: constants.errors.UNKNOWN_ERROR}, null);
      } else if (status > 0) {
        callback.call(null, null, deserializer(resBody));
      }
    };
  } else {
    req.onload = function () {
      callback.call(null, null, deserializer(parseBody(req.responseText)));
    };

    req.onerror = function () {
      callback.call(null, req.responseText, null);
    };

    // This must remain for IE9 to work
    req.onprogress = function() {};

    req.ontimeout = function () {
      callback.call(null, {errors: constants.errors.UNKNOWN_ERROR}, null);
    };
  }

  req.open(method, url, true);
  req.timeout = timeout == null ? 60000 : timeout;

  if (isXHRAvailable && method === 'POST') {
    req.setRequestHeader('Content-Type', 'application/json');
  }

  setTimeout(function () {
    req.send(prepBody(method, body));
  }, 0);
}

module.exports = {
  get: get,
  post: post
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../constants":4,"../util":20,"./parse-body":16,"./prep-body":17}],13:[function(require,module,exports){
'use strict';

var JSONPDriver = require('./jsonp-driver');
var AJAXDriver = require('./ajax-driver');
var util = require('../util');

function chooseRequestDriver(options) {
  var ua = util.getUserAgent();
  var isAJAXAvailable = !(util.isHTTP() && /(MSIE\s(8|9))|(Phantom)/.test(ua));

  options = options || {};

  if (options.enableCORS && isAJAXAvailable) {
    return AJAXDriver;
  } else {
    return JSONPDriver;
  }
}

module.exports = chooseRequestDriver;

},{"../util":20,"./ajax-driver":12,"./jsonp-driver":14}],14:[function(require,module,exports){
'use strict';

var JSONP = require('./jsonp');
var constants = require('../constants');
var timeoutWatchers = [];

function deserialize(response, mapper) {
  if (response.status >= 400) {
    return [response, null];
  } else {
    return [null, mapper(response)];
  }
}

function noop() {}

function requestWithTimeout(url, attrs, deserializer, method, callback, timeout) {
  var uniqueName;

  callback = callback || noop;

  if (timeout == null) {
    timeout = 60000;
  }

  uniqueName = method(url, attrs, function (data, name) {
    if (timeoutWatchers[name]) {
      clearTimeout(timeoutWatchers[name]);
      callback.apply(null, deserialize(data, function (d) { return deserializer(d); }));
    }
  });

  if (typeof timeout === 'number') {
    timeoutWatchers[uniqueName] = setTimeout(function () {
      timeoutWatchers[uniqueName] = null;
      callback.apply(null, [{errors: constants.errors.UNKNOWN_ERROR}, null]);
    }, timeout);
  } else {
    callback.apply(null, [{errors: constants.errors.INVALID_TIMEOUT}, null]);
  }
}

function post(url, attrs, deserializer, callback, timeout) {
  attrs._method = 'POST';
  requestWithTimeout(url, attrs, deserializer, JSONP.get, callback, timeout);
}

function get(url, attrs, deserializer, callback, timeout) {
  requestWithTimeout(url, attrs, deserializer, JSONP.get, callback, timeout);
}

module.exports = {
  get: get,
  post: post
};

},{"../constants":4,"./jsonp":15}],15:[function(require,module,exports){
(function (global){
'use strict';

var util = require('../util');

/*
* Lightweight JSONP fetcher
* Copyright 2010-2012 Erik Karlsson. All rights reserved.
* BSD licensed
*/
var head,
    window = global,
    config = {};

function load(url, pfnError) {
  var script = document.createElement('script'),
  done = false;
  script.src = url;
  script.async = true;

  var errorHandler = pfnError || config.error;
  if ( typeof errorHandler === 'function' ) {
    script.onerror = function (ex){
      errorHandler({url: url, event: ex});
    };
  }

  script.onload = script.onreadystatechange = function () {
    if ( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
      done = true;
      script.onload = script.onreadystatechange = null;
      if ( script && script.parentNode ) {
        script.parentNode.removeChild( script );
      }
    }
  };

  if ( !head ) {
    head = document.getElementsByTagName('head')[0];
  }
  head.appendChild( script );
}

function jsonp(url, params, callback, callbackName) {
  var urlParams, key, uniqueName;

  callbackName = (callbackName||config['callbackName']||'callback');
  uniqueName = callbackName + "_json" + util.generateUUID();
  params[callbackName] = uniqueName;
  urlParams = util.createURLParams(url, params)

  window[ uniqueName ] = function (data){
    callback(data, uniqueName);
    try {
      delete window[ uniqueName ];
    } catch (e) {}
    window[ uniqueName ] = null;
  };

  load(urlParams);
  return uniqueName;
}

function setDefaults(obj){
  config = obj;
}

module.exports = {
  get: jsonp,
  init: setDefaults
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../util":20}],16:[function(require,module,exports){
'use strict';

module.exports = function (body) {
  try {
    body = JSON.parse(body);
  } catch (e) {}

  return body;
};

},{}],17:[function(require,module,exports){
'use strict';

var isString = require('lodash.isstring');

module.exports = function (method, body) {
  if (!isString(method)) {
    throw new Error('Method must be a string');
  }

  if (method.toLowerCase() !== 'get' && body != null) {
    body = isString(body) ? body : JSON.stringify(body);
  }

  return body;
};

},{"lodash.isstring":51}],18:[function(require,module,exports){
'use strict';

function SEPAMandate(attributes) {
  var i = 0;
  var attribute;
  var allAttributes = [
    'accountHolderName',
    'bic',
    'longFormURL',
    'mandateReferenceNumber',
    'maskedIBAN',
    'shortForm'
  ];

  for (i = 0; i < allAttributes.length; i++) {
    attribute = allAttributes[i];
    this[attribute] = attributes[attribute];
  }
}

module.exports = SEPAMandate;

},{}],19:[function(require,module,exports){
'use strict';

module.exports = function (options) {
  if (options.enableCORS != null) {
    return options.enableCORS;
  }

  if (options.merchantConfiguration) {
    return options.merchantConfiguration.enableCORS;
  }

  return false;
};

},{}],20:[function(require,module,exports){
(function (global){
'use strict';

var isEmpty = require('lodash.isempty');
var isObject = require('lodash.isobject');

function joinUrlFragments(fragments) {
  var strippedFragments = [],
  strippedFragment,
  i;

  for (i = 0; i < fragments.length; i++) {
    strippedFragment = fragments[i];
    if (strippedFragment.charAt(strippedFragment.length - 1) === '/') {
      strippedFragment = strippedFragment.substring(0, strippedFragment.length - 1);
    }
    if (strippedFragment.charAt(0) === '/') {
      strippedFragment = strippedFragment.substring(1);
    }

    strippedFragments.push(strippedFragment);
  }

  return strippedFragments.join('/');
}

function isArray(value) {
  return value && typeof value === 'object' && typeof value.length === 'number' &&
    Object.prototype.toString.call(value) === '[object Array]' || false;
}

function generateUUID() { // RFC 4122 v4 (pseudo-random) UUID without hyphens
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (xORy) {
    var randomHex = Math.floor(Math.random() * 16);
    var uuidHex = xORy === 'x' ? randomHex : randomHex & 0x3 | 0x8; // jshint ignore:line
    return uuidHex.toString(16);
  });
}

function mergeOptions(obj1, obj2) {
  var obj3 = {};
  var attrname;
  for (attrname in obj1) {
    if (obj1.hasOwnProperty(attrname)) {
      obj3[attrname] = obj1[attrname];
    }
  }
  for (attrname in obj2) {
    if (obj2.hasOwnProperty(attrname)) {
      obj3[attrname] = obj2[attrname];
    }
  }
  return obj3;
}

function stringify(params, namespace) {
  var query = [], k, v, p;

  for (p in params) {
    if (!params.hasOwnProperty(p)) {
      continue;
    }

    v = params[p];

    if (namespace) {
      if (isArray(params)) {
        k = namespace + '[]';
      } else {
        k = namespace + '[' + p + ']';
      }
    } else {
      k = p;
    }
    if (typeof v === 'object') {
      query.push(stringify(v, k));
    } else {
      query.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  }

  return query.join('&');
}

function createURLParams(url, params) {
  url = url || '';

  if (!isEmpty(params) && isObject(params)) {
    url += url.indexOf('?') === -1 ? '?' : '';
    url += url.indexOf('=') !== -1 ? '&' : '';
    url += stringify(params);
  }

  return url;
}

function getUserAgent() {
  return global.navigator.userAgent;
}

function isHTTP() {
  return global.location.protocol === 'http:';
}

module.exports = {
  joinUrlFragments: joinUrlFragments,
  isArray: isArray,
  generateUUID: generateUUID,
  mergeOptions: mergeOptions,
  stringify: stringify,
  createURLParams: createURLParams,
  getUserAgent: getUserAgent,
  isHTTP: isHTTP
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"lodash.isempty":44,"lodash.isobject":50}],21:[function(require,module,exports){
'use strict';

var Client = require('./lib/client');
var util = require('./lib/util');
var parseClientToken = require('./lib/parse-client-token');
var getConfiguration = require('./lib/get-configuration');

function configure(options) {
  return new Client(options);
}

module.exports = {
  Client: Client,
  configure: configure,
  util: util,
  parseClientToken: parseClientToken,
  _getConfiguration: getConfiguration
};

},{"./lib/client":2,"./lib/get-configuration":7,"./lib/parse-client-token":9,"./lib/util":20}],22:[function(require,module,exports){
'use strict';

function normalizeElement (element, errorMessage) {
  errorMessage = errorMessage || '[' + element + '] is not a valid DOM Element';

  if (element && element.nodeType && element.nodeType === 1) {
    return element;
  }
  if (element && window.jQuery && (element instanceof jQuery || 'jquery' in Object(element)) && element.length !== 0) {
    return element[0];
  }

  if (typeof element === 'string' && document.getElementById(element)) {
    return document.getElementById(element);
  }

  throw new Error(errorMessage);
}

module.exports = {
  normalizeElement: normalizeElement
};

},{}],23:[function(require,module,exports){
'use strict';

function addEventListener(element, type, listener, useCapture) {
  if (element.addEventListener) {
    element.addEventListener(type, listener, useCapture);
  } else if (element.attachEvent) {
    element.attachEvent('on' + type, listener);
  }
}

function removeEventListener(element, type, listener, useCapture) {
  if (element.removeEventListener) {
    element.removeEventListener(type, listener, useCapture);
  } else if (element.detachEvent) {
    element.detachEvent('on' + type, listener);
  }
}

module.exports = {
  addEventListener: addEventListener,
  removeEventListener: removeEventListener
};

},{}],24:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString;

function isFunction(func) {
  return toString.call(func) === '[object Function]';
}

function bind(func, context) {
  return function () {
    func.apply(context, arguments);
  };
}

module.exports = {
  bind: bind,
  isFunction: isFunction
};

},{}],25:[function(require,module,exports){
'use strict';

function isBrowserHttps() {
  return window.location.protocol === 'https:';
}

function encode(str) {
  switch (str) {
    case null:
    case undefined:
      return '';
    case true:
      return '1';
    case false:
      return '0';
    default:
      return encodeURIComponent(str);
  }
}

function makeQueryString(params, namespace) {
  var query = [], k, p;
  for (p in params) {
    if (params.hasOwnProperty(p)) {
      var v = params[p];
      if (namespace) {
        k = namespace + '[' + p + ']';
      } else {
        k = p;
      }
      if (typeof v === 'object') {
        query.push(makeQueryString(v, k));
      } else if (v !== undefined && v !== null) {
        query.push(encode(k) + '=' + encode(v));
      }
    }
  }
  return query.join('&');
}

function decodeQueryString(queryString) {
  var params = {},
  paramPairs = queryString.split('&');

  for (var i = 0; i < paramPairs.length; i++) {
    var paramPair = paramPairs[i].split('=');
    var key = paramPair[0];
    var value = decodeURIComponent(paramPair[1]);
    params[key] = value;
  }

  return params;
}

function getParams(url) {
  var urlSegments = url.split('?');

  if (urlSegments.length !== 2) {
    return {};
  }

  return decodeQueryString(urlSegments[1]);
}

module.exports = {
  isBrowserHttps: isBrowserHttps,
  makeQueryString: makeQueryString,
  decodeQueryString: decodeQueryString,
  getParams: getParams
};

},{}],26:[function(require,module,exports){
var dom = require('./lib/dom');
var url = require('./lib/url');
var fn = require('./lib/fn');
var events = require('./lib/events');

module.exports = {
  normalizeElement: dom.normalizeElement,
  isBrowserHttps: url.isBrowserHttps,
  makeQueryString: url.makeQueryString,
  decodeQueryString: url.decodeQueryString,
  getParams: url.getParams,
  removeEventListener: events.removeEventListener,
  addEventListener: events.addEventListener,
  bind: fn.bind,
  isFunction: fn.isFunction
};

},{"./lib/dom":22,"./lib/events":23,"./lib/fn":24,"./lib/url":25}],27:[function(require,module,exports){
'use strict';

var utils = require('braintree-utilities');
var Receiver = require('../shared/receiver');
var version = "1.3.0";

var htmlNode, bodyNode;

function getElementStyle(element, style) {
  var computedStyle = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;

  return computedStyle[style];
}

function getMerchantPageDefaultStyles() {
  return {
    html: {
      height: htmlNode.style.height || '',
      overflow: getElementStyle(htmlNode, 'overflow'),
      position: getElementStyle(htmlNode, 'position')
    },
    body: {
      height: bodyNode.style.height || '',
      overflow: getElementStyle(bodyNode, 'overflow')
    }
  };
}

function AuthenticationService (assetsUrl, container) {
  this.assetsUrl = assetsUrl;
  this.container = container || document.body;
  this.iframe = null;

  htmlNode = document.documentElement;
  bodyNode = document.body;
  this.merchantPageDefaultStyles = getMerchantPageDefaultStyles();
}

AuthenticationService.prototype.get = function (response, callback) {
  var self = this,
  url = this.constructAuthorizationURL(response);

  if (this.container && utils.isFunction(this.container)) {
    this.container(url + '&no_style=1');
  } else {
    this.insertIframe(url);
  }

  new Receiver(function (response) {
    if (!utils.isFunction(self.container)) {
      self.removeIframe();
    }
    callback(response);
  });
};

AuthenticationService.prototype.removeIframe = function () {
  if (this.container && this.container.nodeType && this.container.nodeType === 1) {
    this.container.removeChild(this.iframe);
  } else if (this.container && window.jQuery && this.container instanceof jQuery) {
    $(this.iframe, this.container).remove();
  } else if (typeof this.container === 'string') {
    document.getElementById(this.container).removeChild(this.iframe);
  }

  this.unlockMerchantWindowSize();
};

AuthenticationService.prototype.insertIframe = function (url) {
  // TODO: Security - This takes a url and makes an iframe. Doesn't seem like this would be a problem.
  var iframe = document.createElement('iframe');
  iframe.src = url;
  this.applyStyles(iframe);
  this.lockMerchantWindowSize();

  if (this.container && this.container.nodeType && this.container.nodeType === 1) {
    this.container.appendChild(iframe);
  } else if (this.container && window.jQuery && this.container instanceof jQuery && this.container.length !== 0) {
    this.container.append(iframe);
  } else if (typeof this.container === 'string' && document.getElementById(this.container)) {
    document.getElementById(this.container).appendChild(iframe);
  } else {
    throw new Error('Unable to find valid container for iframe.');
  }
  this.iframe = iframe;
};

AuthenticationService.prototype.applyStyles = function (iframe) {
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.height = '100%';
  iframe.style.width = '100%';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allowTransparency', 'true');
  iframe.style.border = '0';
  iframe.style.zIndex = '99999';
};

AuthenticationService.prototype.lockMerchantWindowSize = function () {
  htmlNode.style.overflow = 'hidden';
  bodyNode.style.overflow = 'hidden';
  bodyNode.style.height = '100%';
};

AuthenticationService.prototype.unlockMerchantWindowSize = function () {
  var defaultStyles = this.merchantPageDefaultStyles;

  bodyNode.style.height = defaultStyles.body.height;
  bodyNode.style.overflow = defaultStyles.body.overflow;

  htmlNode.style.overflow = defaultStyles.html.overflow;
};

AuthenticationService.prototype.constructAuthorizationURL = function (response) {
  var queryString,
  parentURL = window.location.href;

  if (parentURL.indexOf('#') > -1) {
    parentURL = parentURL.split('#')[0];
  }

  queryString = utils.makeQueryString({
    acsUrl: response.acsUrl,
    pareq: response.pareq,
    termUrl: response.termUrl + '&three_d_secure_version=' + version,
    md: response.md,
    parentUrl: parentURL
  });
  return this.assetsUrl + '/3ds/' + version + '/html/style_frame?' + queryString;
};

module.exports = AuthenticationService;

},{"../shared/receiver":34,"braintree-utilities":26}],28:[function(require,module,exports){
'use strict';

var utils = require('braintree-utilities');
var AuthenticationService = require('./authorization_service');
var Loader = require('./loader');

function noop() {}

function Client(api, options) {
  options = options || {};
  this.clientToken = options.clientToken;
  this.container = options.container;
  this.api = api;
  this.nonce = null;

  this._loader = null;
  this._boundHandleUserClose = utils.bind(this._handleUserClose, this);
}

Client.prototype.verify = function (data, callback) {
  if (!utils.isFunction(callback)) {
    this.api.sendAnalyticsEvents('3ds.web.no_callback');
    throw new Error('No suitable callback argument was given');
  }
  if (utils.isFunction(data.onUserClose)) {
    this._onUserClose = data.onUserClose;
  }
  if (utils.isFunction(data.onLookupComplete)) {
    this._onLookupComplete = data.onLookupComplete;
  }
  if (data.useDefaultLoader === undefined || data.useDefaultLoader === true) {
    this._createDefaultLoader();
  }

  var dataRecord = {nonce: '', amount: data.amount};
  var creditCardMetaData = data.creditCard;

  if (typeof creditCardMetaData === 'string') {
    dataRecord.nonce = creditCardMetaData;
    this.api.sendAnalyticsEvents('3ds.web.verify.nonce');
    this.startVerification(dataRecord, callback);
  } else {
    var self = this;
    var boundHandleTokenizeCard = function (err, nonce) {
      if (err) {
        self._removeDefaultLoader();

        return callback(err);
      }
      dataRecord.nonce = nonce;
      self.startVerification(dataRecord, callback);
    };
    this.api.sendAnalyticsEvents('3ds.web.verify.credit_card');
    this.api.tokenizeCard(creditCardMetaData, boundHandleTokenizeCard);
  }
};

Client.prototype.startVerification = function (data, merchantCallback) {
  this.api.lookup3DS(data, utils.bind(this.handleLookupResponse(merchantCallback), this));
};

Client.prototype.handleLookupResponse = function (merchantCallback) {
  var self = this;
  return function (errorResponse, lookupResponse) {
    var authenticationService;

    this._onLookupComplete();

    if (errorResponse) {
      merchantCallback(errorResponse.error);
    } else if (lookupResponse.lookup && lookupResponse.lookup.acsUrl && lookupResponse.lookup.acsUrl.length > 0) {
      self.nonce = lookupResponse.paymentMethod.nonce;
      authenticationService = new AuthenticationService(this.clientToken.assetsUrl, this.container);
      authenticationService.get(lookupResponse.lookup, utils.bind(this.handleAuthenticationResponse(merchantCallback), this));

      this._detachListeners();
      this._attachListeners();
    } else {
      self.nonce = lookupResponse.paymentMethod.nonce;
      merchantCallback(null, {
        nonce: self.nonce,
        verificationDetails: lookupResponse.threeDSecureInfo
      });
    }
  };
};

Client.prototype.handleAuthenticationResponse = function (merchantCallback) {
  return function (authResponseQueryString) {
    var authResponse,
        queryParams = utils.decodeQueryString(authResponseQueryString);

    if (queryParams.user_closed) {
      return;
    }

    authResponse = JSON.parse(queryParams.auth_response);

    if (authResponse.success) {
      merchantCallback(null, {
        nonce: authResponse.paymentMethod.nonce,
        verificationDetails: authResponse.threeDSecureInfo
      });
    } else if (authResponse.threeDSecureInfo && authResponse.threeDSecureInfo.liabilityShiftPossible) {
      merchantCallback(null, {
        nonce: this.nonce,
        verificationDetails: authResponse.threeDSecureInfo
      });
    } else {
      merchantCallback(authResponse.error);
    }
  };
};

Client.prototype._attachListeners = function () {
  utils.addEventListener(window, 'message', this._boundHandleUserClose);
};

Client.prototype._detachListeners = function () {
  utils.removeEventListener(window, 'message', this._boundHandleUserClose);
};

Client.prototype._createDefaultLoader = function () {
  this._loader = new Loader();

  document.body.appendChild(this._loader.getElement());
};

Client.prototype._removeDefaultLoader = function () {
  if (!this._loader) {
    return;
  }

  var loaderElement = this._loader.getElement();
  var parentElement = loaderElement.parentNode;

  if (parentElement) {
    parentElement.removeChild(loaderElement);
  }

  this._loader.dispose();
  this._loader = null;
};

Client.prototype._handleUserClose = function (event) {
  if (event.data === 'user_closed=true') {
    this._onUserClose();
  }
};

Client.prototype._onUserClose = noop;

Client.prototype._onLookupComplete = function () {
  this._removeDefaultLoader();
};

module.exports = Client;

},{"./authorization_service":27,"./loader":30,"braintree-utilities":26}],29:[function(require,module,exports){
'use strict';

var Client = require('./client');

module.exports = {
  create: function (clientToken, options) {
    var client = new Client(clientToken, options);
    return client;
  }
};

},{"./client":28}],30:[function(require,module,exports){
'use strict';

var LoaderDisplay = require('./loader_display');
var LoaderMessage = require('./loader_message');
var LoaderSpinner = require('./loader_spinner');

function Loader() {
  this._element = document.createElement('div');
  this._element.style.cssText = this._cssDeclarations;

  this._display = null;

  this._initialize();
}

Loader.prototype._cssDeclarations = [
  'filter:progid:DXImageTransform.Microsoft.Gradient(StartColorStr=#7F000000, EndColorStr=#7F000000)',
  'background-color: rgba(0, 0, 0, 0.5)',
  'display: table',
  'height: 100%',
  'left: 0',
  'position: fixed',
  'right: 0',
  'top: 0',
  'width: 100%',
  'z-index: 99999'
].join(';');

Loader.prototype.getElement = function () {
  return this._element;
};

Loader.prototype.dispose = function () {
  this._display.dispose();
  this._display = null;

  this._element = null;
};

Loader.prototype._initialize = function () {
  var displayObject = new LoaderSpinner();
  var supportsSvgAnimations = (window.SVGElement && window.SVGAnimateElement &&
                               window.SVGAnimateTransformElement);

  if (!(supportsSvgAnimations)) {
    displayObject = new LoaderMessage('Loading...');
  }

  this._display = new LoaderDisplay(displayObject);
  this.getElement().appendChild(this._display.getElement());
};

module.exports = Loader;

},{"./loader_display":31,"./loader_message":32,"./loader_spinner":33}],31:[function(require,module,exports){
'use strict';

function LoaderDisplay(displayObject) {
  this._element = document.createElement('div');
  this._element.style.cssText = this._cssDeclarations;

  this._displayObject = displayObject;

  this._initialize();
}

LoaderDisplay.prototype._cssDeclarations = [
  'display: table-cell',
  'vertical-align: middle'
].join(';');

LoaderDisplay.prototype.getElement = function () {
  return this._element;
};

LoaderDisplay.prototype.dispose = function () {
  this._displayObject.dispose();
  this._displayObject = null;

  this._element = null;
};

LoaderDisplay.prototype._initialize = function () {
  this.getElement().appendChild(this._displayObject.getElement());
};

module.exports = LoaderDisplay;

},{}],32:[function(require,module,exports){
'use strict';

function LoaderMessage(text) {
  this._element = document.createElement('div');
  this._element.style.cssText = this._cssDeclarations;
  this._element.innerHTML = text;
}

LoaderMessage.prototype._cssDeclarations = [
  'color: #fff',
  'font-family: Helvetica, sans-serif',
  'font-size: 12px',
  'text-align: center'
].join(';');

LoaderMessage.prototype.getElement = function () {
  return this._element;
};

LoaderMessage.prototype.dispose = function () {
  this._element = null;
};

module.exports = LoaderMessage;

},{}],33:[function(require,module,exports){
'use strict';

function LoaderSpinner() {
  this._element = document.createElement('div');
  this._element.style.cssText = this._cssDeclarations;
  this._element.innerHTML = this._markup;
}

LoaderSpinner.prototype._cssDeclarations = [
  'height: 36px',
  'margin-left: auto',
  'margin-right: auto',
  'width: 36px'
].join(';');

LoaderSpinner.prototype._markup = [
  '<svg version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"',
  'width="100%" height="100%" viewBox="0 0 50 50" style="enable-background:new 0 0 50 50;" xml:space="preserve">',
  '  <path fill="#FFF" d="M43.935,25.145c0-10.318-8.364-18.683-18.683-18.683c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615c8.072,0,14.615,6.543,14.615,14.615H43.935z">',
  '    <animateTransform attributeType="xml"',
  '    attributeName="transform"',
  '    type="rotate"',
  '    from="0 25 25"',
  '    to="360 25 25"',
  '    dur="780ms"',
  '    repeatCount="indefinite"',
  '    calcMode="spline"',
  '    keySplines="0.44, 0.22, 0, 1"',
  '    keyTimes="0;1"/>',
  '  </path>',
  '</svg>'
].join('');

LoaderSpinner.prototype.getElement = function () {
  return this._element;
};

LoaderSpinner.prototype.dispose = function () {
  this._element = null;
};

module.exports = LoaderSpinner;

},{}],34:[function(require,module,exports){
'use strict';

var utils = require('braintree-utilities');

function Receiver (callback) {
  this.postMessageReceiver(callback);
  this.hashChangeReceiver(callback);
}

Receiver.prototype.postMessageReceiver = function (callback) {
  var self = this;

  this.wrappedCallback = function (event) {
    var data = event.data;

    if (/^(auth_response=)/.test(data) || data === 'user_closed=true') {
      callback(data);
      self.stopListening();
    }
  };

  utils.addEventListener(window, 'message', this.wrappedCallback);
};

Receiver.prototype.hashChangeReceiver = function (callback) {
  var hash,
      originalHash = window.location.hash,
      self = this;

  this.poll = setInterval(function () {
    hash = window.location.hash;

    if (hash.length > 0 && (hash !== originalHash)) {
      self.stopListening();

      hash = hash.substring(1, hash.length);
      callback(hash);

      if (originalHash.length > 0) {
        window.location.hash = originalHash;
      } else {
        window.location.hash = '';
      }
    }
  }, 10);
};

Receiver.prototype.stopListening = function () {
  clearTimeout(this.poll);

  utils.removeEventListener(window, 'message', this.wrappedCallback);
};

module.exports = Receiver;

},{"braintree-utilities":26}],35:[function(require,module,exports){
'use strict';

var nativeIndexOf = Array.prototype.indexOf;

var indexOf;
if (nativeIndexOf) {
  indexOf = function (haystack, needle) {
    return haystack.indexOf(needle);
  };
} else {
  indexOf = function indexOf(haystack, needle) {
    for (var i = 0, len = haystack.length; i < len; i++) {
      if (haystack[i] === needle) {
        return i;
      }
    }
    return -1;
  };
}

module.exports = {
  indexOf: indexOf
};

},{}],36:[function(require,module,exports){
'use strict';

function _escape(string) {
  var i, hex;
  var escaped = '';

  for (i = 0; i < string.length; i++) {
    escaped += '%';
    hex = string[i].charCodeAt(0).toString(16).toUpperCase();

    if (hex.length < 2) {
      escaped += '0';
    }

    escaped += hex;
  }

  return escaped;
}

function decodeUtf8(b64) {
  return decodeURIComponent(_escape(atob(b64)));
}

module.exports = {
  decodeUtf8: decodeUtf8
};

},{}],37:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],38:[function(require,module,exports){
'use strict';

function addEventListener(element, type, listener, useCapture) {
  if (element.addEventListener) {
    element.addEventListener(type, listener, useCapture || false);
  } else if (element.attachEvent) {
    element.attachEvent('on' + type, listener);
  }
}

function removeEventListener(element, type, listener, useCapture) {
  if (element.removeEventListener) {
    element.removeEventListener(type, listener, useCapture || false);
  } else if (element.detachEvent) {
    element.detachEvent('on' + type, listener);
  }
}

function preventDefault(event) {
  if (event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }
}

module.exports = {
  addEventListener: addEventListener,
  removeEventListener: removeEventListener,
  preventDefault: preventDefault
};

},{}],39:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString;

function isFunction(func) {
  return toString.call(func) === '[object Function]';
}

function bind(func, context) {
  return function () {
    return func.apply(context, arguments);
  };
}

module.exports = {
  bind: bind,
  isFunction: isFunction
};

},{}],40:[function(require,module,exports){
'use strict';

function getMaxCharLength(width) {
  var max, i, range, len;
  var ranges = [
    { min: 0, max: 180, chars: 7 },
    { min: 181, max: 620, chars: 14 },
    { min: 621, max: 960, chars: 22 }
  ];

  len = ranges.length;

  width = width || window.innerWidth;

  for (i = 0; i < len; i++) {
    range = ranges[i];

    if (width >= range.min && width <= range.max) {
      max = range.chars;
    }
  }

  return max || 60;
}

function truncateEmail(email, maxLength) {
  var address, domain;

  if (email.indexOf('@') === -1) {
    return email;
  }

  email = email.split('@');
  address = email[0];
  domain = email[1];

  if (address.length > maxLength) {
    address = address.slice(0, maxLength) + '...';
  }

  if (domain.length > maxLength) {
    domain = '...' + domain.slice(-maxLength);
  }

  return address + '@' + domain;
}

module.exports = {
  truncateEmail: truncateEmail,
  getMaxCharLength: getMaxCharLength
};

},{}],41:[function(require,module,exports){
'use strict';

var array = require('./array');

function isBrowserHttps() {
  return window.location.protocol === 'https:';
}

function encode(str) {
  switch (str) {
    case null:
    case undefined:
      return '';
    case true:
      return '1';
    case false:
      return '0';
    default:
      return encodeURIComponent(str);
  }
}

function makeQueryString(params, namespace) {
  var query = [], k, p;
  for (p in params) {
    if (params.hasOwnProperty(p)) {
      var v = params[p];
      if (namespace) {
        k = namespace + '[' + p + ']';
      } else {
        k = p;
      }
      if (typeof v === 'object') {
        query.push(makeQueryString(v, k));
      } else if (v !== undefined && v !== null) {
        query.push(encode(k) + '=' + encode(v));
      }
    }
  }
  return query.join('&');
}

function decodeQueryString(queryString) {
  var params = {},
  paramPairs = queryString.split('&');

  for (var i = 0; i < paramPairs.length; i++) {
    var paramPair = paramPairs[i].split('=');
    var key = paramPair[0];
    var value = decodeURIComponent(paramPair[1]);
    params[key] = value;
  }

  return params;
}

function getParams(url) {
  var urlSegments = url.split('?');

  if (urlSegments.length !== 2) {
    return {};
  }

  return decodeQueryString(urlSegments[1]);
}

var parser = document.createElement('a');
var legalHosts = [
  'paypal.com',
  'braintreepayments.com',
  'braintreegateway.com',
  'localhost'
];

function isWhitelistedDomain(url) {
  url = url.toLowerCase();

  if (!/^http/.test(url)) {
    return false;
  }

  parser.href = url;

  var pieces = parser.hostname.split('.');
  var topLevelDomain = pieces.slice(-2).join('.');

  if (array.indexOf(legalHosts, topLevelDomain) === -1) {
    return false;
  }

  return true;
}

module.exports = {
  isBrowserHttps: isBrowserHttps,
  makeQueryString: makeQueryString,
  decodeQueryString: decodeQueryString,
  getParams: getParams,
  isWhitelistedDomain: isWhitelistedDomain
};

},{"./array":35}],42:[function(require,module,exports){
'use strict';

// RFC 4122 v4 (pseudo-random) UUID
function generate() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
}

module.exports = generate;

},{}],43:[function(require,module,exports){
var dom = require('./lib/dom');
var url = require('./lib/url');
var fn = require('./lib/fn');
var events = require('./lib/events');
var string = require('./lib/string');
var array = require('./lib/array');
var base64 = require('./lib/base64');
var uuid = require('./lib/uuid');

module.exports = {
  string: string,
  array: array,
  normalizeElement: dom.normalizeElement,
  isBrowserHttps: url.isBrowserHttps,
  makeQueryString: url.makeQueryString,
  decodeQueryString: url.decodeQueryString,
  getParams: url.getParams,
  isWhitelistedDomain: url.isWhitelistedDomain,
  removeEventListener: events.removeEventListener,
  addEventListener: events.addEventListener,
  preventDefault: events.preventDefault,
  bind: fn.bind,
  isFunction: fn.isFunction,
  base64ToUtf8: base64.decodeUtf8,
  uuid: uuid
};

},{"./lib/array":35,"./lib/base64":36,"./lib/dom":37,"./lib/events":38,"./lib/fn":39,"./lib/string":40,"./lib/url":41,"./lib/uuid":42}],44:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray'),
    isFunction = require('lodash.isfunction'),
    isString = require('lodash.isstring'),
    keys = require('lodash.keys');

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is empty. A value is considered empty unless it is an
 * `arguments` object, array, string, or jQuery-like collection with a length
 * greater than `0` or an object with own enumerable properties.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {Array|Object|string} value The value to inspect.
 * @returns {boolean} Returns `true` if `value` is empty, else `false`.
 * @example
 *
 * _.isEmpty(null);
 * // => true
 *
 * _.isEmpty(true);
 * // => true
 *
 * _.isEmpty(1);
 * // => true
 *
 * _.isEmpty([1, 2, 3]);
 * // => false
 *
 * _.isEmpty({ 'a': 1 });
 * // => false
 */
function isEmpty(value) {
  if (value == null) {
    return true;
  }
  if (isArrayLike(value) && (isArray(value) || isString(value) || isArguments(value) ||
      (isObjectLike(value) && isFunction(value.splice)))) {
    return !value.length;
  }
  return !keys(value).length;
}

module.exports = isEmpty;

},{"lodash.isarguments":45,"lodash.isarray":46,"lodash.isfunction":47,"lodash.isstring":51,"lodash.keys":48}],45:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  return isObjectLike(value) && isArrayLike(value) &&
    hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
}

module.exports = isArguments;

},{}],46:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var arrayTag = '[object Array]',
    funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isArray;

},{}],47:[function(require,module,exports){
/**
 * lodash 3.0.6 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isFunction;

},{}],48:[function(require,module,exports){
/**
 * lodash 3.1.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require('lodash._getnative'),
    isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = !!length && isLength(length) &&
    (isArray(object) || isArguments(object));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object == null ? undefined : object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keys;

},{"lodash._getnative":49,"lodash.isarguments":45,"lodash.isarray":46}],49:[function(require,module,exports){
/**
 * lodash 3.9.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = getNative;

},{}],50:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],51:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var stringTag = '[object String]';

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isString('abc');
 * // => true
 *
 * _.isString(1);
 * // => false
 */
function isString(value) {
  return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
}

module.exports = isString;

},{}],52:[function(require,module,exports){
'use strict';

var bus = require('framebus');
var events = require('./lib/events');
var checkOrigin = require('./lib/check-origin').checkOrigin;

function BraintreeBus(options) {
  options = options || {};

  this.channel = options.channel;
  if (!this.channel) {
    throw new Error('Channel ID must be specified');
  }

  this.merchantUrl = options.merchantUrl;

  this._isDestroyed = false;
  this._isVerbose = false;

  this._listeners = [];

  this._log('new bus on channel ' + this.channel, [location.href]);
}

BraintreeBus.prototype.on = function (eventName, originalHandler) {
  var namespacedEvent, args;
  var handler = originalHandler;
  var self = this;

  if (this._isDestroyed) { return; }

  if (this.merchantUrl) {
    handler = function () {
      if (checkOrigin(this.origin, self.merchantUrl)) {
        originalHandler.apply(this, arguments);
      }
    };
  }

  namespacedEvent = this._namespaceEvent(eventName);
  args = Array.prototype.slice.call(arguments);
  args[0] = namespacedEvent;
  args[1] = handler;

  this._log('on', args);
  bus.on.apply(bus, args);

  this._listeners.push({
    eventName: eventName,
    handler: handler,
    originalHandler: originalHandler
  });
};

BraintreeBus.prototype.emit = function (eventName, payload, reply) {
  var args;

  if (this._isDestroyed) { return; }

  args = Array.prototype.slice.call(arguments);
  args[0] = this._namespaceEvent(eventName);

  this._log('emit', args);
  bus.emit.apply(bus, args);
};

BraintreeBus.prototype._offDirect = function (eventName, handler) {
 var args = Array.prototype.slice.call(arguments);

 if (this._isDestroyed) { return; }

 args[0] = this._namespaceEvent(eventName);

 this._log('off', args);
 bus.off.apply(bus, args);
};

BraintreeBus.prototype.off = function (eventName, originalHandler) {
  var i, listener;
  var handler = originalHandler;

  if (this._isDestroyed) { return; }

  if (this.merchantUrl) {
    for (i = 0; i < this._listeners.length; i++) {
      listener = this._listeners[i];

      if (listener.originalHandler === originalHandler) {
        handler = listener.handler;
      }
    }
  }

  this._offDirect.call(this, eventName, handler);
};

BraintreeBus.prototype._namespaceEvent = function (eventName) {
  return ['braintree', this.channel, eventName].join(':');
};

BraintreeBus.prototype.teardown = function () {
  var listener, i;

  for (i = 0; i < this._listeners.length; i++) {
    listener = this._listeners[i];
    this._offDirect(listener.eventName, listener.handler);
  }

  this._listeners.length = 0;

  this._isDestroyed = true;
};

BraintreeBus.prototype._log = function (functionName, args) {
  if (this._isVerbose) {
    console.log(functionName, args);
  }
};

BraintreeBus.events = events;

module.exports = BraintreeBus;

},{"./lib/check-origin":53,"./lib/events":54,"framebus":55}],53:[function(require,module,exports){
'use strict';

var BT_ORIGIN_REGEX = /^https:\/\/([a-zA-Z0-9-]+\.)*(braintreepayments|braintreegateway|paypal)\.com(:\d{1,5})?$/;

function checkOrigin(postMessageOrigin, merchantUrl) {
  var merchantOrigin;
  var merchantHost;
  var a = document.createElement('a');

  a.href = merchantUrl;

  if (a.protocol === 'https:') {
    merchantHost = a.host.replace(/:443$/, '');
  } else if (a.protocol === 'http:') {
    merchantHost = a.host.replace(/:80$/, '');
  } else {
    merchantHost = a.host;
  }

  merchantOrigin = a.protocol + '//' + merchantHost;

  return merchantOrigin === postMessageOrigin || BT_ORIGIN_REGEX.test(postMessageOrigin);
}

module.exports = {
  checkOrigin: checkOrigin
};

},{}],54:[function(require,module,exports){
'use strict';

var eventList = [
  'PAYMENT_METHOD_REQUEST',
  'PAYMENT_METHOD_RECEIVED',
  'PAYMENT_METHOD_GENERATED',
  'PAYMENT_METHOD_NOT_GENERATED',
  'PAYMENT_METHOD_CANCELLED',
  'PAYMENT_METHOD_ERROR',
  'CONFIGURATION_REQUEST',
  'ROOT_METADATA_REQUEST',
  'ERROR',
  'WARNING',
  'UI_POPUP_DID_OPEN',
  'UI_POPUP_DID_CLOSE',
  'UI_POPUP_FORCE_CLOSE',
  'ASYNC_DEPENDENCY_INITIALIZING',
  'ASYNC_DEPENDENCY_READY',
  'USER_FORM_SUBMIT_REQUEST',
  'SEND_ANALYTICS_EVENTS'
];
var eventEnum = {};

for (var i = 0; i < eventList.length; i++) {
  var evnt = eventList[i];
  eventEnum[evnt] = evnt;
}

module.exports = eventEnum;

},{}],55:[function(require,module,exports){
'use strict';
(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.framebus = factory();
  }
})(this, function () {
  var win, framebus;
  var popups = [];
  var subscribers = {};
  var prefix = '/*framebus*/';

  function include(popup) {
    if (popup == null) { return false; }
    if (popup.Window == null) { return false; }
    if (popup.constructor !== popup.Window) { return false; }

    popups.push(popup);
    return true;
  }

  function target(origin) {
    var key;
    var targetedFramebus = {};

    for (key in framebus) {
      if (!framebus.hasOwnProperty(key)) { continue; }

      targetedFramebus[key] = framebus[key];
    }

    targetedFramebus._origin = origin || '*';

    return targetedFramebus;
  }

  function publish(event) {
    var payload, args;
    var origin = _getOrigin(this);

    if (_isntString(event)) { return false; }
    if (_isntString(origin)) { return false; }

    args = Array.prototype.slice.call(arguments, 1);

    payload = _packagePayload(event, args, origin);
    if (payload === false) { return false; }

    _broadcast(win.top, payload, origin);

    return true;
  }

  function subscribe(event, fn) {
    var origin = _getOrigin(this);

    if (_subscriptionArgsInvalid(event, fn, origin)) { return false; }

    subscribers[origin] = subscribers[origin] || {};
    subscribers[origin][event] = subscribers[origin][event] || [];
    subscribers[origin][event].push(fn);

    return true;
  }

  function unsubscribe(event, fn) {
    var i, subscriberList;
    var origin = _getOrigin(this);

    if (_subscriptionArgsInvalid(event, fn, origin)) { return false; }

    subscriberList = subscribers[origin] && subscribers[origin][event];
    if (!subscriberList) { return false; }

    for (i = 0; i < subscriberList.length; i++) {
      if (subscriberList[i] === fn) {
        subscriberList.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  function _getOrigin(scope) {
    return scope && scope._origin || '*';
  }

  function _isntString(string) {
    return typeof string !== 'string';
  }

  function _packagePayload(event, args, origin) {
    var packaged = false;
    var payload = {
      event:  event,
      origin: origin
    };
    var reply = args[args.length - 1];

    if (typeof reply === 'function') {
      payload.reply = _subscribeReplier(reply, origin);
      args = args.slice(0, -1);
    }

    payload.args = args;

    try {
      packaged = prefix + JSON.stringify(payload);
    } catch (e) {
      throw new Error('Could not stringify event: ' + e.message);
    }
    return packaged;
  }

  function _unpackPayload(e) {
    var payload, replyOrigin, replySource, replyEvent;

    if (e.data.slice(0, prefix.length) !== prefix) { return false; }

    try {
      payload = JSON.parse(e.data.slice(prefix.length));
    } catch (err) {
      return false;
    }

    if (payload.reply != null) {
      replyOrigin = e.origin;
      replySource = e.source;
      replyEvent = payload.reply;

      payload.reply = function reply(data) {
        var replyPayload = _packagePayload(replyEvent, [data], replyOrigin);
        if (replyPayload === false) { return false; }

        replySource.postMessage(replyPayload, replyOrigin);
      };

      payload.args.push(payload.reply);
    }

    return payload;
  }

  function _attach(w) {
    if (win) { return; }
    win = w || window;

    if (win.addEventListener) {
      win.addEventListener('message', _onmessage, false);
    } else if (win.attachEvent) {
      win.attachEvent('onmessage', _onmessage);
    } else if (win.onmessage === null) {
      win.onmessage = _onmessage;
    } else {
      win = null;
    }
  }

  function _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
  }

  function _onmessage(e) {
    var payload;
    if (_isntString(e.data)) { return; }

    payload = _unpackPayload(e);
    if (!payload) { return; }

    _dispatch('*', payload.event, payload.args, e);
    _dispatch(e.origin, payload.event, payload.args, e);
    _broadcastPopups(e.data, payload.origin, e.source);
  }

  function _dispatch(origin, event, args, e) {
    var i;
    if (!subscribers[origin]) { return; }
    if (!subscribers[origin][event]) { return; }

    for (i = 0; i < subscribers[origin][event].length; i++) {
      subscribers[origin][event][i].apply(e, args);
    }
  }

  function _broadcast(frame, payload, origin) {
    var i;

    try {
      frame.postMessage(payload, origin);
    } catch (_) { return; }

    if (frame.opener && !frame.opener.closed && frame.opener !== win) {
      _broadcast(frame.opener.top, payload, origin);
    }

    for (i = 0; i < frame.frames.length; i++) {
      _broadcast(frame.frames[i], payload, origin);
    }
  }

  function _broadcastPopups(payload, origin, source) {
    var i, popup;

    for (i = popups.length - 1; i >= 0; i--) {
      popup = popups[i];

      if (popup.closed === true) {
        popups = popups.slice(i, 1);
      } else if (source !== popup) {
        _broadcast(popup.top, payload, origin);
      }
    }
  }

  function _subscribeReplier(fn, origin) {
    var uuid = _uuid();

    function replier(d, o) {
      fn(d, o);
      framebus.target(origin).unsubscribe(uuid, replier);
    }

    framebus.target(origin).subscribe(uuid, replier);
    return uuid;
  }

  function _subscriptionArgsInvalid(event, fn, origin) {
    if (_isntString(event)) { return true; }
    if (typeof fn !== 'function') { return true; }
    if (_isntString(origin)) { return true; }

    return false;
  }

  _attach();

  framebus = {
    target:                   target,
    include:                  include,
    publish:                  publish,
    pub:                      publish,
    trigger:                  publish,
    emit:                     publish,
    subscribe:                subscribe,
    sub:                      subscribe,
    on:                       subscribe,
    unsubscribe:              unsubscribe,
    unsub:                    unsubscribe,
    off:                      unsubscribe
  };

  return framebus;
});

},{}],56:[function(require,module,exports){
'use strict';

var Coinbase = require('./lib/coinbase');

function create(options) {
  return new Coinbase(options);
}

module.exports = {create: create};

},{"./lib/coinbase":59}],57:[function(require,module,exports){
(function (global){
'use strict';

function iOSSafariVersion(userAgent) {
  userAgent = userAgent || global.navigator.userAgent;
  if (!/AppleWebKit\//.test(userAgent)) {
    return null;
  }
  if (!/Mobile\//.test(userAgent)) {
    return null;
  }

  return userAgent.replace(/.* OS ([0-9_]+) like Mac OS X.*/, '$1').replace(/_/g, '.');
}

function ieVersion(userAgent) {
  userAgent = userAgent || global.navigator.userAgent;
  var result = null;
  var match = /MSIE.(\d+)/.exec(userAgent);

  if (/Trident/.test(userAgent)) {
    result = 11;
  }

  if (match) {
    result = parseInt(match[1], 10);
  }

  return result;
}

function androidVersion(UA) {
  UA = UA || global.navigator.userAgent;
  if (!/Android/.test(UA)) { return null; }

  return UA.replace(/^.* Android ([0-9\.]+).*$/,'$1');
}

module.exports = {
  ieVersion: ieVersion,
  iOSSafariVersion: iOSSafariVersion,
  androidVersion: androidVersion
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],58:[function(require,module,exports){
'use strict';

var busEvents = require('braintree-bus').events;

function tokenize(err, payload, coinbase) {
  if (err) {
    // TODO: make payload in line with onError()
    coinbase.bus.emit(busEvents.ERROR, err.error);
    coinbase._sendAnalyticsEvent('generate.nonce.failed');
    return;
  }

  coinbase.bus.emit(busEvents.PAYMENT_METHOD_GENERATED, payload);
  coinbase._sendAnalyticsEvent('generate.nonce.succeeded');
}

module.exports = {tokenize: tokenize};

},{"braintree-bus":67}],59:[function(require,module,exports){
(function (global){
'use strict';

var utils = require('braintree-utilities');
var Destructor = require('destructor');
var DOMComposer = require('./dom/composer');
var urlComposer = require('./url-composer');
var callbacks = require('./callbacks');
var constants = require('./constants');
var detector = require('./detector');
var Bus = require('braintree-bus');

function _getPopupParams(options) {
  return {
    clientId: options.configuration.coinbase.clientId,
    redirectUrl: options.configuration.coinbase.redirectUrl,
    scopes: options.configuration.coinbase.scopes || constants.SCOPES,
    meta: {
      authorizations_merchant_account: options.configuration.coinbase.merchantAccount || ''
    }
  };
}

function _error(bus) {
  return function (message, type) {
    bus.emit(Bus.events.ERROR, {type: type, message: message});
  }
}

function _optionsAreValid(options, bus) {
  var cbOptions = (options || {}).coinbase;
  var busError = _error(bus);

  if (options.apiClient == null) {
    busError('settings.apiClient is required for coinbase', constants.CONFIGURATION_ERROR);
  } else if (!options.configuration.coinbaseEnabled) {
    busError('Coinbase is not enabled for your merchant account', constants.CONFIGURATION_ERROR);
  } else if (!cbOptions || (!cbOptions.container && !cbOptions.button)) {
    busError('Either options.coinbase.container or options.coinbase.button is required for Coinbase integrations', constants.CONFIGURATION_ERROR);
  } else if (cbOptions.container && cbOptions.button) {
    busError('options.coinbase.container and options.coinbase.button are mutually exclusive', constants.CONFIGURATION_ERROR);
  } else if (!detector.isSupportedBrowser()) {
    busError('Coinbase is not supported by your browser. Please consider upgrading', constants.UNSUPPORTED_BROWSER_ERROR);
  } else {
    return true;
  }

  return false;
}

function Coinbase(options) {
  var context, busOptions;

  this.destructor = new Destructor();

  this.channel = options.channel;

  busOptions = {channel: this.channel};

  try {
    if (options.coinbase.container) {
      busOptions.merchantUrl = global.location.href;
    }
  } catch (e) {}

  this.bus = options.bus || new Bus(busOptions);

  this.canCreateIntegration = _optionsAreValid(options, this.bus);
  if (!this.canCreateIntegration) {
    return;
  }

  this.buttonId = options.coinbase.button || constants.BUTTON_ID;
  this.apiClient = options.apiClient;
  this.assetsUrl = options.configuration.assetsUrl;
  this.environment = options.configuration.coinbase.environment;
  this._onOAuthSuccess = utils.bind(this._onOAuthSuccess, this);
  this._handleButtonClick = utils.bind(this._handleButtonClick, this);
  this.popupParams = _getPopupParams(options);
  this.redirectDoneInterval = null;

  if (options.coinbase.container) {
    context = utils.normalizeElement(options.coinbase.container);
    this._insertFrame(context);
  } else {
    global.braintreeCoinbasePopupCallback = this._onOAuthSuccess;

    context = document.body;
    utils.addEventListener(context, 'click', this._handleButtonClick);

    this._sendAnalyticsEvent('initialized');

    this.destructor.registerFunctionForTeardown(utils.bind(function () {
      this._closePopup();
    }, this));

    this.bus.on(constants.TEARDOWN_EVENT, utils.bind(this.destructor.teardown, this.destructor));
  }
}

Coinbase.prototype._sendAnalyticsEvent = function (eventName) {
  var namespace = this.apiClient.integration + '.web.coinbase.';
  this.apiClient.sendAnalyticsEvents(namespace + eventName);
};

Coinbase.prototype._insertFrame = function (container) {
  var frame = DOMComposer.createFrame({channel: this.channel});

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_INITIALIZING);

  container.appendChild(frame);
  this.destructor.registerFunctionForTeardown(function () {
    container.removeChild(frame);
  });

  // Delayed to make sure browser caches are busted.
  setTimeout(utils.bind(function () {
    frame.src = this.assetsUrl + '/coinbase/' + constants.VERSION + '/coinbase-frame.html#' + this.channel;
  }, this), 0);
};

Coinbase.prototype._onOAuthSuccess = function (data) {
  if (!data.code) {
    this._sendAnalyticsEvent('popup.denied');
    this._closePopup();
    return;
  }

  this.bus.emit('coinbase:view:navigate', 'loading');
  this._sendAnalyticsEvent('popup.authorized');

  this.apiClient.tokenizeCoinbase({ code: data.code, query: urlComposer.getQueryString() }, utils.bind(function (err, payload) {
    callbacks.tokenize.apply(null, [err, payload, this]);
  }, this));

  this._closePopup();
};

Coinbase.prototype._clearPollForRedirectDone = function () {
  if (this.redirectDoneInterval) {
    clearInterval(this.redirectDoneInterval);
    this.redirectDoneInterval = null;
  }
};

Coinbase.prototype._closePopup = function (popup) {
  popup = popup || this.popup;

  if (popup == null) { return; }

  if (detector.shouldCloseFromParent()) {
    popup.close();
  }

  this._popupCleanup();
};

Coinbase.prototype._popupCleanup = function () {
  this._clearPollForRedirectDone();
  this.bus.emit(Bus.events.UI_POPUP_DID_CLOSE, {source: constants.INTEGRATION_NAME});
};

Coinbase.prototype._pollForRedirectDone = function (popup) {
  var interval = setInterval(utils.bind(function () {
    var code;

    if (popup == null || popup.closed) {
      this._sendAnalyticsEvent('popup.aborted');
      this._popupCleanup();
      return;
    }

    try {
      if (popup.location.href === 'about:blank') { throw new Error('Not finished loading'); }
      code = utils.decodeQueryString(popup.location.search.replace(/^\?/, '')).code;
    } catch (e) {
      return;
    }

    this._onOAuthSuccess({ code: code });
  }, this), 100);

  this.redirectDoneInterval = interval;
  return interval;
};

Coinbase.prototype._openPopup = function () {
  var popup;

  this._sendAnalyticsEvent('popup.started');

  popup = DOMComposer.createPopup(urlComposer.compose(this._getOAuthBaseUrl(), this.popupParams));
  popup.focus();

  this._pollForRedirectDone(popup);

  this.bus.emit(Bus.events.UI_POPUP_DID_OPEN, {source: constants.INTEGRATION_NAME});
  this.bus.on(Bus.events.UI_POPUP_FORCE_CLOSE, function (payload) {
    if (payload.target === constants.INTEGRATION_NAME) {
      popup.close();
    }
  });

  this.popup = popup;
};

Coinbase.prototype._getOAuthBaseUrl = function () {
  var baseUrl;

  if (this.environment === 'shared_sandbox') {
    baseUrl = constants.SANDBOX_OAUTH_BASE_URL;
  } else {
    baseUrl = constants.PRODUCTION_OAUTH_BASE_URL;
  }

  return baseUrl;
};

Coinbase.prototype._handleButtonClick = function (event) {
  var target = event.target || event.srcElement;

  while (true) {
    if (target == null) { return; }
    if (target === event.currentTarget) { return; }
    if (target.id === this.buttonId) { break; }

    target = target.parentNode;
  }

  if (event && event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }

  this._openPopup();
};

Coinbase.prototype.teardown = function (done) {
  var self = this;

  if (!this.canCreateIntegration) {
    done(null);
    return;
  }

  this.bus.emit(constants.TEARDOWN_EVENT, function () {
    self.destructor.teardown(function (err) {
      if (err) { return done(err); }

      self.bus.teardown();
      done(null);
    });
  });
};

module.exports = Coinbase;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./callbacks":58,"./constants":60,"./detector":61,"./dom/composer":63,"./url-composer":66,"braintree-bus":67,"braintree-utilities":79,"destructor":80}],60:[function(require,module,exports){
'use strict';

module.exports = {
  PRODUCTION_OAUTH_BASE_URL: 'https://coinbase.com',
  SANDBOX_OAUTH_BASE_URL: 'https://sandbox.coinbase.com',
  ORIGIN_URL: 'https://www.coinbase.com',
  FRAME_NAME: 'braintree-coinbase-frame',
  POPUP_NAME: 'coinbase',
  BUTTON_ID: 'bt-coinbase-button',
  SCOPES: 'send',
  VERSION: "0.3.0",
  INTEGRATION_NAME: 'Coinbase',
  CONFIGURATION_ERROR: 'CONFIGURATION',
  UNSUPPORTED_BROWSER_ERROR: 'UNSUPPORTED_BROWSER',
  TEARDOWN_EVENT: 'coinbase:TEARDOWN'
};

},{}],61:[function(require,module,exports){
'use strict';

var browser = require('./browser');

function isSupportedBrowser() {
  var version = browser.ieVersion();
  return !version || (version > 8);
}

function shouldDisplayLollipopClose() {
  var version = browser.androidVersion();
  if (version == null) { return false; }

  return /^5/.test(version);
}

function shouldCloseFromParent() {
  return !(shouldDisplayLollipopClose() || shouldDisplayIOSClose());
}

function shouldDisplayIOSClose() {
  var version = browser.iOSSafariVersion();
  if (version == null) { return false; }

  return /^8\.0/.test(version) || /^8\.1$/.test(version);
}

module.exports = {
  isSupportedBrowser: isSupportedBrowser,
  shouldCloseFromParent: shouldCloseFromParent,
  shouldDisplayIOSClose: shouldDisplayIOSClose,
  shouldDisplayLollipopClose: shouldDisplayLollipopClose
};

},{"./browser":57}],62:[function(require,module,exports){
'use strict';

function createButton(config) {
  var button = document.createElement('button');

  config = config || {};

  button.id = config.id || 'coinbase-button';
  button.style.backgroundColor = config.backgroundColor || '#EEE';
  button.style.color = config.color || '#4597C3';
  button.style.border = config.border || '0';
  button.style.borderRadius = config.borderRadius || '6px';
  button.style.padding = config.padding || '12px';
  button.innerHTML = config.innerHTML || 'coinbase';

  return button;
}

module.exports = { create: createButton };

},{}],63:[function(require,module,exports){
'use strict';

var popup = require('./popup');
var button = require('./button');
var frame = require('./frame');

module.exports = {
  createButton: button.create,
  createPopup: popup.create,
  createFrame: frame.create
};

},{"./button":62,"./frame":64,"./popup":65}],64:[function(require,module,exports){
'use strict';

var constants = require('../constants');
var iframer = require('iframer');

function createFrame(config) {
  return iframer({
    name: constants.FRAME_NAME,
    height: '70px',
    width: '100%',
    style: {
      padding: 0,
      margin: 0,
      border: 0,
      outline: 'none'
    }
  });
}

module.exports = { create: createFrame };

},{"../constants":60,"iframer":83}],65:[function(require,module,exports){
(function (global){
'use strict';

var constants = require('../constants');

function _stringifyParams(payload) {
  var params = [];

  for (var param in payload) {
    if (payload.hasOwnProperty(param)) {
      params.push([param, payload[param]].join('='));
    }
  }

  return params.join(',');
}

function _getParams() {
  var baseWidth = 850;
  var baseHeight = 600;

  return _stringifyParams({
    width: baseWidth,
    height: baseHeight,
    left: (screen.width - baseWidth) / 2,
    top: (screen.height - baseHeight) / 4
  });
}

function createPopup(url) {
  return global.open(url, constants.POPUP_NAME, _getParams());
}

module.exports = { create: createPopup };

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../constants":60}],66:[function(require,module,exports){
'use strict';

var constants = require('./constants');

function getQueryString() {
  return 'version=' + constants.VERSION;
}

function compose(baseUrl, params) {
  var url = baseUrl + '/oauth/authorize?response_type=code';
  var redirectUri = params.redirectUrl + '?' + getQueryString();

  url += '&redirect_uri=' + encodeURIComponent(redirectUri);
  url += '&client_id=' + params.clientId;

  if (params.scopes) {
    url += '&scope=' + encodeURIComponent(params.scopes);
  }

  if (params.meta) {
    for (var key in params.meta) {
      if (params.meta.hasOwnProperty(key)) {
        url += '&meta[' + encodeURIComponent(key) + ']=' + encodeURIComponent(params.meta[key]);
      }
    }
  }

  return url;
}

module.exports = {
  compose: compose,
  getQueryString: getQueryString
};

},{"./constants":60}],67:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"./lib/check-origin":68,"./lib/events":69,"dup":52,"framebus":70}],68:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"dup":53}],69:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"dup":54}],70:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"dup":55}],71:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],72:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],73:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],74:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],75:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],76:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],77:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./array":71,"dup":41}],78:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],79:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./lib/array":71,"./lib/base64":72,"./lib/dom":73,"./lib/events":74,"./lib/fn":75,"./lib/string":76,"./lib/url":77,"./lib/uuid":78,"dup":43}],80:[function(require,module,exports){
'use strict';

var batchExecuteFunctions = require('batch-execute-functions');
// Reach into lib for isFunction. This lib requires a DOM and cannot be
// tested otherwise
var fnUtil = require('braintree-utilities/lib/fn');

function Destructor() {
  this._teardownRegistry = [];
}

Destructor.prototype.registerFunctionForTeardown = function (fn) {
  if (fnUtil.isFunction(fn)) {
    this._teardownRegistry.push(fn);
  }
};

Destructor.prototype.teardown = function (callback) {
  batchExecuteFunctions(this._teardownRegistry, fnUtil.bind(function (err) {
    this._teardownRegistry = [];

    if (fnUtil.isFunction(callback)) {
      callback(err);
    }
  }, this));
};

module.exports = Destructor;

},{"batch-execute-functions":81,"braintree-utilities/lib/fn":82}],81:[function(require,module,exports){
'use strict';

function call(fn, callback) {
  var isSync = fn.length === 0;
  var wrappedCallback;

  if (isSync) {
    fn();
    callback(null);
  } else {
    wrappedCallback = once(callback);
    fn(wrappedCallback);
  }
}

function once(fn) {
  var called = false;
  return function () {
    if (!called) {
      called = true;
      fn.apply(this, arguments);
    }
  };
}

module.exports = function (functions, callback) {
  var length = functions.length;
  var remaining = length;

  if (length === 0) {
    callback(null);
    return;
  }

  for (var i = 0; i < length; i++) {
    call(functions[i], function (err) {
      if (err) {
        callback(err);
        return;
      }

      remaining -= 1;
      if (remaining === 0) {
        callback(null);
      }
    });
  }
};

},{}],82:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],83:[function(require,module,exports){
'use strict';

var assign = require('lodash.assign');
var isString = require('lodash.isstring');
var setAttributes = require('setattributes');
var defaultAttributes = require('./lib/default-attributes');

module.exports = function createFrame(options) {
  var iframe = document.createElement('iframe');
  var config = assign({}, defaultAttributes, options);

  if (config.style && !isString(config.style)) {
    assign(iframe.style, config.style);
    delete config.style;
  }

  setAttributes(iframe, config);

  if (!iframe.getAttribute('id')) {
    iframe.id = iframe.name;
  }

  return iframe;
};

},{"./lib/default-attributes":84,"lodash.assign":85,"lodash.isstring":96,"setattributes":97}],84:[function(require,module,exports){
module.exports={
  "src": "about:blank",
  "frameBorder": 0,
  "allowtransparency": true,
  "scrolling": "no"
}

},{}],85:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseAssign = require('lodash._baseassign'),
    createAssigner = require('lodash._createassigner'),
    keys = require('lodash.keys');

/**
 * A specialized version of `_.assign` for customizing assigned values without
 * support for argument juggling, multiple sources, and `this` binding `customizer`
 * functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {Function} customizer The function to customize assigned values.
 * @returns {Object} Returns `object`.
 */
function assignWith(object, source, customizer) {
  var index = -1,
      props = keys(source),
      length = props.length;

  while (++index < length) {
    var key = props[index],
        value = object[key],
        result = customizer(value, source[key], key, object, source);

    if ((result === result ? (result !== value) : (value === value)) ||
        (value === undefined && !(key in object))) {
      object[key] = result;
    }
  }
  return object;
}

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object. Subsequent sources overwrite property assignments of previous sources.
 * If `customizer` is provided it is invoked to produce the assigned values.
 * The `customizer` is bound to `thisArg` and invoked with five arguments:
 * (objectValue, sourceValue, key, object, source).
 *
 * **Note:** This method mutates `object` and is based on
 * [`Object.assign`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign).
 *
 * @static
 * @memberOf _
 * @alias extend
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
 * // => { 'user': 'fred', 'age': 40 }
 *
 * // using a customizer callback
 * var defaults = _.partialRight(_.assign, function(value, other) {
 *   return _.isUndefined(value) ? other : value;
 * });
 *
 * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
 * // => { 'user': 'barney', 'age': 36 }
 */
var assign = createAssigner(function(object, source, customizer) {
  return customizer
    ? assignWith(object, source, customizer)
    : baseAssign(object, source);
});

module.exports = assign;

},{"lodash._baseassign":86,"lodash._createassigner":88,"lodash.keys":92}],86:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseCopy = require('lodash._basecopy'),
    keys = require('lodash.keys');

/**
 * The base implementation of `_.assign` without support for argument juggling,
 * multiple sources, and `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return source == null
    ? object
    : baseCopy(source, keys(source), object);
}

module.exports = baseAssign;

},{"lodash._basecopy":87,"lodash.keys":92}],87:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property names to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @returns {Object} Returns `object`.
 */
function baseCopy(source, props, object) {
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];
    object[key] = source[key];
  }
  return object;
}

module.exports = baseCopy;

},{}],88:[function(require,module,exports){
/**
 * lodash 3.1.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var bindCallback = require('lodash._bindcallback'),
    isIterateeCall = require('lodash._isiterateecall'),
    restParam = require('lodash.restparam');

/**
 * Creates a function that assigns properties of source object(s) to a given
 * destination object.
 *
 * **Note:** This function is used to create `_.assign`, `_.defaults`, and `_.merge`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return restParam(function(object, sources) {
    var index = -1,
        length = object == null ? 0 : sources.length,
        customizer = length > 2 ? sources[length - 2] : undefined,
        guard = length > 2 ? sources[2] : undefined,
        thisArg = length > 1 ? sources[length - 1] : undefined;

    if (typeof customizer == 'function') {
      customizer = bindCallback(customizer, thisArg, 5);
      length -= 2;
    } else {
      customizer = typeof thisArg == 'function' ? thisArg : undefined;
      length -= (customizer ? 1 : 0);
    }
    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;

},{"lodash._bindcallback":89,"lodash._isiterateecall":90,"lodash.restparam":91}],89:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = bindCallback;

},{}],90:[function(require,module,exports){
/**
 * lodash 3.0.9 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if the provided arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
      ? (isArrayLike(object) && isIndex(index, object.length))
      : (type == 'string' && index in object)) {
    var other = object[index];
    return value === value ? (value === other) : (other !== other);
  }
  return false;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isIterateeCall;

},{}],91:[function(require,module,exports){
/**
 * lodash 3.6.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],92:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48,"lodash._getnative":93,"lodash.isarguments":94,"lodash.isarray":95}],93:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49}],94:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45}],95:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"dup":46}],96:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51}],97:[function(require,module,exports){
module.exports = function setAttributes(element, attributes) {
  var value;

  for (var key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      value = attributes[key];

      if (value == null) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, value);
      }
    }
  }
};

},{}],98:[function(require,module,exports){
arguments[4][2][0].apply(exports,arguments)
},{"./coinbase-account":99,"./constants":100,"./credit-card":101,"./europe-bank-account":102,"./normalize-api-fields":104,"./parse-client-token":105,"./paypal-account":106,"./request/choose-driver":109,"./sepa-mandate":114,"./should-enable-cors":115,"./util":116,"braintree-3ds":125,"braintree-utilities":139,"dup":2}],99:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"dup":3}],100:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],101:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],102:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],103:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"./constants":100,"./parse-client-token":105,"./request/choose-driver":109,"./should-enable-cors":115,"./util":116,"dup":7}],104:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"dup":8}],105:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"./polyfill":107,"braintree-utilities":139,"dup":9}],106:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],107:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],108:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"../constants":100,"../util":116,"./parse-body":112,"./prep-body":113,"dup":12}],109:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"../util":116,"./ajax-driver":108,"./jsonp-driver":110,"dup":13}],110:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"../constants":100,"./jsonp":111,"dup":14}],111:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"../util":116,"dup":15}],112:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],113:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17,"lodash.isstring":147}],114:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],115:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],116:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20,"lodash.isempty":140,"lodash.isobject":146}],117:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./lib/client":98,"./lib/get-configuration":103,"./lib/parse-client-token":105,"./lib/util":116,"dup":21}],118:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],119:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"dup":23}],120:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],121:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],122:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"./lib/dom":118,"./lib/events":119,"./lib/fn":120,"./lib/url":121,"dup":26}],123:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"../shared/receiver":130,"braintree-utilities":122,"dup":27}],124:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"./authorization_service":123,"./loader":126,"braintree-utilities":122,"dup":28}],125:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"./client":124,"dup":29}],126:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"./loader_display":127,"./loader_message":128,"./loader_spinner":129,"dup":30}],127:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"dup":31}],128:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],129:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],130:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"braintree-utilities":122,"dup":34}],131:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],132:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],133:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],134:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],135:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],136:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],137:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./array":131,"dup":41}],138:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],139:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./lib/array":131,"./lib/base64":132,"./lib/dom":133,"./lib/events":134,"./lib/fn":135,"./lib/string":136,"./lib/url":137,"./lib/uuid":138,"dup":43}],140:[function(require,module,exports){
arguments[4][44][0].apply(exports,arguments)
},{"dup":44,"lodash.isarguments":141,"lodash.isarray":142,"lodash.isfunction":143,"lodash.isstring":147,"lodash.keys":144}],141:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45}],142:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"dup":46}],143:[function(require,module,exports){
arguments[4][47][0].apply(exports,arguments)
},{"dup":47}],144:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48,"lodash._getnative":145,"lodash.isarguments":141,"lodash.isarray":142}],145:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49}],146:[function(require,module,exports){
arguments[4][50][0].apply(exports,arguments)
},{"dup":50}],147:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51}],148:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"./lib/check-origin":149,"./lib/events":150,"dup":52,"framebus":151}],149:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"dup":53}],150:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"dup":54}],151:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"dup":55}],152:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"./lib/check-origin":153,"./lib/events":154,"dup":52,"framebus":155}],153:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"dup":53}],154:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"dup":54}],155:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"dup":55}],156:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],157:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],158:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],159:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],160:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],161:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],162:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./array":156,"dup":41}],163:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],164:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./lib/array":156,"./lib/base64":157,"./lib/dom":158,"./lib/events":159,"./lib/fn":160,"./lib/string":161,"./lib/url":162,"./lib/uuid":163,"dup":43}],165:[function(require,module,exports){
arguments[4][80][0].apply(exports,arguments)
},{"batch-execute-functions":166,"braintree-utilities/lib/fn":167,"dup":80}],166:[function(require,module,exports){
arguments[4][81][0].apply(exports,arguments)
},{"dup":81}],167:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],168:[function(require,module,exports){
arguments[4][83][0].apply(exports,arguments)
},{"./lib/default-attributes":169,"dup":83,"lodash.assign":170,"lodash.isstring":181,"setattributes":182}],169:[function(require,module,exports){
arguments[4][84][0].apply(exports,arguments)
},{"dup":84}],170:[function(require,module,exports){
arguments[4][85][0].apply(exports,arguments)
},{"dup":85,"lodash._baseassign":171,"lodash._createassigner":173,"lodash.keys":177}],171:[function(require,module,exports){
arguments[4][86][0].apply(exports,arguments)
},{"dup":86,"lodash._basecopy":172,"lodash.keys":177}],172:[function(require,module,exports){
arguments[4][87][0].apply(exports,arguments)
},{"dup":87}],173:[function(require,module,exports){
arguments[4][88][0].apply(exports,arguments)
},{"dup":88,"lodash._bindcallback":174,"lodash._isiterateecall":175,"lodash.restparam":176}],174:[function(require,module,exports){
arguments[4][89][0].apply(exports,arguments)
},{"dup":89}],175:[function(require,module,exports){
arguments[4][90][0].apply(exports,arguments)
},{"dup":90}],176:[function(require,module,exports){
arguments[4][91][0].apply(exports,arguments)
},{"dup":91}],177:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48,"lodash._getnative":178,"lodash.isarguments":179,"lodash.isarray":180}],178:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49}],179:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45}],180:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"dup":46}],181:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51}],182:[function(require,module,exports){
arguments[4][97][0].apply(exports,arguments)
},{"dup":97}],183:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtil = require('braintree-utilities');
var browser = require('../../shared/util/browser');
var Destructor = require('destructor');
var Bus = require('braintree-bus');
var constants = require('../../shared/constants');
var PopupView = require('./popup-view');
var ModalView = require('./modal-view');

function AppView(options) {
  this.options = options || {};

  this.destructor = new Destructor();

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: this.options.channel
  });

  this.destructor.registerFunctionForTeardown(braintreeUtil.bind(function () {
    this.bus.teardown();
  }, this));

  this._initialize();
}

AppView.prototype._initialize = function () {
  if (browser.isPopupSupported()) {
    this.app = new PopupView({
      src: this._buildUrl(),
      isHermes: this.options.isHermes,
      channel: this.options.channel
    });
  } else {
    this.app = new ModalView({
      src: this._buildUrl(),
      headless: this.options.headless,
      isHermes: this.options.isHermes,
      insertFrameFunction: this.options.insertFrameFunction,
      channel: this.options.channel
    });
  }

  this.destructor.registerFunctionForTeardown(braintreeUtil.bind(function () {
    this.app.teardown();
  }, this));

  this.bus.on(constants.events.CLOSE_APP, braintreeUtil.bind(this.close, this));
  this.bus.on(constants.events.FOCUS_APP, braintreeUtil.bind(this.focus, this));
  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, braintreeUtil.bind(this._handlePaymentMethodGenerated, this));
  this.bus.on(Bus.events.UI_POPUP_FORCE_CLOSE, braintreeUtil.bind(this._handleForceClose, this));
};

AppView.prototype._buildUrl = function () {
  var url = this.options.paypalAssetsUrl;
  url += '/pwpp/';
  url += constants.VERSION;
  url += '/html/braintree-frame.html';
  url += '#' + this.options.channel;

  return url;
};

AppView.prototype.open = function () {
  this.focus();
  this.app.open();
  this.poll();
};

AppView.prototype._handleForceClose = function (event) {
  if (event.target === constants.PAYPAL_INTEGRATION_NAME) {
    this.close();
  }
};

AppView.prototype.close = function () {
  this.app.close();
};

AppView.prototype.focus = function () {
  if (braintreeUtil.isFunction(this.app.focus)) {
    this.app.focus();
  }
};

AppView.prototype.isClosed = function () {
  return this.app.isClosed();
};

AppView.prototype.stopPolling = function () {
  clearInterval(this.pollId);
};

AppView.prototype.poll = function () {
  this.pollId = setInterval(braintreeUtil.bind(function () {
    if (this.isClosed()) {
      this._handleClosed();
    }
  }, this), 100);
};

AppView.prototype._handlePaymentMethodGenerated = function (bundle) {
  if (bundle.type === constants.NONCE_TYPE) {
    this.close();
  }
};

AppView.prototype._handleClosed = function () {
  this.stopPolling();

  this.close();

  if (browser.isPopupSupported()) {
    this.app.el = null;
  }
};

AppView.prototype.teardown = function () {
  this.destructor.teardown();
};

module.exports = AppView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../shared/constants":186,"../../shared/util/browser":191,"./modal-view":184,"./popup-view":185,"braintree-bus":152,"braintree-utilities":164,"destructor":165}],184:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtil = require('braintree-utilities');
var browser = require('../../shared/util/browser');
var constants = require('../../shared/constants');
var Bus = require('braintree-bus');
var iframer = require('iframer');

function ModalView(options) {
  this.options = options || {};
  this.container = document.body;

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  if (this.options.headless) {
    this._open = this._openHeadless;
  } else {
    this._attachBusEvents();
  }

  this._initialize();
}

ModalView.prototype._attachBusEvents = function () {
  this.bus.on(constants.events.OPEN_MODAL, braintreeUtil.bind(this.open, this));
};

ModalView.prototype._initialize = function () {
  var name = this.options.isHermes ? constants.HERMES_FRAME_NAME : constants.FRAME_NAME;

  this.el = iframer({
    src: this.options.src,
    name: name,
    height: this.options.height || '100%',
    width: this.options.width || '100%',
    style: {
      position: browser.isMobile() ? 'absolute' : 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      padding: 0,
      margin: 0,
      border: 0,
      outline: 'none',
      zIndex: 20001,
      background: '#FFFFFF'
    }
  });
};

ModalView.prototype.isClosed = function () {
  return !this.container.contains(this.el);
};

ModalView.prototype._openHeadless = function () {
  this.bus.emit(constants.events.OPEN_MODAL);
};

ModalView.prototype._open = function () {
  if (braintreeUtil.isFunction(this.options.insertFrameFunction)) {
    this.options.insertFrameFunction(this.el.src);
  } else {
    this.container.appendChild(this.el);
  }

  this.bus.emit(constants.events.UI_MODAL_DID_OPEN, {source: constants.PAYPAL_INTEGRATION_NAME});
};

ModalView.prototype.open = function () {
  if (this.isClosed()) {
    this._open();
  }
};

ModalView.prototype.close = function () {
  if (!this.isClosed()) {
    this.container.removeChild(this.el);

    this.bus.emit(constants.events.UI_MODAL_DID_CLOSE, {source: constants.PAYPAL_INTEGRATION_NAME});
  }
};

ModalView.prototype.teardown = function () {
  this.close();
  this.bus.teardown();
};

module.exports = ModalView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../shared/constants":186,"../../shared/util/browser":191,"braintree-bus":152,"braintree-utilities":164,"iframer":168}],185:[function(require,module,exports){
(function (global){
'use strict';

var constants = require('../../shared/constants');
var Bus = require('braintree-bus');
var browser = require('../../shared/useragent/browser');

function PopupView(options) {
  this.options = options;

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: this.options.channel
  });

  if (options.isHermes) {
    this.name = constants.HERMES_POPUP_NAME;
    this.popupHeight = constants.HERMES_POPUP_HEIGHT;
    this.popupWidth = constants.HERMES_POPUP_WIDTH;
  } else {
    this.name = constants.POPUP_NAME;
    this.popupHeight = constants.POPUP_HEIGHT;
    this.popupWidth = constants.POPUP_WIDTH;
  }
}

PopupView.prototype._getPopupOptions = function () {
  return [
    'height=' + this.popupHeight,
    'width=' + this.popupWidth,
    'top=' + this._getTopPosition(),
    'left=' + this._getLeftPosition(),
    constants.POPUP_OPTIONS
  ].join(',');
};

PopupView.prototype._centerPosition = function (windowMetric, popupMetric, offset) {
  return (windowMetric - popupMetric) / 2 + offset;
};

PopupView.prototype._getTopPosition = function () {
  var windowHeight = window.outerHeight || document.documentElement.clientHeight;
  var windowTop = typeof window.screenY === 'undefined' ? window.screenTop : window.screenY;

  return this._centerPosition(windowHeight, this.popupHeight, windowTop);
};

PopupView.prototype._getLeftPosition = function () {
  var windowWidth = window.outerWidth || document.documentElement.clientWidth;
  var windowLeft = typeof window.screenX === 'undefined' ? window.screenLeft : window.screenX;

  return this._centerPosition(windowWidth, this.popupWidth, windowLeft);
};

PopupView.prototype.isClosed = function () {
  if (this.el) {
    return this.el.closed;
  }
};

PopupView.prototype.open = function () {
  if (!this.el) {
    this.el = window.open(this.options.src, this.name, this._getPopupOptions());
    this.focus();

    this.bus.emit(Bus.events.UI_POPUP_DID_OPEN, {source: constants.PAYPAL_INTEGRATION_NAME});
  }
};

PopupView.prototype.close = function () {
  if (this.el) {
    if (browser.isIE8() && !this.isClosed() || !browser.isIE8()) {
      this.el.close();
    }

    this.bus.emit(Bus.events.UI_POPUP_DID_CLOSE, {source: constants.PAYPAL_INTEGRATION_NAME});
  }
};

PopupView.prototype.focus = function () {
  if (this.el) {
    this.el.focus();
  }
};

PopupView.prototype.teardown = function () {
  this.close();
  this.bus.teardown();
};

module.exports = PopupView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../shared/constants":186,"../../shared/useragent/browser":187,"braintree-bus":152}],186:[function(require,module,exports){
'use strict';

var i;
var version = "1.6.0";
var events = [
  'GET_CLIENT_TOKEN',
  'GET_CLIENT_OPTIONS',
  'OPEN_MODAL',
  'CLOSE_APP',
  'FOCUS_APP',
  'UI_MODAL_DID_OPEN',
  'UI_MODAL_DID_CLOSE'
];

exports.VERSION = version;
exports.POPUP_NAME = 'braintree_paypal_popup';
exports.HERMES_POPUP_NAME = 'PPFrameRedirect';
exports.FRAME_NAME = 'braintree-paypal-frame';
exports.HERMES_FRAME_NAME = 'PPFrameRedirect';
exports.POPUP_PATH = '/pwpp/' + version + '/html/braintree-frame.html';
exports.POPUP_OPTIONS = 'resizable,scrollbars';
exports.POPUP_HEIGHT = 470;
exports.POPUP_WIDTH = 410;
exports.HERMES_POPUP_HEIGHT = 535;
exports.HERMES_POPUP_WIDTH = 450;
exports.BRIDGE_FRAME_NAME = 'bt-proxy-frame';
exports.HERMES_SUPPORTED_CURRENCIES = ['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'DKK', 'NOK', 'PLN', 'SEK', 'CHF', 'TRY'];
exports.HERMES_SUPPORTED_COUNTRIES = ['US', 'GB', 'AU', 'CA', 'ES', 'FR', 'DE', 'IT', 'NL', 'NO', 'PL', 'CH', 'TR', 'DK', 'BE', 'AT'];
exports.NONCE_TYPE = 'PayPalAccount';
exports.PAYPAL_INTEGRATION_NAME = 'PayPal';
exports.ILLEGAL_XHR_ERROR = 'Illegal XHR request attempted';
exports.events = {};

for (i = 0; i < events.length; i++) {
  exports.events[events[i]] = 'paypal:' + events[i];
}

},{}],187:[function(require,module,exports){
'use strict';

var userAgent = require('./useragent');
var platform = require('./platform');

function isAndroid() {
  return userAgent.matchUserAgent('Android') && !isChrome();
}

function isChrome() {
  return userAgent.matchUserAgent('Chrome') || userAgent.matchUserAgent('CriOS');
}

function isFirefox() {
  return userAgent.matchUserAgent('Firefox');
}

function isIE() {
  return userAgent.matchUserAgent('Trident') || userAgent.matchUserAgent('MSIE');
}

function isIE8() {
  return userAgent.matchUserAgent(/MSIE 8\.0/);
}

function isOpera() {
  return userAgent.matchUserAgent('Opera') || userAgent.matchUserAgent('OPR');
}

function isOperaMini() {
  return isOpera() && Object.prototype.toString.call(window.operamini) === '[object OperaMini]';
}

function isSafari() {
  return userAgent.matchUserAgent('Safari') && !isChrome() && !isAndroid();
}

function isIosWebView() {
  return platform.isIos() && !isChrome() && !isSafari();
}

function isAndroidWebView() {
  var androidWebviewRegExp = /Version\/[\w\.]+ Chrome\/[\w\.]+ Mobile/;
  return platform.isAndroid() && userAgent.matchUserAgent(androidWebviewRegExp);
}

module.exports = {
  isAndroid: isAndroid,
  isChrome: isChrome,
  isFirefox: isFirefox,
  isIE: isIE,
  isIE8: isIE8,
  isOpera: isOpera,
  isOperaMini: isOperaMini,
  isSafari: isSafari,
  isIosWebView: isIosWebView,
  isAndroidWebView: isAndroidWebView
};

},{"./platform":189,"./useragent":190}],188:[function(require,module,exports){
'use strict';

var userAgent = require('./useragent');
var platform = require('./platform');

function isMobile() {
  return !isTablet() &&
      (platform.isAndroid() || platform.isIpod() || platform.isIphone() ||
       userAgent.matchUserAgent('IEMobile'));
}

function isTablet() {
  return platform.isIpad() || platform.isAndroid() &&
      !userAgent.matchUserAgent('Mobile');
}

function isDesktop() {
  return !isMobile() && !isTablet();
}

module.exports = {
  isMobile: isMobile,
  isTablet: isTablet,
  isDesktop: isDesktop
};

},{"./platform":189,"./useragent":190}],189:[function(require,module,exports){
'use strict';

var userAgent = require('./useragent');

function isAndroid() {
  return userAgent.matchUserAgent('Android');
}

function isIpad() {
  return userAgent.matchUserAgent('iPad');
}

function isIpod() {
  return userAgent.matchUserAgent('iPod');
}

function isIphone() {
  return userAgent.matchUserAgent('iPhone') && !isIpod();
}

function isIos() {
  return isIpad() || isIpod() || isIphone();
}

module.exports = {
  isAndroid: isAndroid,
  isIpad: isIpad,
  isIpod: isIpod,
  isIphone: isIphone,
  isIos: isIos
};

},{"./useragent":190}],190:[function(require,module,exports){
'use strict';

var nativeUserAgent = window.navigator.userAgent;

function getNativeUserAgent() {
  return nativeUserAgent;
}

function matchUserAgent(pattern) {
  var userAgent = exports.getNativeUserAgent();
  var matches = userAgent.match(pattern);
  if (matches) {
    return true;
  }
  return false;
}

exports.getNativeUserAgent = getNativeUserAgent;
exports.matchUserAgent = matchUserAgent;

},{}],191:[function(require,module,exports){
'use strict';

var browser = require('../useragent/browser');
var device = require('../useragent/device');
var platform = require('../useragent/platform');
var userAgent = require('../useragent/useragent');

var uaString = window.navigator.userAgent;
var mobileRe = /[Mm]obi|tablet|iOS|Android|IEMobile|Windows\sPhone/;

function isMobile() {
  return isMobileDevice() && window.outerWidth < 600;
}

function isMobileDevice() {
  return mobileRe.test(uaString);
}

function detectedPostMessage() {
  return !!window.postMessage;
}

function isPopupSupported() {
  if (browser.isOperaMini()) {
    return false;
  }

  if (device.isDesktop()) {
    return true;
  }

  if (device.isMobile() || device.isTablet()) {
    if (browser.isIE()) {
      return false;
    }

    if (platform.isAndroid()) {
      if (browser.isAndroidWebView()) {
        return false;
      }

      return true;
    }

    if (platform.isIos()) {
      // Chrome, Safari Versions 8.0-8.1, or WebViews
      if (browser.isChrome()) {
        return false;
      }

      if (browser.isSafari() && userAgent.matchUserAgent(/OS (?:8_1|8_0|8)(?!_\d)/i)) {
        return false;
      }

      if (browser.isIosWebView()) {
        return false;
      }

      return true;
    }
  }

  return false;
}

function isOverlaySupported() {
  if (browser.isIE8()) {
    return false;
  }

  try {
    return window.self === window.top;
  } catch (e) {
    return false;
  }
}

function isBridgeIframeRequired() {
  return browser.isIE();
}

function isMetroBrowser() {
  var supported = null;
  var errorName = '';

  try {
    new ActiveXObject(''); // eslint-disable-line
  } catch (e) {
    errorName = e.name;
  }

  try {
    supported = !!new ActiveXObject('htmlfile');
  } catch (e) {
    supported = false;
  }

  if (errorName !== 'ReferenceError' && supported === false) {
    supported = false;
  } else {
    supported = true;
  }
  return !supported;
}

module.exports = {
  isMobile: isMobile,
  isMobileDevice: isMobileDevice,
  detectedPostMessage: detectedPostMessage,
  isPopupSupported: isPopupSupported,
  isOverlaySupported: isOverlaySupported,
  isBridgeIframeRequired: isBridgeIframeRequired,
  isMetroBrowser: isMetroBrowser
};

},{"../useragent/browser":187,"../useragent/device":188,"../useragent/platform":189,"../useragent/useragent":190}],192:[function(require,module,exports){
'use strict';

var utils = require('braintree-utilities');

function MessageBus(host, channel) {
  this.host = host || window;
  this.channel = channel || null;
  this.handlers = [];

  utils.addEventListener(this.host, 'message', utils.bind(this.receive, this));
}

MessageBus.prototype.receive = function (event) {
  var i, message, parsed, type;

  try {
    parsed = JSON.parse(event.data);
  } catch (e) {
    return;
  }

  type = parsed.type;
  message = new MessageBus.Message(this, event.source, parsed.data);

  for (i = 0; i < this.handlers.length; i++) {
    if (this.handlers[i].type === type) {
      this.handlers[i].handler(message);
    }
  }
};

MessageBus.prototype.send = function (source, type, data) {
  source.postMessage(JSON.stringify({
    type: this._namespaceEvent(type),
    data: data
  }), '*');
};

MessageBus.prototype.register = function (type, handler) {
  this.handlers.push({
    type: this._namespaceEvent(type),
    handler: handler
  });
};

MessageBus.prototype.unregister = function (type, handler) {
  for (var i = this.handlers.length - 1; i >= 0; i--) {
    if (this.handlers[i].type === type && this.handlers[i].handler === handler) {
      return this.handlers.splice(i, 1);
    }
  }
};

MessageBus.prototype._namespaceEvent = function (eventName) {
  return this.channel ? ['braintree', this.channel, eventName].join(':') : eventName;
};

MessageBus.Message = function (bus, source, content) {
  this.bus = bus;
  this.source = source;
  this.content = content;
};

MessageBus.Message.prototype.reply = function (type, data) {
  this.bus.send(this.source, type, data);
};

module.exports = MessageBus;

},{"braintree-utilities":206}],193:[function(require,module,exports){
'use strict';

var utils = require('braintree-utilities');

function PubsubClient(bus, target) {
  this.bus = bus;
  this.target = target;
  this.handlers = [];

  this.bus.register('publish', utils.bind(this._handleMessage, this));
}

PubsubClient.prototype._handleMessage = function (message) {
  var i,
  content = message.content,
  handlers = this.handlers[content.channel];

  if (typeof handlers !== 'undefined') {
    for (i = 0; i < handlers.length; i++) {
      handlers[i](content.data);
    }
  }
};

PubsubClient.prototype.publish = function (channel, data) {
  this.bus.send(this.target, 'publish', { channel: channel, data: data });
};

PubsubClient.prototype.subscribe = function (channel, handler) {
  this.handlers[channel] = this.handlers[channel] || [];
  this.handlers[channel].push(handler);
};

PubsubClient.prototype.unsubscribe = function (channel, handler) {
  var i,
  handlers = this.handlers[channel];

  if (typeof handlers !== 'undefined') {
    for (i = 0; i < handlers.length; i++) {
      if (handlers[i] === handler) {
        handlers.splice(i, 1);
      }
    }
  }
};

module.exports = PubsubClient;

},{"braintree-utilities":206}],194:[function(require,module,exports){
'use strict';

function PubsubServer(bus) {
  this.bus = bus;
  this.frames = [];
  this.handlers = [];
}

PubsubServer.prototype.subscribe = function (channel, handler) {
  this.handlers[channel] = this.handlers[channel] || [];
  this.handlers[channel].push(handler);
};

PubsubServer.prototype.registerFrame = function (frame) {
  this.frames.push(frame);
};

PubsubServer.prototype.unregisterFrame = function (frame) {
  for (var i = 0; i < this.frames.length; i++) {
    if (this.frames[i] === frame) {
      this.frames.splice(i, 1);
    }
  }
};

PubsubServer.prototype.publish = function (channel, data) {
  var i,
  handlers = this.handlers[channel];

  if (typeof handlers !== 'undefined') {
    for (i = 0; i < handlers.length; i++) {
      handlers[i](data);
    }
  }

  for (i = 0; i < this.frames.length; i++) {
    this.bus.send(this.frames[i], 'publish', {
      channel: channel,
      data: data
    });
  }
};

PubsubServer.prototype.unsubscribe = function (channel, handler) {
  var i,
  handlers = this.handlers[channel];

  if (typeof handlers !== 'undefined') {
    for (i = 0; i < handlers.length; i++) {
      if (handlers[i] === handler) {
        handlers.splice(i, 1);
      }
    }
  }
};

module.exports = PubsubServer;

},{}],195:[function(require,module,exports){
'use strict';

var utils = require('braintree-utilities');

function RPCClient(bus, target) {
  this.bus = bus;
  this.target = target || window.parent;
  this.counter = 0;
  this.callbacks = {};

  this.bus.register('rpc_response', utils.bind(this._handleResponse, this));
}

RPCClient.prototype._handleResponse = function (message) {
  var content = message.content,
  thisCallback = this.callbacks[content.id];

  if (typeof thisCallback === 'function') {
    thisCallback.apply(null, content.response);
    delete this.callbacks[content.id];
  }
};

RPCClient.prototype.invoke = function (method, args, callback) {
  var counter = this.counter++;

  this.callbacks[counter] = callback;
  this.bus.send(this.target, 'rpc_request', { id: counter, method: method, args: args });
};

module.exports = RPCClient;

},{"braintree-utilities":206}],196:[function(require,module,exports){
'use strict';

var utils = require('braintree-utilities');

function RPCServer(bus) {
  this.bus = bus;
  this.methods = {};

  this.bus.register('rpc_request', utils.bind(this._handleRequest, this));
}

RPCServer.prototype._handleRequest = function (message) {
  var reply,
  content = message.content,
  args = content.args || [],
  thisMethod = this.methods[content.method];

  if (typeof thisMethod === 'function') {
    reply = function () {
      message.reply('rpc_response', {
        id: content.id,
        response: Array.prototype.slice.call(arguments)
      });
    };

    args.push(reply);

    thisMethod.apply(null, args);
  }
};

RPCServer.prototype.reset = function () {
  this.methods = {};
};

RPCServer.prototype.define = function (method, handler) {
  this.methods[method] = handler;
};

module.exports = RPCServer;

},{"braintree-utilities":206}],197:[function(require,module,exports){
var MessageBus = require('./lib/message-bus');
var PubsubClient = require('./lib/pubsub-client');
var PubsubServer = require('./lib/pubsub-server');
var RPCClient = require('./lib/rpc-client');
var RPCServer = require('./lib/rpc-server');

module.exports = {
  MessageBus: MessageBus,
  PubsubClient: PubsubClient,
  PubsubServer: PubsubServer,
  RPCClient: RPCClient,
  RPCServer: RPCServer
};

},{"./lib/message-bus":192,"./lib/pubsub-client":193,"./lib/pubsub-server":194,"./lib/rpc-client":195,"./lib/rpc-server":196}],198:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],199:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],200:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],201:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],202:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],203:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],204:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./array":198,"dup":41}],205:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],206:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./lib/array":198,"./lib/base64":199,"./lib/dom":200,"./lib/events":201,"./lib/fn":202,"./lib/string":203,"./lib/url":204,"./lib/uuid":205,"dup":43}],207:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],208:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],209:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],210:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],211:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],212:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],213:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./array":207,"dup":41}],214:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],215:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./lib/array":207,"./lib/base64":208,"./lib/dom":209,"./lib/events":210,"./lib/fn":211,"./lib/string":212,"./lib/url":213,"./lib/uuid":214,"dup":43}],216:[function(require,module,exports){
arguments[4][80][0].apply(exports,arguments)
},{"batch-execute-functions":217,"braintree-utilities/lib/fn":218,"dup":80}],217:[function(require,module,exports){
arguments[4][81][0].apply(exports,arguments)
},{"dup":81}],218:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],219:[function(require,module,exports){
(function (global){
'use strict';

function FormNapper(form) {
  if (typeof form === 'string' || form instanceof String) {
    form = document.getElementById(form);
  }

  if (form instanceof HTMLFormElement) {
    this.htmlForm = form;
  } else {
    throw new TypeError('FormNapper requires an HTMLFormElement element or the id string of one.');
  }
}

FormNapper.prototype.hijack = function (onsubmit) {
  if (this.submitHandler) { return; }

  this.submitHandler = function (event) {
    if (event.preventDefault) {
      event.preventDefault();
    } else {
      event.returnValue = false;
    }

    onsubmit(event);
  };

  if (global.addEventListener != null) {
    this.htmlForm.addEventListener('submit', this.submitHandler, false);
  } else if (global.attachEvent != null) {
    this.htmlForm.attachEvent('onsubmit', this.submitHandler);
  } else {
    this.htmlForm.onsubmit = this.submitHandler;
  }
};

FormNapper.prototype.inject = function (name, value) {
  var input = this.htmlForm.querySelector('input[name="' + name + '"]');

  if (input == null) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    this.htmlForm.appendChild(input);
  }

  input.value = value;

  return input;
};

FormNapper.prototype.submit = function () {
  HTMLFormElement.prototype.submit.call(this.htmlForm);
};

FormNapper.prototype.detach = function () {
  if (!this.submitHandler) { return; }

  if (global.removeEventListener != null) {
    this.htmlForm.removeEventListener('submit', this.submitHandler, false);
  } else if (global.detachEvent != null) {
    this.htmlForm.detachEvent('onsubmit', this.submitHandler);
  } else {
    this.htmlForm.onsubmit = null;
  }

  delete this.submitHandler;
};

module.exports = FormNapper;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],220:[function(require,module,exports){
arguments[4][83][0].apply(exports,arguments)
},{"./lib/default-attributes":221,"dup":83,"lodash.assign":222,"lodash.isstring":233,"setattributes":234}],221:[function(require,module,exports){
arguments[4][84][0].apply(exports,arguments)
},{"dup":84}],222:[function(require,module,exports){
arguments[4][85][0].apply(exports,arguments)
},{"dup":85,"lodash._baseassign":223,"lodash._createassigner":225,"lodash.keys":229}],223:[function(require,module,exports){
arguments[4][86][0].apply(exports,arguments)
},{"dup":86,"lodash._basecopy":224,"lodash.keys":229}],224:[function(require,module,exports){
arguments[4][87][0].apply(exports,arguments)
},{"dup":87}],225:[function(require,module,exports){
arguments[4][88][0].apply(exports,arguments)
},{"dup":88,"lodash._bindcallback":226,"lodash._isiterateecall":227,"lodash.restparam":228}],226:[function(require,module,exports){
arguments[4][89][0].apply(exports,arguments)
},{"dup":89}],227:[function(require,module,exports){
arguments[4][90][0].apply(exports,arguments)
},{"dup":90}],228:[function(require,module,exports){
arguments[4][91][0].apply(exports,arguments)
},{"dup":91}],229:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48,"lodash._getnative":230,"lodash.isarguments":231,"lodash.isarray":232}],230:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49}],231:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45}],232:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"dup":46}],233:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51}],234:[function(require,module,exports){
arguments[4][97][0].apply(exports,arguments)
},{"dup":97}],235:[function(require,module,exports){
'use strict';

var RPC_METHOD_NAMES = ['getCreditCards', 'unlockCreditCard', 'sendAnalyticsEvents'];

function APIProxyServer(apiClient) {
  this.apiClient = apiClient;
}

APIProxyServer.prototype.attach = function (rpcServer) {
  var self = this;
  var i = 0;
  var len = RPC_METHOD_NAMES.length;

  function attachDefine(name) {
    rpcServer.define(name, function () {
      self.apiClient[name].apply(self.apiClient, arguments);
    });
  }

  for (i; i < len; i++) {
    attachDefine(RPC_METHOD_NAMES[i]);
  }
};

module.exports = APIProxyServer;

},{}],236:[function(require,module,exports){
(function (global){
'use strict';

var htmlNode, bodyNode;
var api = require('braintree-api');
var BraintreeBus = require('braintree-bus');
var Destructor = require('destructor');
var rpc = require('braintree-rpc');
var utils = require('braintree-utilities');
var normalizeElement = utils.normalizeElement;
var bind = utils.bind;
var isBrowserHttps = utils.isBrowserHttps;
var APIProxyServer = require('./api-proxy-server');
var MerchantFormManager = require('./merchant-form-manager');
var FrameContainer = require('./frame-container');
var constants = require('../shared/constants');
var version = "1.9.0";
var PayPalModalView = require('braintree-paypal/src/external/views/app-view');

function getElementStyle(element, style) {
  var computedStyle = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;

  return computedStyle[style];
}

function getMerchantPageDefaultStyles() {
  return {
    html: {
      height: htmlNode.style.height || '',
      overflow: getElementStyle(htmlNode, 'overflow'),
      position: getElementStyle(htmlNode, 'position')
    },
    body: {
      height: bodyNode.style.height || '',
      overflow: getElementStyle(bodyNode, 'overflow')
    }
  };
}

function isMobile() {
  var isMobileUserAgent = /Android|iPhone|iPod|iPad/i.test(window.navigator.userAgent);
  return isMobileUserAgent;
}

function Client(settings) {
  var inlineFramePath, modalFramePath, formElement;

  this.channel = settings.channel;
  this.destructor = new Destructor();
  this.merchantConfiguration = settings.merchantConfiguration;
  this.encodedClientToken = settings.gatewayConfiguration;
  this.analyticsConfiguration = settings.analyticsConfiguration;
  this.paypalOptions = settings.merchantConfiguration.paypal || {};
  this.container = null;
  this.merchantFormManager = null;
  this.root = settings.root;
  this.configurationRequests = [];
  this.braintreeApiClient = api.configure({
    clientToken: settings.gatewayConfiguration,
    analyticsConfiguration: this.analyticsConfiguration,
    integration: 'dropin',
    enableCORS: this.merchantConfiguration.enableCORS
  });

  this.paymentMethodNonceReceivedCallback = settings.merchantConfiguration.paymentMethodNonceReceived;
  this.clientToken = api.parseClientToken(settings.gatewayConfiguration);

  this.braintreeBus = new BraintreeBus({
    merchantUrl: global.location.href,
    channel: settings.channel
  });

  this.bus = new rpc.MessageBus(this.root, this.channel);
  this.rpcServer = new rpc.RPCServer(this.bus);
  this.apiProxyServer = new APIProxyServer(this.braintreeApiClient);

  this.apiProxyServer.attach(this.rpcServer);

  inlineFramePath = settings.inlineFramePath || this.clientToken.assetsUrl + '/dropin/' + version + '/inline-frame.html';
  modalFramePath = settings.modalFramePath || this.clientToken.assetsUrl + '/dropin/' + version + '/modal-frame.html';
  htmlNode = document.documentElement;
  bodyNode = document.body;

  this.frames = {
    inline: this._createFrame(inlineFramePath, constants.INLINE_FRAME_NAME),
    modal: this._createFrame(modalFramePath, constants.MODAL_FRAME_NAME)
  };

  this.container = normalizeElement(settings.merchantConfiguration.container, 'Unable to find valid container.');

  formElement = normalizeElement(settings.merchantConfiguration.form || this._findClosest(this.container, 'form'));

  this.merchantFormManager = new MerchantFormManager({
    form: formElement,
    frames: this.frames,
    onSubmit: this.paymentMethodNonceReceivedCallback,
    apiClient: this.braintreeApiClient
  }).initialize();

  this.destructor.registerFunctionForTeardown(bind(function () {
    this.merchantFormManager.teardown();
  }, this));

  if (settings.gatewayConfiguration.paypalEnabled) {
    this._configurePayPal();
  }

  this.braintreeApiClient.sendAnalyticsEvents('dropin.web.initialized');
}

Client.prototype.initialize = function () {
  var i;
  var self = this;

  this._initializeModal();

  this.braintreeBus.emit(BraintreeBus.events.ASYNC_DEPENDENCY_INITIALIZING);
  this.container.appendChild(this.frames.inline.element);
  bodyNode.appendChild(this.frames.modal.element);

  this.destructor.registerFunctionForTeardown(function (done) {
    self._hideModal(function () {
      self.container.removeChild(self.frames.inline.element);
      bodyNode.removeChild(self.frames.modal.element);

      done();
    });
  });

  this.rpcServer.define('receiveSharedCustomerIdentifier', function (sharedCustomerIdentifier) {
    self.braintreeApiClient.attrs.sharedCustomerIdentifier = sharedCustomerIdentifier;
    self.braintreeApiClient.attrs.sharedCustomerIdentifierType = 'browser_session_cookie_store';

    for (i = 0; i < self.configurationRequests.length; i++) {
      self.configurationRequests[i](self.encodedClientToken);
    }

    self.configurationRequests = [];
  });

  this.braintreeBus.on(BraintreeBus.events.PAYMENT_METHOD_GENERATED, bind(this._handleAltPayData, this));

  this.rpcServer.define('getConfiguration', function (reply) {
    reply({
      enableCORS: self.merchantConfiguration.enableCORS,
      clientToken: self.encodedClientToken,
      paypalOptions: self.paypalOptions,
      analyticsConfiguration: self.analyticsConfiguration,
      merchantHttps: isBrowserHttps()
    });
  });

  this.rpcServer.define('selectPaymentMethod', function (paymentMethods) {
    self.frames.modal.rpcClient.invoke('selectPaymentMethod', [paymentMethods]);
    self._showModal();
  });

  this.rpcServer.define('sendAddedPaymentMethod', function (paymentMethod) {
    self.merchantFormManager.setNoncePayload(paymentMethod);

    self.frames.inline.rpcClient.invoke('receiveNewPaymentMethod', [paymentMethod]);
  });

  this.rpcServer.define('sendUsedPaymentMethod', function (paymentMethod) {
    self.frames.inline.rpcClient.invoke('selectPaymentMethod', [paymentMethod]);
  });

  this.rpcServer.define('sendUnlockedNonce', function (paymentMethod) {
    self.merchantFormManager.setNoncePayload(paymentMethod);
  });

  this.rpcServer.define('clearNonce', function () {
    self.merchantFormManager.clearNoncePayload();
  });

  this.rpcServer.define('closeDropInModal', function () {
    self._hideModal();
  });

  this.rpcServer.define('setInlineFrameHeight', function (height) {
    self.frames.inline.element.style.height = height + 'px';
  });

  this.bus.register('ready', function (message) {
    if (message.source === self.frames.inline.element.contentWindow) {
      self.frames.inline.rpcClient = new rpc.RPCClient(self.bus, message.source);
    } else if (message.source === self.frames.modal.element.contentWindow) {
      self.frames.modal.rpcClient = new rpc.RPCClient(self.bus, message.source);
    }
  });
};

Client.prototype._createFrame = function (endpoint, name) {
  return new FrameContainer(endpoint, name, this.braintreeBus);
};

Client.prototype._initializeModal = function () {
  this.frames.modal.element.style.display = 'none';
  this.frames.modal.element.style.position = isMobile() ? 'absolute' : 'fixed';
  this.frames.modal.element.style.top = '0';
  this.frames.modal.element.style.left = '0';
  this.frames.modal.element.style.height = '100%';
  this.frames.modal.element.style.width = '100%';
};

Client.prototype._lockMerchantWindowSize = function () {
  setTimeout(function () {
    htmlNode.style.overflow = 'hidden';
    bodyNode.style.overflow = 'hidden';
    bodyNode.style.height = '100%';

    if (isMobile()) {
      htmlNode.style.position = 'relative';
      htmlNode.style.height = window.innerHeight + 'px';
    }
  }, 160);
};

Client.prototype._unlockMerchantWindowSize = function () {
  var defaultStyles = this.merchantPageDefaultStyles;

  if (!defaultStyles) { return; }

  bodyNode.style.height = defaultStyles.body.height;
  bodyNode.style.overflow = defaultStyles.body.overflow;

  htmlNode.style.overflow = defaultStyles.html.overflow;

  if (isMobile()) {
    htmlNode.style.height = defaultStyles.html.height;
    htmlNode.style.position = defaultStyles.html.position;
  }

  delete this.merchantPageDefaultStyles;
};

Client.prototype._showModal = function () {
  var self = this;
  var el = this.frames.modal.element;

  this.merchantPageDefaultStyles = getMerchantPageDefaultStyles();

  el.style.display = 'block';

  this.frames.modal.rpcClient.invoke('open', [], function () {
    setTimeout(function () {
      self._lockMerchantWindowSize();
      el.contentWindow.focus();
    }, 200);
  });
};

Client.prototype._hideModal = function (done) {
  this._unlockMerchantWindowSize();
  this.frames.modal.element.style.display = 'none';

  if (done) {
    done();
  }
};

Client.prototype._configurePayPal = function () {
  this.paypalModalView = new PayPalModalView({
    channel: this.channel,
    insertFrameFunction: this.paypalOptions.insertFrame,
    paypalAssetsUrl: this.clientToken.paypal.assetsUrl,
    isHermes: !!this.paypalOptions.singleUse && !!this.paypalOptions.amount && !!this.paypalOptions.currency
  });
};

Client.prototype._handleAltPayData = function (payload) {
  this.merchantFormManager.setNoncePayload(payload);
  this.frames.inline.rpcClient.invoke('receiveNewPaymentMethod', [payload]);
  this.frames.modal.rpcClient.invoke('modalViewClose');
};

Client.prototype._findClosest = function (node, tagName) {
  tagName = tagName.toUpperCase();

  do {
    if (node.nodeName === tagName) {
      return node;
    }
  } while (node = node.parentNode);

  throw 'Unable to find a valid ' + tagName;
};

Client.prototype.teardown = function (done) {
  if (this.paypalModalView) {
    this.paypalModalView.teardown();
  }

  this.braintreeBus.emit(constants.MODAL_FRAME_TEARDOWN_EVENT, bind(function () {
    this.braintreeBus.emit(constants.INLINE_FRAME_TEARDOWN_EVENT, bind(function () {
      this.destructor.teardown(bind(function (err) {
        if (err) { return done(err); }

        this.braintreeBus.teardown();
        done();
      }, this));
    }, this));
  }, this));
};

module.exports = Client;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../shared/constants":240,"./api-proxy-server":235,"./frame-container":238,"./merchant-form-manager":239,"braintree-api":117,"braintree-bus":148,"braintree-paypal/src/external/views/app-view":183,"braintree-rpc":197,"braintree-utilities":215,"destructor":216}],237:[function(require,module,exports){
'use strict';

var Client = require('./client');
var VERSION = "1.9.0";

function create(options) {
  var client = new Client(options);
  client.initialize();

  return client;
}

module.exports = {
  create: create,
  VERSION: VERSION
};

},{"./client":236}],238:[function(require,module,exports){
'use strict';

var BraintreeBus = require('braintree-bus');
var constants = require('../shared/constants');
var iFramer = require('iframer');

// TODO: move to shared and deduplicate from src/internal/util/dropin-util.js
var TRANSITION_END_EVENT_NAMES = {
  transition: 'transitionend',
  '-o-transition': 'otransitionEnd',
  '-moz-transition': 'transitionend',
  '-webkit-transition': 'webkitTransitionEnd'
};

function getTransitionEndEventName() {
  var eventName;
  var fakeEl = document.createElement('fakeelement');

  for (eventName in TRANSITION_END_EVENT_NAMES) {
    if (typeof fakeEl.style[eventName] !== 'undefined') {
      return TRANSITION_END_EVENT_NAMES[eventName];
    }
  }
  return null;
}

function listenForReady(el, braintreeBus) {
  var transitionEndEvent = getTransitionEndEventName();

  function handler(event) {
    if (event.target === el && event.propertyName === 'height') {
      braintreeBus.emit(BraintreeBus.events.ASYNC_DEPENDENCY_READY);
      el.removeEventListener(transitionEndEvent, handler);
    }
  }

  if (transitionEndEvent) {
    el.addEventListener(transitionEndEvent, handler);
  } else {
    setTimeout(function () {
      braintreeBus.emit(BraintreeBus.events.ASYNC_DEPENDENCY_READY);
    }, 500);
  }
}

function FrameContainer(endpoint, name, braintreeBus) {
  var transition = 'height 210ms cubic-bezier(0.390, 0.575, 0.565, 1.000)';
  var element = iFramer({
    name: name,
    width: '100%',
    height: '68',
    style: {
      transition: transition,
      WebkitTransition: transition,
      MozTransition: transition,
      msTransition: transition,
      OTransition: transition,
      border: '0',
      zIndex: '9999'
    }
  });

  this.element = element;

  // Delayed so that browsers won't cache iframe URLs.
  setTimeout(function () {
    element.src = endpoint + '#' + braintreeBus.channel;
  }, 0);

  if (name === constants.INLINE_FRAME_NAME) {
    listenForReady(element, braintreeBus);
  }
}

module.exports = FrameContainer;

},{"../shared/constants":240,"braintree-bus":148,"iframer":220}],239:[function(require,module,exports){
'use strict';

var utils = require('braintree-utilities');
var FormNapper = require('form-napper');

function MerchantFormManager(options) {
  this.formNapper = new FormNapper(options.form);
  this.frames = options.frames;
  this.onSubmit = options.onSubmit;
  this.apiClient = options.apiClient;
}

MerchantFormManager.prototype.initialize = function () {
  if (this._isSubmitBased()) {
    this._setElements();
  }

  this._setEvents();

  return this;
};

MerchantFormManager.prototype.setNoncePayload = function (payload) {
  this.noncePayload = payload;
};

MerchantFormManager.prototype.clearNoncePayload = function () {
  this.noncePayload = null;
};

MerchantFormManager.prototype._isSubmitBased = function () {
  return !this.onSubmit;
};

MerchantFormManager.prototype._isCallbackBased = function () {
  return !!this.onSubmit;
};

MerchantFormManager.prototype._setElements = function () {
  this.nonceInput = this.formNapper.inject('payment_method_nonce', '');
};

MerchantFormManager.prototype._setEvents = function () {
  this.formNapper.hijack(utils.bind(this._handleFormSubmit, this));
};

MerchantFormManager.prototype._handleFormSubmit = function (event) {
  if (this.noncePayload && this.noncePayload.nonce) {
    this._handleNonceReply(event);
  } else {
    this.frames.inline.rpcClient.invoke('requestNonce', [], utils.bind(function (payload) {
      this.setNoncePayload(payload);
      this._handleNonceReply(event);
    }, this));
  }
};

MerchantFormManager.prototype._handleNonceReply = function (event) {
  if (this._isCallbackBased()) {
    this.apiClient.sendAnalyticsEvents('dropin.web.end.callback', utils.bind(function () {
      var payload = this.noncePayload;

      payload.originalEvent = event;

      this.onSubmit(payload);

      setTimeout(utils.bind(function () {
        delete payload.originalEvent;

        this.frames.inline.rpcClient.invoke('clearLoadingState');
        this.frames.inline.rpcClient.invoke('receiveNewPaymentMethod', [payload]);
      }, this), 200);
    }, this));
  } else {
    this._triggerFormSubmission();
  }
};

MerchantFormManager.prototype._triggerFormSubmission = function () {
  this.nonceInput = this.formNapper.inject('payment_method_nonce', this.noncePayload.nonce);

  this.apiClient.sendAnalyticsEvents('dropin.web.end.auto-submit', utils.bind(function () {
    this.formNapper.submit();
  }, this));
};

MerchantFormManager.prototype.teardown = function () {
  var form;

  if (this.nonceInput) {
    form = this.formNapper.htmlForm;
    form.removeChild(this.nonceInput);
  }

  this.formNapper.detach();
};

module.exports = MerchantFormManager;

},{"braintree-utilities":215,"form-napper":219}],240:[function(require,module,exports){
module.exports={
  "PAYPAL_INTEGRATION_NAME": "PayPal",
  "INLINE_FRAME_NAME": "braintree-dropin-frame",
  "MODAL_FRAME_NAME": "braintree-dropin-modal-frame",
  "PAYMENT_METHOD_TYPES": ["CoinbaseAccount", "PayPalAccount", "CreditCard"],
  "cssClassMap": {
    "American Express": "american-express",
    "Diners Club": "diners-club",
    "DinersClub": "diners-club",
    "Discover": "discover",
    "JCB": "jcb",
    "Maestro": "maestro",
    "MasterCard": "master-card",
    "Solo": "solo",
    "Switch": "switch",
    "UKMaestro": "maestro",
    "UnionPay": "unionpay",
    "Visa": "visa"
  },
  "INLINE_FRAME_TEARDOWN_EVENT": "dropin:TEARDOWN_INLINE_FRAME",
  "MODAL_FRAME_TEARDOWN_EVENT": "dropin:TEARDOWN_MODAL_FRAME"
}

},{}],241:[function(require,module,exports){
(function (global){
'use strict';
var ELEMENT_NODE = global.Node ? global.Node.ELEMENT_NODE : 1;

function extractValues(node, results) {
  results = results || {};

  var child, i;
  var children = node.children;

  for (i = 0; i < children.length; i++) {
    child = children[i];

    if (isBraintreeNode(child)) {
      var dataAttr = child.getAttribute('data-braintree-name');

      if (dataAttr === 'postal_code') {
        results.billingAddress = {
          postalCode: child.value
        };
      } else {
        results[dataAttr] = child.value;
      }

      scrubAttributes(child);
    } else if (child.children && child.children.length > 0) {
      extractValues(child, results);
    }
  }

  return results;
}

function scrubAttributes(node) {
  try {
    node.attributes.removeNamedItem('name');
  } catch (e) {}
}

function scrubAllAttributes(node) {
  extractValues(node);
}

function isBraintreeNode(node) {
  return node.nodeType === ELEMENT_NODE && node.attributes['data-braintree-name'];
}

module.exports = {
  extractValues: extractValues,
  scrubAllAttributes: scrubAllAttributes,
  scrubAttributes: scrubAttributes,
  isBraintreeNode: isBraintreeNode
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],242:[function(require,module,exports){
(function (global){
'use strict';

var util = require('braintree-utilities');
var fields = require('./fields');
var Destructor = require('destructor');
var Bus = require('braintree-bus');
var PaymentMethodModel = require('./models/payment-method-model');
var getNonceInput = require('./get-nonce-input');
var ERROR_PAYLOAD = {
  message: 'Unable to process payments at this time',
  type: 'IMMEDIATE'
};

function Form(apiClient, configuration) {
  var merchantConfiguration = configuration.merchantConfiguration;
  var hasExistingInput = typeof merchantConfiguration.paymentMethodNonceInputField === 'object';

  this.destructor = new Destructor();

  this.apiClient = apiClient;

  this.isCreditCardForm = merchantConfiguration.useCreditCard === false ? false : true;

  this.htmlForm = document.getElementById(merchantConfiguration.id);

  this.paymentMethodNonceInput = getNonceInput(merchantConfiguration.paymentMethodNonceInputField);
  this.htmlForm.appendChild(this.paymentMethodNonceInput);
  this.destructor.registerFunctionForTeardown(util.bind(function () {
    if (hasExistingInput) {
      this.paymentMethodNonceInput.value = '';
    } else {
      this.htmlForm.removeChild(this.paymentMethodNonceInput);
    }
  }, this));

  this.model = new PaymentMethodModel();

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: configuration.channel
  });

  this.setEvents();
  this.destructor.registerFunctionForTeardown(util.bind(function () {
    this.bus.teardown();
  }, this));
}

Form.prototype.setEvents = function () {
  this.onSubmitHandler = util.bind(this.handleSubmit, this);
  this.onExternalNonceReceived = util.bind(this.onExternalNonceReceived, this);
  this.clearExternalNonce = util.bind(this.clearExternalNonce, this);

  util.addEventListener(this.htmlForm, 'submit', this.onSubmitHandler);
  this.destructor.registerFunctionForTeardown(util.bind(function () {
    util.removeEventListener(this.htmlForm, 'submit', this.onSubmitHandler);
  }, this));

  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, this.onExternalNonceReceived);
  this.bus.on(Bus.events.PAYMENT_METHOD_CANCELLED, this.clearExternalNonce);
};

Form.prototype.handleSubmit = function (event) {
  var type;

  if (event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }

  if (!this.isCreditCardForm) {
    this.onNonceReceived(null, this.model.attributes);
    return;
  }

  type = this.model.get('type');

  if (type && type !== 'CreditCard') {
    fields.scrubAllAttributes(this.htmlForm);
    this.onNonceReceived(null, this.model.attributes);
    return;
  }

  this.apiClient.tokenizeCard(fields.extractValues(this.htmlForm), util.bind(function (err, nonce, payload) {
    if (err) {
      this.onNonceReceived(ERROR_PAYLOAD, null);
    } else {
      this.model.set({
        nonce: nonce,
        type: payload.type,
        details: payload.details
      });

      this.onNonceReceived(null, this.model.attributes);
    }
  }, this));
};

Form.prototype.writeNonceToDOM = function () {
  this.paymentMethodNonceInput.value = this.model.get('nonce');
};

Form.prototype.onExternalNonceReceived = function (payload) {
  this.model.set(payload);
  this.writeNonceToDOM();
};

Form.prototype.clearExternalNonce = function () {
  this.model.reset();
};

Form.prototype.onNonceReceived = function (err) {
  var form = this.htmlForm;

  if (err) {
    this.bus.emit(Bus.events.ERROR, ERROR_PAYLOAD);
    return;
  }

  util.removeEventListener(form, 'submit', this.onSubmitHandler);

  this.writeNonceToDOM();

  if (form.submit && (typeof form.submit === 'function' || form.submit.call)) {
    form.submit();
  } else {
    setTimeout(function () {
      form.querySelector('[type="submit"]').click();
    }, 1);
  }
};

Form.prototype.teardown = function () {
  this.destructor.teardown();
};

module.exports = Form;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./fields":241,"./get-nonce-input":243,"./models/payment-method-model":244,"braintree-bus":247,"braintree-utilities":259,"destructor":260}],243:[function(require,module,exports){
'use strict';

module.exports = function getNonceInput(paymentMethodNonceInputField) {
  var nonceInputName;

  if (typeof paymentMethodNonceInputField === 'object') {
    return paymentMethodNonceInputField;
  }

  nonceInputName = 'payment_method_nonce';

  if (typeof paymentMethodNonceInputField === 'string') {
    nonceInputName = paymentMethodNonceInputField;
  }

  var nonceInput = document.createElement('input');
  nonceInput.name = nonceInputName;
  nonceInput.type = 'hidden';

  return nonceInput;
};

},{}],244:[function(require,module,exports){
'use strict';

function PaymentMethodModel() {
  this.reset();
}

PaymentMethodModel.prototype.get = function (key) {
  return this.attributes[key];
}

PaymentMethodModel.prototype.set = function (payload) {
  this.attributes = payload || {};
};

PaymentMethodModel.prototype.reset = function () {
  this.attributes = {};
}

module.exports = PaymentMethodModel;

},{}],245:[function(require,module,exports){
'use strict';

module.exports = function validateAnnotations(htmlForm) {
  var inputs = htmlForm.getElementsByTagName('*');
  var valid = {};

  for (var i = 0; i < inputs.length; i++) {
    var field = inputs[i].getAttribute('data-braintree-name');
    valid[field] = true;
  }

  if (!valid.number) {
    throw new Error('Unable to find an input with data-braintree-name="number" in your form. Please add one.');
  }

  if (valid.expiration_date) {
    if (valid.expiration_month || valid.expiration_year) {
      throw new Error('You have inputs with data-braintree-name="expiration_date" AND data-braintree-name="expiration_(year|month)". Please use either "expiration_date" or "expiration_year" and "expiration_month".');
    }
  } else {
    if (!valid.expiration_month && !valid.expiration_year) {
      throw new Error('Unable to find an input with data-braintree-name="expiration_date" in your form. Please add one.');
    }

    if (!valid.expiration_month) {
      throw new Error('Unable to find an input with data-braintree-name="expiration_month" in your form. Please add one.');
    }

    if (!valid.expiration_year) {
      throw new Error('Unable to find an input with data-braintree-name="expiration_year" in your form. Please add one.');
    }
  }
};

},{}],246:[function(require,module,exports){
'use strict';

var Form = require('./lib/form');
var validateAnnotations = require('./lib/validate-annotations');

function setup(apiClient, configuration) {
  var merchantConfiguration = configuration.merchantConfiguration || {};
  var htmlForm = document.getElementById(merchantConfiguration.id);
  var isCreditCardForm = merchantConfiguration.useCreditCard === false ? false : true;

  if (!htmlForm) {
    throw new Error('Unable to find form with id: "' + merchantConfiguration.id + '"');
  }

  if (isCreditCardForm) {
    validateAnnotations(htmlForm);
  }

  return new Form(apiClient, configuration);
}

module.exports = {setup: setup};

},{"./lib/form":242,"./lib/validate-annotations":245}],247:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"./lib/check-origin":248,"./lib/events":249,"dup":52,"framebus":250}],248:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"dup":53}],249:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"dup":54}],250:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"dup":55}],251:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],252:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],253:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],254:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],255:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],256:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],257:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./array":251,"dup":41}],258:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],259:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./lib/array":251,"./lib/base64":252,"./lib/dom":253,"./lib/events":254,"./lib/fn":255,"./lib/string":256,"./lib/url":257,"./lib/uuid":258,"dup":43}],260:[function(require,module,exports){
arguments[4][80][0].apply(exports,arguments)
},{"batch-execute-functions":261,"braintree-utilities/lib/fn":262,"dup":80}],261:[function(require,module,exports){
arguments[4][81][0].apply(exports,arguments)
},{"dup":81}],262:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],263:[function(require,module,exports){
arguments[4][2][0].apply(exports,arguments)
},{"./coinbase-account":264,"./constants":265,"./credit-card":266,"./europe-bank-account":267,"./normalize-api-fields":269,"./parse-client-token":270,"./paypal-account":271,"./request/choose-driver":274,"./sepa-mandate":279,"./should-enable-cors":280,"./util":281,"braintree-3ds":290,"braintree-utilities":304,"dup":2}],264:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"dup":3}],265:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],266:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],267:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],268:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"./constants":265,"./parse-client-token":270,"./request/choose-driver":274,"./should-enable-cors":280,"./util":281,"dup":7}],269:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"dup":8}],270:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"./polyfill":272,"braintree-utilities":304,"dup":9}],271:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],272:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],273:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"../constants":265,"../util":281,"./parse-body":277,"./prep-body":278,"dup":12}],274:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"../util":281,"./ajax-driver":273,"./jsonp-driver":275,"dup":13}],275:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"../constants":265,"./jsonp":276,"dup":14}],276:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"../util":281,"dup":15}],277:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],278:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17,"lodash.isstring":312}],279:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],280:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],281:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20,"lodash.isempty":305,"lodash.isobject":311}],282:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./lib/client":263,"./lib/get-configuration":268,"./lib/parse-client-token":270,"./lib/util":281,"dup":21}],283:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],284:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"dup":23}],285:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],286:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],287:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"./lib/dom":283,"./lib/events":284,"./lib/fn":285,"./lib/url":286,"dup":26}],288:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"../shared/receiver":295,"braintree-utilities":287,"dup":27}],289:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"./authorization_service":288,"./loader":291,"braintree-utilities":287,"dup":28}],290:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"./client":289,"dup":29}],291:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"./loader_display":292,"./loader_message":293,"./loader_spinner":294,"dup":30}],292:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"dup":31}],293:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],294:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],295:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"braintree-utilities":287,"dup":34}],296:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],297:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],298:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],299:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],300:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],301:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],302:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./array":296,"dup":41}],303:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],304:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./lib/array":296,"./lib/base64":297,"./lib/dom":298,"./lib/events":299,"./lib/fn":300,"./lib/string":301,"./lib/url":302,"./lib/uuid":303,"dup":43}],305:[function(require,module,exports){
arguments[4][44][0].apply(exports,arguments)
},{"dup":44,"lodash.isarguments":306,"lodash.isarray":307,"lodash.isfunction":308,"lodash.isstring":312,"lodash.keys":309}],306:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45}],307:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"dup":46}],308:[function(require,module,exports){
arguments[4][47][0].apply(exports,arguments)
},{"dup":47}],309:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48,"lodash._getnative":310,"lodash.isarguments":306,"lodash.isarray":307}],310:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49}],311:[function(require,module,exports){
arguments[4][50][0].apply(exports,arguments)
},{"dup":50}],312:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51}],313:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"./lib/check-origin":314,"./lib/events":315,"dup":52,"framebus":316}],314:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"dup":53}],315:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"dup":54}],316:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"dup":55}],317:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],318:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],319:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],320:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],321:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],322:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],323:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./array":317,"dup":41}],324:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],325:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./lib/array":317,"./lib/base64":318,"./lib/dom":319,"./lib/events":320,"./lib/fn":321,"./lib/string":322,"./lib/url":323,"./lib/uuid":324,"dup":43}],326:[function(require,module,exports){
arguments[4][80][0].apply(exports,arguments)
},{"batch-execute-functions":327,"braintree-utilities/lib/fn":328,"dup":80}],327:[function(require,module,exports){
arguments[4][81][0].apply(exports,arguments)
},{"dup":81}],328:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],329:[function(require,module,exports){
arguments[4][83][0].apply(exports,arguments)
},{"./lib/default-attributes":330,"dup":83,"lodash.assign":331,"lodash.isstring":342,"setattributes":343}],330:[function(require,module,exports){
arguments[4][84][0].apply(exports,arguments)
},{"dup":84}],331:[function(require,module,exports){
arguments[4][85][0].apply(exports,arguments)
},{"dup":85,"lodash._baseassign":332,"lodash._createassigner":334,"lodash.keys":338}],332:[function(require,module,exports){
arguments[4][86][0].apply(exports,arguments)
},{"dup":86,"lodash._basecopy":333,"lodash.keys":338}],333:[function(require,module,exports){
arguments[4][87][0].apply(exports,arguments)
},{"dup":87}],334:[function(require,module,exports){
arguments[4][88][0].apply(exports,arguments)
},{"dup":88,"lodash._bindcallback":335,"lodash._isiterateecall":336,"lodash.restparam":337}],335:[function(require,module,exports){
arguments[4][89][0].apply(exports,arguments)
},{"dup":89}],336:[function(require,module,exports){
arguments[4][90][0].apply(exports,arguments)
},{"dup":90}],337:[function(require,module,exports){
arguments[4][91][0].apply(exports,arguments)
},{"dup":91}],338:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48,"lodash._getnative":339,"lodash.isarguments":340,"lodash.isarray":341}],339:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49}],340:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45}],341:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"dup":46}],342:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51}],343:[function(require,module,exports){
arguments[4][97][0].apply(exports,arguments)
},{"dup":97}],344:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtil = require('braintree-utilities');
var Destructor = require('destructor');
var Bus = require('braintree-bus');
var AppView = require('./views/app-view');
var LoggedInView = require('./views/logged-in-view');
var LoggedOutView = require('./views/logged-out-view');
var OverlayView = require('./views/overlay-view');
var MerchantPageView = require('./views/merchant-page-view');
var PaymentMethodNonceInputFieldView = require('./views/payment-method-nonce-input-field-view');
var BridgeIframeView = require('./views/bridge-iframe-view');
var browser = require('../shared/util/browser');
var constants = require('../shared/constants');
var util = require('../shared/util/util');

function Client(clientToken, options, channel) {
  options = options || {};

  this._clientToken = clientToken;
  this._clientOptions = options;

  this._clientToken.correlationId = util.generateUid();

  this.destructor = new Destructor();

  this.channel = channel;
  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: this.channel
  });

  this.container = braintreeUtil.normalizeElement(options.container);
  this.paymentMethodNonceInputField = options.paymentMethodNonceInputField;

  this.insertFrameFunction = options.insertFrame;
  this.onSuccess = options.onSuccess;
  this.onCancelled = options.onCancelled;
  this.loggedInView = null;
  this.loggedOutView = null;
  this.appView = null;
  this.merchantPageView = null;
  this.paymentMethodNonceInputFieldView = null;
  this.overlayView = null;
  this.bridgeIframeView = null;
  this.insertUI = options.headless !== true;
}

Client.prototype.initialize = function () {
  var clickLoginHandler = braintreeUtil.bind(this._handleClickLogin, this);

  this._createViews();

  this.bus.on(
    constants.events.GET_CLIENT_TOKEN,
    braintreeUtil.bind(this._handleGetClientToken, this)
  );

  this.bus.on(
    constants.events.GET_CLIENT_OPTIONS,
    braintreeUtil.bind(this._handleGetClientOptions, this)
  );

  if (this.insertUI) {
    this.bus.on(
      Bus.events.PAYMENT_METHOD_GENERATED,
      braintreeUtil.bind(this._handlePaymentMethodGenerated, this)
    );
  }

  braintreeUtil.addEventListener(document.body, 'click', clickLoginHandler);

  this.destructor.registerFunctionForTeardown(function () {
    braintreeUtil.removeEventListener(document.body, 'click', clickLoginHandler);
  });
};

Client.prototype._createViews = function () {
  var i;
  var views = [];

  if (browser.isBridgeIframeRequired()) {
    this.bridgeIframeView = new BridgeIframeView({
      container: this.container,
      paypalAssetsUrl: this._clientToken.paypal.assetsUrl,
      channel: this.channel
    });
    views.push(this.bridgeIframeView);
  }

  this.appView = new AppView({
    insertFrameFunction: this.insertFrameFunction,
    paypalAssetsUrl: this._clientToken.paypal.assetsUrl,
    isHermes: util.isHermesConfiguration(this._clientOptions),
    headless: this._clientOptions.headless,
    channel: this.channel
  });
  views.push(this.appView);

  if (this.insertUI) {
    this.paymentMethodNonceInputFieldView = new PaymentMethodNonceInputFieldView({
      container: this.container,
      el: this.paymentMethodNonceInputField,
      channel: this.channel
    });
    views.push(this.paymentMethodNonceInputFieldView);

    this.merchantPageView = new MerchantPageView({
      channel: this.channel
    });
    views.push(this.merchantPageView);

    this.loggedInView = new LoggedInView({
      paypalAssetsUrl: this._clientToken.paypal.assetsUrl,
      container: this.container,
      channel: this.channel
    });
    views.push(this.loggedInView);

    this.loggedOutView = new LoggedOutView({
      paypalAssetsUrl: this._clientToken.paypal.assetsUrl,
      container: this.container,
      isHermes: util.isHermesConfiguration(this._clientOptions),
      locale: this._clientOptions.locale,
      channel: this.channel
    });
    views.push(this.loggedOutView);

    if (browser.isPopupSupported() && browser.isOverlaySupported()) {
      this.overlayView = new OverlayView({
        paypalAssetsUrl: this._clientToken.paypal.assetsUrl,
        onFocus: braintreeUtil.bind(function () { this.bus.emit(constants.events.FOCUS_APP); }, this),
        onClose: braintreeUtil.bind(function () { this.bus.emit(constants.events.CLOSE_APP); }, this),
        channel: this.channel
      });
      views.push(this.overlayView);
    }
  }

  this.destructor.registerFunctionForTeardown(function () {
    for (i = 0; i < views.length; i++) {
      views[i].teardown();
    }
  });
};

Client.prototype._handleClickLogin = function (event) {
  var target = event.target || event.srcElement;

  while (true) { // eslint-disable-line no-constant-condition
    if (target == null) { return; }
    if (target === event.currentTarget) { return; }
    if (this._isButton(target)) { break; }

    target = target.parentNode;
  }

  util.preventDefault(event);

  this.launch();
};

Client.prototype.launch = function () {
  this.appView.open();
};

Client.prototype._isButton = function (node) {
  var isPayPalButton = node.id === 'braintree-paypal-button';
  var isHermesButton = util.isHermesConfiguration(this._clientOptions) &&
    node.className.match(/paypal-button(?!-widget)/);

  return isPayPalButton || isHermesButton;
};

Client.prototype._handlePaymentMethodGenerated = function (bundle) {
  if (bundle.type === constants.NONCE_TYPE && braintreeUtil.isFunction(this.onSuccess)) {
    this.onSuccess(bundle);
  }
};

Client.prototype._clientTokenData = function () {
  return {
    analyticsUrl: this._clientToken.analytics ?
      this._clientToken.analytics.url : null,
    authorizationFingerprint: this._clientToken.authorizationFingerprint,
    clientApiUrl: this._clientToken.clientApiUrl,
    displayName: this._clientOptions.displayName || this._clientToken.paypal.displayName,
    paypalAssetsUrl: this._clientToken.paypal.assetsUrl,
    paypalClientId: this._clientToken.paypal.clientId,
    paypalPrivacyUrl: this._clientToken.paypal.privacyUrl,
    paypalUserAgreementUrl: this._clientToken.paypal.userAgreementUrl,
    billingAgreementEnabled: this._clientToken.paypal.billingAgreementsEnabled,
    unvettedMerchant: this._clientToken.paypal.unvettedMerchant,
    payeeEmail: this._clientToken.paypal.payeeEmail,
    correlationId: this._clientToken.correlationId,
    offline: this._clientOptions.offline || this._clientToken.paypal.environmentNoNetwork,
    sdkVersion: this._clientToken.sdkVersion,
    merchantAppId: this._clientToken.merchantAppId
  };
};

Client.prototype._handleGetClientToken = function (callback) {
  callback(this._clientTokenData());
};

Client.prototype._clientOptionsData = function () {
  return {
    locale: this._clientOptions.locale || 'en_us',
    onetime: this._clientOptions.singleUse || false,
    integration: this._clientOptions.integration || 'paypal',
    enableShippingAddress: this._clientOptions.enableShippingAddress || false,
    enableBillingAddress: this._clientOptions.enableBillingAddress || false,
    enableHermes: util.isHermesConfiguration(this._clientOptions),
    amount: this._clientOptions.amount || null,
    currency: this._clientOptions.currency || null,
    shippingAddressOverride: this._clientOptions.shippingAddressOverride || null,
    enableCORS: this._clientOptions.enableCORS
  };
};

Client.prototype._handleGetClientOptions = function (callback) {
  callback(this._clientOptionsData());
};

Client.prototype.teardown = function () {
  this.destructor.teardown(braintreeUtil.bind(function () {
    this.bus.teardown();
  }, this));
};

module.exports = Client;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../shared/constants":355,"../shared/util/browser":362,"../shared/util/util":364,"./views/app-view":346,"./views/bridge-iframe-view":347,"./views/logged-in-view":348,"./views/logged-out-view":349,"./views/merchant-page-view":350,"./views/overlay-view":352,"./views/payment-method-nonce-input-field-view":353,"braintree-bus":313,"braintree-utilities":325,"destructor":326}],345:[function(require,module,exports){
'use strict';

var Client = require('./client');
var browser = require('../shared/util/browser');
var constants = require('../shared/constants');
var getLocale = require('../shared/get-locale');
var isHermesConfiguration = require('../shared/util/util').isHermesConfiguration;
var isOneTimeHermesConfiguration = require('../shared/util/util').isOneTimeHermesConfiguration;
var VERSION = "1.6.0";
var braintreeUtil = require('braintree-utilities');
var braintreeApi = require('braintree-api');

function create(clientToken, options, channel) {
  var client, onUnsupported;
  options = options || {};
  onUnsupported = options.onUnsupported;

  if (typeof onUnsupported !== 'function') {
    onUnsupported = function (error) {
      try {
        console.log(error); // eslint-disable-line no-console
      } catch (e) {} // eslint-disable-line
    };
  }

  if (!clientToken) {
    onUnsupported(new Error('Parameter "clientToken" cannot be null'));
    return null;
  }

  clientToken = braintreeApi.parseClientToken(clientToken);

  if (!clientToken.paypalEnabled) {
    onUnsupported(new Error('PayPal is not enabled'));
    return null;
  }

  if (!browser.detectedPostMessage()) {
    onUnsupported(new Error('unsupported browser detected'));
    return null;
  }

  if (!options.container) {
    onUnsupported(new Error('Please supply a container for the PayPal button to be appended to'));
    return null;
  }

  if (!isBrowserSecure(clientToken, options)) {
    onUnsupported(new Error('unsupported protocol detected'));
    return null;
  }

  if (isMisconfiguredUnvettedMerchant(clientToken, options)) {
    onUnsupported(new Error('Unvetted merchant client token does not include a payee email'));
    return null;
  }

  if (isHermesConfiguration(options)) {
    if (!isHermesSupportedCountry(options.locale)) {
      onUnsupported(new Error('This PayPal integration does not support this country'));
      return null;
    }
  }

  if (isOneTimeHermesConfiguration(options)) {
    if (!isHermesSupportedCurrency(options.currency)) {
      onUnsupported(new Error('This PayPal integration does not support this currency'));
      return null;
    }

    if (!isValidAmount(options.amount)) {
      onUnsupported(new Error('Amount must be a number'));
      return null;
    }
  }

  client = new Client(clientToken, options, channel);
  client.initialize();

  return client;
}

function isSupportedOption(option, supported) {
  var i;
  var supportedLength = supported.length;
  var isSupported = false;

  for (i = 0; i < supportedLength; i++) {
    if (option.toLowerCase() === supported[i].toLowerCase()) {
      isSupported = true;
    }
  }

  return isSupported;
}

function isHermesSupportedCurrency(currency) {
  return isSupportedOption(currency, constants.HERMES_SUPPORTED_CURRENCIES);
}

function isHermesSupportedCountry(locale) {
  return isSupportedOption(getLocale(locale).split('_')[1], constants.HERMES_SUPPORTED_COUNTRIES);
}

function isValidAmount(amount) {
  amount = parseFloat(amount);
  return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
}

function isMisconfiguredUnvettedMerchant(clientToken, options) {
  return clientToken.paypal.unvettedMerchant && (!isHermesConfiguration(options) || !clientToken.paypal.payeeEmail);
}

function isBrowserSecure(clientToken, options) {
  if (clientToken.paypal.allowHttp) { return true; }
  if (browser.isPopupSupported()) { return true; }
  if ('merchantHttps' in options) { return options.merchantHttps; }

  return braintreeUtil.isBrowserHttps();
}

module.exports = {
  create: create,
  VERSION: VERSION
};

},{"../shared/constants":355,"../shared/get-locale":357,"../shared/util/browser":362,"../shared/util/util":364,"./client":344,"braintree-api":282,"braintree-utilities":325}],346:[function(require,module,exports){
arguments[4][183][0].apply(exports,arguments)
},{"../../shared/constants":355,"../../shared/util/browser":362,"./modal-view":351,"./popup-view":354,"braintree-bus":313,"braintree-utilities":325,"destructor":326,"dup":183}],347:[function(require,module,exports){
'use strict';

var constants = require('../../shared/constants');
var iframer = require('iframer');

function BridgeIframeView(options) {
  this.options = options || {};

  this.el = iframer({
    src: this._buildUrl(),
    name: constants.BRIDGE_FRAME_NAME,
    height: 1,
    width: 1,
    style: {
      position: 'static',
      top: 0,
      left: 0,
      bottom: 0,
      padding: 0,
      margin: 0,
      border: 0,
      outline: 'none',
      background: 'transparent'
    }
  });

  this.options.container.appendChild(this.el);
}

BridgeIframeView.prototype._buildUrl = function () {
  var url = this.options.paypalAssetsUrl;
  url += '/pwpp/';
  url += constants.VERSION;
  url += '/html/bridge-frame.html';
  url += '#' + this.options.channel;

  return url;
};

BridgeIframeView.prototype.teardown = function () {
  this.options.container.removeChild(this.el);
};

module.exports = BridgeIframeView;

},{"../../shared/constants":355,"iframer":329}],348:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtil = require('braintree-utilities');
var Destructor = require('destructor');
var Bus = require('braintree-bus');
var util = require('../../shared/util/util');
var dom = require('../../shared/util/dom');
var constants = require('../../shared/constants');

function LoggedInView(options) {
  this.options = options || {};
  this.wrapper = this.options.container || document.body;

  this.destructor = new Destructor();

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  this._initialize();
}

LoggedInView.prototype._initialize = function () {
  var clickLogoutHandler = braintreeUtil.bind(this._handleClickLogout, this);

  this._createViewContainer();
  this._createPayPalName();
  this._createEmailNode();
  this._createLogoutNode();

  braintreeUtil.addEventListener(this.logoutNode, 'click', clickLogoutHandler);

  this.destructor.registerFunctionForTeardown(braintreeUtil.bind(function () {
    braintreeUtil.removeEventListener(this.logoutNode, 'click', clickLogoutHandler);
  }, this));

  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, braintreeUtil.bind(this._handlePaymentMethodGenerated, this));
  this.bus.on(Bus.events.PAYMENT_METHOD_CANCELLED, braintreeUtil.bind(this._handlePaymentMethodCancelled, this));
};

LoggedInView.prototype._createViewContainer = function () {
  var cssStyles = [
    'display: none',
    'max-width: 500px',
    'overflow: hidden',
    'padding: 16px',
    'background-image: url(' + this.options.paypalAssetsUrl + '/pwpp/' + constants.VERSION + '/images/paypal-small.png)',
    'background-image: url(' + this.options.paypalAssetsUrl + '/pwpp/' + constants.VERSION + '/images/paypal-small.svg), none',
    'background-position: 20px 50%',
    'background-repeat: no-repeat',
    'background-size: 13px 15px',
    'border-top: 1px solid #d1d4d6',
    'border-bottom: 1px solid #d1d4d6'
  ].join(';');

  this.container = document.createElement('div');
  this.container.id = 'braintree-paypal-loggedin';
  this.container.style.cssText = cssStyles;

  this.wrapper.appendChild(this.container);
};

LoggedInView.prototype._createPayPalName = function () {
  var cssStyles = [
    'color: #283036',
    'font-size: 13px',
    'font-weight: 800',
    'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif',
    'margin-left: 36px',
    '-webkit-font-smoothing: antialiased',
    '-moz-font-smoothing: antialiased',
    '-ms-font-smoothing: antialiased',
    'font-smoothing: antialiased'
  ].join(';');

  this.payPalName = document.createElement('span');
  this.payPalName.id = 'bt-pp-name';
  this.payPalName.innerHTML = 'PayPal';
  this.payPalName.style.cssText = cssStyles;

  return this.container.appendChild(this.payPalName);
};

LoggedInView.prototype._createEmailNode = function () {
  var cssStyles = [
    'color: #6e787f',
    'font-size: 13px',
    'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif',
    'margin-left: 5px',
    '-webkit-font-smoothing: antialiased',
    '-moz-font-smoothing: antialiased',
    '-ms-font-smoothing: antialiased',
    'font-smoothing: antialiased'
  ].join(';');

  this.emailNode = document.createElement('span');
  this.emailNode.id = 'bt-pp-email';
  this.emailNode.style.cssText = cssStyles;

  this.container.appendChild(this.emailNode);
};

LoggedInView.prototype._createLogoutNode = function () {
  var cssStyles = [
    'color: #3d95ce',
    'font-size: 11px',
    'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif',
    'line-height: 20px',
    'margin: 0 0 0 25px',
    'padding: 0',
    'background-color: transparent',
    'border: 0',
    'cursor: pointer',
    'text-decoration: underline',
    'float: right',
    '-webkit-font-smoothing: antialiased',
    '-moz-font-smoothing: antialiased',
    '-ms-font-smoothing: antialiased',
    'font-smoothing: antialiased'
  ].join(';');

  this.logoutNode = document.createElement('button');
  this.logoutNode.id = 'bt-pp-cancel';
  this.logoutNode.innerHTML = 'Cancel';
  this.logoutNode.style.cssText = cssStyles;

  this.container.appendChild(this.logoutNode);
};

LoggedInView.prototype.show = function (email) {
  this.container.style.display = 'block';
  dom.setTextContent(this.emailNode, email);
};

LoggedInView.prototype.hide = function () {
  this.container.style.display = 'none';
};

LoggedInView.prototype._handleClickLogout = function (event) {
  util.preventDefault(event);

  this.bus.emit(Bus.events.PAYMENT_METHOD_CANCELLED, {source: constants.PAYPAL_INTEGRATION_NAME});
};

LoggedInView.prototype._handlePaymentMethodGenerated = function (bundle) {
  var email;

  if (bundle.type === constants.NONCE_TYPE) {
    email = bundle && bundle.details && bundle.details.email ? bundle.details.email : '';
    this.show(email);
  }
};

LoggedInView.prototype._handlePaymentMethodCancelled = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.hide();
  }
};

LoggedInView.prototype.teardown = function () {
  this.wrapper.removeChild(this.container);
  this.destructor.teardown();
  this.bus.teardown();
};

module.exports = LoggedInView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../shared/constants":355,"../../shared/util/dom":363,"../../shared/util/util":364,"braintree-bus":313,"braintree-utilities":325,"destructor":326}],349:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtil = require('braintree-utilities');
var Bus = require('braintree-bus');
var constants = require('../../shared/constants');
var getLocale = require('../../shared/get-locale');

function LoggedOutView(options) {
  this.options = options;
  this.wrapper = this.options.container || document.body;

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  this._initialize();
}

LoggedOutView.prototype._initialize = function () {
  this.createViewContainer();

  if (this.options.isHermes) {
    this.createCheckoutWithPayPalButton();
  } else {
    this.createPayWithPayPalButton();
  }

  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, braintreeUtil.bind(this._handlePaymentMethodGenerated, this));
  this.bus.on(Bus.events.PAYMENT_METHOD_CANCELLED, braintreeUtil.bind(this._handlePaymentMethodCancelled, this));
};

LoggedOutView.prototype.createViewContainer = function () {
  this.container = document.createElement('div');
  this.container.id = 'braintree-paypal-loggedout';

  this.wrapper.appendChild(this.container);
  this.loginNode = this.container;
};

LoggedOutView.prototype.createPayWithPayPalButton = function () {
  var element = document.createElement('a');
  var image = new Image();
  var imageCssText = [
    'max-width: 100%',
    'display: block',
    'width: 100%',
    'height: 100%',
    'outline: none',
    'border: 0'
  ].join(';');
  var cssStyles = [
    'display: block',
    'width: 115px',
    'height: 44px',
    'overflow: hidden'
  ].join(';');

  element.id = 'braintree-paypal-button';
  element.href = '#';
  element.style.cssText = cssStyles;

  image.src = this.options.paypalAssetsUrl + '/pwpp/' + constants.VERSION + '/images/pay-with-paypal.png';
  image.setAttribute('alt', 'Pay with PayPal');
  image.style.cssText = imageCssText;

  element.appendChild(image);
  this.container.appendChild(element);
};

LoggedOutView.prototype.createCheckoutWithPayPalButton = function () {
  var script = document.createElement('script');

  script.src = '//www.paypalobjects.com/api/button.js';
  script.async = true;
  script.setAttribute('data-merchant', 'merchant-id');
  script.setAttribute('data-button', 'checkout');
  script.setAttribute('data-type', 'button');
  script.setAttribute('data-width', '150');
  script.setAttribute('data-height', '44');
  script.setAttribute('data-lc', getLocale(this.options.locale));

  this.container.appendChild(script);
};

LoggedOutView.prototype.show = function () {
  this.container.style.display = 'block';
};

LoggedOutView.prototype.hide = function () {
  this.container.style.display = 'none';
};

LoggedOutView.prototype._handlePaymentMethodGenerated = function (bundle) {
  if (bundle.type === constants.NONCE_TYPE) {
    this.hide();
  }
};

LoggedOutView.prototype._handlePaymentMethodCancelled = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.show();
  }
};

LoggedOutView.prototype.teardown = function () {
  this.wrapper.removeChild(this.container);
  this.bus.teardown();
};

module.exports = LoggedOutView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../shared/constants":355,"../../shared/get-locale":357,"braintree-bus":313,"braintree-utilities":325}],350:[function(require,module,exports){
(function (global){
'use strict';

var Bus = require('braintree-bus');
var braintreeUtil = require('braintree-utilities');
var constants = require('../../shared/constants');

function MerchantPageView(options) {
  this.options = options;

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  this.bus.on(constants.events.UI_MODAL_DID_OPEN, braintreeUtil.bind(this.lockWindowSize, this));
  this.bus.on(constants.events.UI_MODAL_DID_CLOSE, braintreeUtil.bind(this.unlockWindowSize, this));
}

MerchantPageView.prototype.lockWindowSize = function () {
  this.defaultStyles = getMerchantPageDefaultStyles();
  document.documentElement.style.height = '100%';
  document.documentElement.style.overflow = 'hidden';
  document.body.style.height = '100%';
  document.body.style.overflow = 'hidden';
};

MerchantPageView.prototype.unlockWindowSize = function () {
  if (this.defaultStyles) {
    document.documentElement.style.height = this.defaultStyles.html.styles.height;
    document.documentElement.style.overflow = this.defaultStyles.html.styles.overflow;
    document.body.style.height = this.defaultStyles.body.styles.height;
    document.body.style.overflow = this.defaultStyles.body.styles.overflow;
    delete this.defaultStyles;
  }
};

MerchantPageView.prototype._handleUIModalDidOpen = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.lockWindowSize();
  }
};

MerchantPageView.prototype._handleUIModalDidClose = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.unlockWindowSize();
  }
};

MerchantPageView.prototype.teardown = function () {
  this.unlockWindowSize();
  this.bus.teardown();
};

function getStyles(element) {
  var computedStyles = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;
  return {
    overflow: computedStyles.overflow || '',
    height: element.style.height || ''
  };
}

function getMerchantPageDefaultStyles() {
  return {
    html: {
      node: document.documentElement,
      styles: getStyles(document.documentElement)
    },
    body: {
      node: document.body,
      styles: getStyles(document.body)
    }
  };
}

module.exports = MerchantPageView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../shared/constants":355,"braintree-bus":313,"braintree-utilities":325}],351:[function(require,module,exports){
arguments[4][184][0].apply(exports,arguments)
},{"../../shared/constants":355,"../../shared/util/browser":362,"braintree-bus":313,"braintree-utilities":325,"dup":184,"iframer":329}],352:[function(require,module,exports){
(function (global){
'use strict';
var braintreeUtil = require('braintree-utilities');
var Destructor = require('destructor');
var Bus = require('braintree-bus');
var constants = require('../../shared/constants');

function OverlayView(options) {
  this.options = options;
  this.spriteSrc = this.options.paypalAssetsUrl + '/pwpp/' + constants.VERSION + '/images/pp_overlay_sprite.png';

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  this.destructor = new Destructor();

  this._create();
  this._setupEvents();

  this.bus.on(Bus.events.UI_POPUP_DID_OPEN, braintreeUtil.bind(this._handleUIPopupDidOpen, this));
  this.bus.on(Bus.events.UI_POPUP_DID_CLOSE, braintreeUtil.bind(this._handleUIPopupDidClose, this));
}

OverlayView.prototype.open = function () {
  if (document.body.contains(this.el)) {
    return;
  }

  document.body.appendChild(this.el);
};

OverlayView.prototype.close = function () {
  if (document.body.contains(this.el)) {
    document.body.removeChild(this.el);
  }
};

OverlayView.prototype._handleUIPopupDidClose = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.close();
  }
};

OverlayView.prototype._handleUIPopupDidOpen = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.open();
  }
};

OverlayView.prototype._create = function () {
  this.el = document.createElement('div');

  this.el.className = 'bt-overlay';

  this._setStyles(this.el, [
    'z-index: 20001',
    'position: fixed',
    'top: 0',
    'left: 0',
    'height: 100%',
    'width: 100%',
    'text-align: center',
    'background: #000',
    'background: rgba(0,0,0,0.7)',
    '-ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=52)"'
  ]);

  this.el.appendChild(this._createCloseIcon());
  this.el.appendChild(this._createMessage());
};

OverlayView.prototype._createCloseIcon = function () {
  this.closeIcon = document.createElement('div');

  this.closeIcon.className = 'bt-close-overlay';

  this._setStyles(this.closeIcon, [
    'position: absolute',
    'top: 10px',
    'right: 10px',
    'cursor: pointer',
    'background: url(' + this.spriteSrc + ') no-repeat 0 -67px',
    'height: 14px',
    'width: 14px'
  ]);

  return this.closeIcon;
};

OverlayView.prototype._createMessage = function () {
  var message = document.createElement('div');

  this._setStyles(message, [
    'position: relative',
    'top: 50%',
    'max-width: 350px',
    'font-family: "HelveticaNeue", "HelveticaNeue-Light", "Helvetica Neue Light", helvetica, arial, sans-serif',
    'font-size: 14px',
    'line-height: 20px',
    'margin: -70px auto 0'
  ]);

  message.appendChild(this._createLogo());
  message.appendChild(this._createExplanation());
  message.appendChild(this._createFocusLink());

  return message;
};

OverlayView.prototype._createExplanation = function () {
  var explanation = document.createElement('div');

  this._setStyles(explanation, [
    'color: #FFF',
    'margin-bottom: 20px'
  ]);

  explanation.innerHTML = 'Don\'t see the secure PayPal browser? We\'ll help you re-launch the window to complete your purchase.';

  return explanation;
};

OverlayView.prototype._createLogo = function () {
  var logo = document.createElement('div');

  this._setStyles(logo, [
    'background: url(' + this.spriteSrc + ') no-repeat 0 0',
    'width: 94px',
    'height: 25px',
    'margin: 0 auto 26px auto'
  ]);

  return logo;
};

OverlayView.prototype._createFocusLink = function () {
  this.focusLink = document.createElement('a');

  this._setStyles(this.focusLink, [
    'color: #009be1',
    'cursor: pointer'
  ]);

  this.focusLink.innerHTML = 'Continue';

  return this.focusLink;
};

OverlayView.prototype._setStyles = function (el, styles) {
  var cssStyles = styles.join(';');
  el.style.cssText = cssStyles;
};

OverlayView.prototype._setupEvents = function () {
  var clickCloseHandler = braintreeUtil.bind(this._handleClose, this);
  var clickFocusHandler = braintreeUtil.bind(this._handleFocus, this);

  braintreeUtil.addEventListener(this.closeIcon, 'click', clickCloseHandler);
  braintreeUtil.addEventListener(this.focusLink, 'click', clickFocusHandler);

  this.destructor.registerFunctionForTeardown(braintreeUtil.bind(function () {
    braintreeUtil.removeEventListener(this.closeIcon, 'click', clickCloseHandler);
    braintreeUtil.removeEventListener(this.focusLink, 'click', clickFocusHandler);
  }, this));
};

OverlayView.prototype._handleClose = function (event) {
  event.preventDefault();
  this.close();

  if (braintreeUtil.isFunction(this.options.onClose)) {
    this.options.onClose();
  }
};

OverlayView.prototype._handleFocus = function (event) {
  event.preventDefault();

  if (braintreeUtil.isFunction(this.options.onFocus)) {
    this.options.onFocus();
  }
};

OverlayView.prototype.teardown = function () {
  this.bus.teardown();
  this.destructor.teardown();
  this.close();
};

module.exports = OverlayView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../shared/constants":355,"braintree-bus":313,"braintree-utilities":325,"destructor":326}],353:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtil = require('braintree-utilities');
var Destructor = require('destructor');
var Bus = require('braintree-bus');
var constants = require('../../shared/constants');

function PaymentMethodNonceInputFieldView(options) {
  this.options = options || {};
  this.container = this.options.container || document.body;
  this.el = this.options.el;

  this.destructor = new Destructor();

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  this._initialize();
}

PaymentMethodNonceInputFieldView.prototype._initialize = function () {
  if (!braintreeUtil.isFunction(this.el)) {
    if (this.el != null) {
      this.el = braintreeUtil.normalizeElement(this.el);

      this.destructor.registerFunctionForTeardown(braintreeUtil.bind(function () {
        this.clear();
      }, this));
    } else {
      this.el = this.create();
    }
  }

  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, braintreeUtil.bind(this._handlePaymentMethodGenerated, this));
  this.bus.on(Bus.events.PAYMENT_METHOD_CANCELLED, braintreeUtil.bind(this._handlePaymentMethodCancelled, this));
};

PaymentMethodNonceInputFieldView.prototype.create = function () {
  var input = document.createElement('input');
  input.name = 'payment_method_nonce';
  input.type = 'hidden';
  this.container.appendChild(input);

  this.destructor.registerFunctionForTeardown(braintreeUtil.bind(function () {
    this.container.removeChild(input);
  }, this));

  return input;
};

PaymentMethodNonceInputFieldView.prototype.value = function (value) {
  if (braintreeUtil.isFunction(this.el)) {
    this.el(value);
  } else {
    this.el.value = value;
  }
};

PaymentMethodNonceInputFieldView.prototype.clear = function () {
  this.value('');
};

PaymentMethodNonceInputFieldView.prototype._handlePaymentMethodCancelled = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.clear();
  }
};

PaymentMethodNonceInputFieldView.prototype._handlePaymentMethodGenerated = function (bundle) {
  if (bundle.type === constants.NONCE_TYPE) {
    this.value(bundle.nonce);
  }
};

PaymentMethodNonceInputFieldView.prototype.teardown = function () {
  this.destructor.teardown();
  this.bus.teardown();
};

module.exports = PaymentMethodNonceInputFieldView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../shared/constants":355,"braintree-bus":313,"braintree-utilities":325,"destructor":326}],354:[function(require,module,exports){
arguments[4][185][0].apply(exports,arguments)
},{"../../shared/constants":355,"../../shared/useragent/browser":358,"braintree-bus":313,"dup":185}],355:[function(require,module,exports){
arguments[4][186][0].apply(exports,arguments)
},{"dup":186}],356:[function(require,module,exports){
'use strict';

module.exports = {
  us: 'en_us',
  gb: 'en_uk',
  uk: 'en_uk',
  de: 'de_de',
  fr: 'fr_fr',
  it: 'it_it',
  es: 'es_es',
  ca: 'en_ca',
  au: 'en_au',
  at: 'de_de',
  be: 'en_us',
  ch: 'de_de',
  dk: 'da_dk',
  nl: 'nl_nl',
  no: 'no_no',
  pl: 'pl_pl',
  se: 'sv_se',
  tr: 'tr_tr',
  bg: 'en_us',
  cy: 'en_us',
  hr: 'en_us',
  is: 'en_us',
  kh: 'en_us',
  mt: 'en_us',
  my: 'en_us',
  ru: 'ru_ru'
};

},{}],357:[function(require,module,exports){
'use strict';

var countryCodeLookupTable = require('../shared/data/country-code-lookup');

function isFormatted(code) {
  return code.indexOf('_') !== -1 && code.length === 5;
}

function queryTable(code) {
  var key, match;

  for (key in countryCodeLookupTable) {
    if (countryCodeLookupTable.hasOwnProperty(key)) {
      if (key === code) {
        match = countryCodeLookupTable[key];
      } else if (countryCodeLookupTable[key] === code) {
        match = countryCodeLookupTable[key];
      }
    }
  }

  return match;
}

function getLocale(code) {
  var match, pieces;

  code = code ? code.toLowerCase() : 'us';
  code = code.replace(/-/g, '_');

  match = isFormatted(code) ? code : queryTable(code);

  if (match) {
    pieces = match.split('_');
    return [pieces[0], pieces[1].toUpperCase()].join('_');
  }

  return 'en_US';
}

module.exports = getLocale;

},{"../shared/data/country-code-lookup":356}],358:[function(require,module,exports){
arguments[4][187][0].apply(exports,arguments)
},{"./platform":360,"./useragent":361,"dup":187}],359:[function(require,module,exports){
arguments[4][188][0].apply(exports,arguments)
},{"./platform":360,"./useragent":361,"dup":188}],360:[function(require,module,exports){
arguments[4][189][0].apply(exports,arguments)
},{"./useragent":361,"dup":189}],361:[function(require,module,exports){
arguments[4][190][0].apply(exports,arguments)
},{"dup":190}],362:[function(require,module,exports){
arguments[4][191][0].apply(exports,arguments)
},{"../useragent/browser":358,"../useragent/device":359,"../useragent/platform":360,"../useragent/useragent":361,"dup":191}],363:[function(require,module,exports){
'use strict';

function setTextContent(element, content) {
  var property = 'innerText';
  if (document && document.body) {
    if ('textContent' in document.body) {
      property = 'textContent';
    }
  }
  element[property] = content;
}

module.exports = {
  setTextContent: setTextContent
};

},{}],364:[function(require,module,exports){
'use strict';

var trim = typeof String.prototype.trim === 'function' ?
  function (str) { return str.trim(); } :
  function (str) { return str.replace(/^\s+|\s+$/, ''); };

var b2a = typeof window.btoa === 'function' ?
  function (str) { return window.btoa(str); } :
  function (str) {
    var keyStr =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var output = '';
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    while (i < str.length) {
      chr1 = str.charCodeAt(i++);
      chr2 = str.charCodeAt(i++);
      chr3 = str.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = (chr1 & 3) << 4 | chr2 >> 4;
      enc3 = (chr2 & 15) << 2 | chr3 >> 6;
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
          keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }

    return output;
  };

function generateUid() {
  var i, r;
  var uid = '';

  for (i = 0; i < 32; i++) {
    r = Math.floor(Math.random() * 16);
    uid += r.toString(16);
  }

  return uid;
}

function castToBoolean(value) {
  return /^(true|1)$/i.test(value);
}

function htmlEscape(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/\'/g, '&apos;');
}

function parseUrlParams(url) {
  var arr, i, n, parts, index, key, value, encodedValue;
  var startIndex = url.indexOf('?');
  var values = {};

  if (startIndex >= 0) {
    url = url.substr(startIndex + 1);
  }

  if (url.length === 0) {
    return null;
  }

  arr = url.split('&');
  for (i = 0, n = arr.length; i < n; i++) {
    parts = arr[i];
    index = parts.indexOf('=');
    key = parts.substr(0, index);
    encodedValue = parts.substr(index + 1);
    value = decodeURIComponent(encodedValue);
    value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (value === 'false') {
      value = false;
    }
    if (value == null || value === 'true') {
      value = true;
    }
    values[key] = value;
  }

  return values;
}

function preventDefault(event) {
  if (event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }
}

function isOneTimeHermesConfiguration(options) {
  return !!options.singleUse && !!options.amount && !!options.currency;
}

function isBillingAgreementHermesConfiguration(options) {
  return !!options.billingAgreementEnabled;
}

function isHermesConfiguration(options) {
  return isBillingAgreementHermesConfiguration(options) || isOneTimeHermesConfiguration(options);
}

module.exports = {
  trim: trim,
  btoa: b2a,
  generateUid: generateUid,
  castToBoolean: castToBoolean,
  htmlEscape: htmlEscape,
  parseUrlParams: parseUrlParams,
  preventDefault: preventDefault,
  isOneTimeHermesConfiguration: isOneTimeHermesConfiguration,
  isBillingAgreementHermesConfiguration: isBillingAgreementHermesConfiguration,
  isHermesConfiguration: isHermesConfiguration
};

},{}],365:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],366:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],367:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],368:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],369:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],370:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],371:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./array":365,"dup":41}],372:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],373:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./lib/array":365,"./lib/base64":366,"./lib/dom":367,"./lib/events":368,"./lib/fn":369,"./lib/string":370,"./lib/url":371,"./lib/uuid":372,"dup":43}],374:[function(require,module,exports){
arguments[4][80][0].apply(exports,arguments)
},{"batch-execute-functions":375,"braintree-utilities/lib/fn":376,"dup":80}],375:[function(require,module,exports){
arguments[4][81][0].apply(exports,arguments)
},{"dup":81}],376:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],377:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseClone = require('lodash._baseclone'),
    bindCallback = require('lodash._bindcallback');

/**
 * Creates a deep clone of `value`. If `customizer` is provided it's invoked
 * to produce the cloned values. If `customizer` returns `undefined` cloning
 * is handled by the method instead. The `customizer` is bound to `thisArg`
 * and invoked with up to three argument; (value [, index|key, object]).
 *
 * **Note:** This method is loosely based on the
 * [structured clone algorithm](http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm).
 * The enumerable properties of `arguments` objects and objects created by
 * constructors other than `Object` are cloned to plain `Object` objects. An
 * empty object is returned for uncloneable values such as functions, DOM nodes,
 * Maps, Sets, and WeakMaps.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to deep clone.
 * @param {Function} [customizer] The function to customize cloning values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {*} Returns the deep cloned value.
 * @example
 *
 * var users = [
 *   { 'user': 'barney' },
 *   { 'user': 'fred' }
 * ];
 *
 * var deep = _.cloneDeep(users);
 * deep[0] === users[0];
 * // => false
 *
 * // using a customizer callback
 * var el = _.cloneDeep(document.body, function(value) {
 *   if (_.isElement(value)) {
 *     return value.cloneNode(true);
 *   }
 * });
 *
 * el === document.body
 * // => false
 * el.nodeName
 * // => BODY
 * el.childNodes.length;
 * // => 20
 */
function cloneDeep(value, customizer, thisArg) {
  return typeof customizer == 'function'
    ? baseClone(value, true, bindCallback(customizer, thisArg, 3))
    : baseClone(value, true);
}

module.exports = cloneDeep;

},{"lodash._baseclone":378,"lodash._bindcallback":388}],378:[function(require,module,exports){
(function (global){
/**
 * lodash 3.3.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var arrayCopy = require('lodash._arraycopy'),
    arrayEach = require('lodash._arrayeach'),
    baseAssign = require('lodash._baseassign'),
    baseFor = require('lodash._basefor'),
    isArray = require('lodash.isarray'),
    keys = require('lodash.keys');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to match `RegExp` flags from their coerced string values. */
var reFlags = /\w*$/;

/** Used to identify `toStringTag` values supported by `_.clone`. */
var cloneableTags = {};
cloneableTags[argsTag] = cloneableTags[arrayTag] =
cloneableTags[arrayBufferTag] = cloneableTags[boolTag] =
cloneableTags[dateTag] = cloneableTags[float32Tag] =
cloneableTags[float64Tag] = cloneableTags[int8Tag] =
cloneableTags[int16Tag] = cloneableTags[int32Tag] =
cloneableTags[numberTag] = cloneableTags[objectTag] =
cloneableTags[regexpTag] = cloneableTags[stringTag] =
cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
cloneableTags[errorTag] = cloneableTags[funcTag] =
cloneableTags[mapTag] = cloneableTags[setTag] =
cloneableTags[weakMapTag] = false;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Native method references. */
var ArrayBuffer = global.ArrayBuffer,
    Uint8Array = global.Uint8Array;

/**
 * The base implementation of `_.clone` without support for argument juggling
 * and `this` binding `customizer` functions.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @param {Function} [customizer] The function to customize cloning values.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The object `value` belongs to.
 * @param {Array} [stackA=[]] Tracks traversed source objects.
 * @param {Array} [stackB=[]] Associates clones with source counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, isDeep, customizer, key, object, stackA, stackB) {
  var result;
  if (customizer) {
    result = object ? customizer(value, key, object) : customizer(value);
  }
  if (result !== undefined) {
    return result;
  }
  if (!isObject(value)) {
    return value;
  }
  var isArr = isArray(value);
  if (isArr) {
    result = initCloneArray(value);
    if (!isDeep) {
      return arrayCopy(value, result);
    }
  } else {
    var tag = objToString.call(value),
        isFunc = tag == funcTag;

    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      result = initCloneObject(isFunc ? {} : value);
      if (!isDeep) {
        return baseAssign(result, value);
      }
    } else {
      return cloneableTags[tag]
        ? initCloneByTag(value, tag, isDeep)
        : (object ? value : {});
    }
  }
  // Check for circular references and return its corresponding clone.
  stackA || (stackA = []);
  stackB || (stackB = []);

  var length = stackA.length;
  while (length--) {
    if (stackA[length] == value) {
      return stackB[length];
    }
  }
  // Add the source value to the stack of traversed objects and associate it with its clone.
  stackA.push(value);
  stackB.push(result);

  // Recursively populate clone (susceptible to call stack limits).
  (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
    result[key] = baseClone(subValue, isDeep, customizer, key, value, stackA, stackB);
  });
  return result;
}

/**
 * The base implementation of `_.forOwn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return baseFor(object, iteratee, keys);
}

/**
 * Creates a clone of the given array buffer.
 *
 * @private
 * @param {ArrayBuffer} buffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function bufferClone(buffer) {
  var result = new ArrayBuffer(buffer.byteLength),
      view = new Uint8Array(result);

  view.set(new Uint8Array(buffer));
  return result;
}

/**
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  var length = array.length,
      result = new array.constructor(length);

  // Add array properties assigned by `RegExp#exec`.
  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}

/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  var Ctor = object.constructor;
  if (!(typeof Ctor == 'function' && Ctor instanceof Ctor)) {
    Ctor = Object;
  }
  return new Ctor;
}

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, isDeep) {
  var Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag:
      return bufferClone(object);

    case boolTag:
    case dateTag:
      return new Ctor(+object);

    case float32Tag: case float64Tag:
    case int8Tag: case int16Tag: case int32Tag:
    case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
      var buffer = object.buffer;
      return new Ctor(isDeep ? bufferClone(buffer) : buffer, object.byteOffset, object.length);

    case numberTag:
    case stringTag:
      return new Ctor(object);

    case regexpTag:
      var result = new Ctor(object.source, reFlags.exec(object));
      result.lastIndex = object.lastIndex;
  }
  return result;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = baseClone;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"lodash._arraycopy":379,"lodash._arrayeach":380,"lodash._baseassign":381,"lodash._basefor":383,"lodash.isarray":384,"lodash.keys":385}],379:[function(require,module,exports){
/**
 * lodash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function arrayCopy(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

module.exports = arrayCopy;

},{}],380:[function(require,module,exports){
/**
 * lodash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `_.forEach` for arrays without support for callback
 * shorthands or `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

module.exports = arrayEach;

},{}],381:[function(require,module,exports){
arguments[4][86][0].apply(exports,arguments)
},{"dup":86,"lodash._basecopy":382,"lodash.keys":385}],382:[function(require,module,exports){
arguments[4][87][0].apply(exports,arguments)
},{"dup":87}],383:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = baseFor;

},{}],384:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"dup":46}],385:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48,"lodash._getnative":386,"lodash.isarguments":387,"lodash.isarray":384}],386:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49}],387:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45}],388:[function(require,module,exports){
arguments[4][89][0].apply(exports,arguments)
},{"dup":89}],389:[function(require,module,exports){
/**
 * lodash 3.1.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseAssign = require('lodash._baseassign'),
    baseCreate = require('lodash._basecreate'),
    isIterateeCall = require('lodash._isiterateecall');

/**
 * Creates an object that inherits from the given `prototype` object. If a
 * `properties` object is provided its own enumerable properties are assigned
 * to the created object.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} prototype The object to inherit from.
 * @param {Object} [properties] The properties to assign to the object.
 * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
 * @returns {Object} Returns the new object.
 * @example
 *
 * function Shape() {
 *   this.x = 0;
 *   this.y = 0;
 * }
 *
 * function Circle() {
 *   Shape.call(this);
 * }
 *
 * Circle.prototype = _.create(Shape.prototype, {
 *   'constructor': Circle
 * });
 *
 * var circle = new Circle;
 * circle instanceof Circle;
 * // => true
 *
 * circle instanceof Shape;
 * // => true
 */
function create(prototype, properties, guard) {
  var result = baseCreate(prototype);
  if (guard && isIterateeCall(prototype, properties, guard)) {
    properties = undefined;
  }
  return properties ? baseAssign(result, properties) : result;
}

module.exports = create;

},{"lodash._baseassign":390,"lodash._basecreate":396,"lodash._isiterateecall":397}],390:[function(require,module,exports){
arguments[4][86][0].apply(exports,arguments)
},{"dup":86,"lodash._basecopy":391,"lodash.keys":392}],391:[function(require,module,exports){
arguments[4][87][0].apply(exports,arguments)
},{"dup":87}],392:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48,"lodash._getnative":393,"lodash.isarguments":394,"lodash.isarray":395}],393:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49}],394:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45}],395:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"dup":46}],396:[function(require,module,exports){
/**
 * lodash 3.0.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} prototype The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(prototype) {
    if (isObject(prototype)) {
      object.prototype = prototype;
      var result = new object;
      object.prototype = undefined;
    }
    return result || {};
  };
}());

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = baseCreate;

},{}],397:[function(require,module,exports){
arguments[4][90][0].apply(exports,arguments)
},{"dup":90}],398:[function(require,module,exports){
'use strict';
/* eslint-disable consistent-return */

function convertToLegacyShippingAddress(address) {
  var prop;
  var legacyShippingAddress = {};

  if (!address) {
    return;
  }

  for (prop in address) {
    if (address.hasOwnProperty(prop)) {
      legacyShippingAddress[toSnakeCase(prop)] = address[prop];
    }
  }

  return legacyShippingAddress;
}

function toSnakeCase(string) {
  return string.replace(/([A-Z])/g, function ($1) {
    return '_' + $1.toLowerCase();
  });
}

module.exports = {convertToLegacyShippingAddress: convertToLegacyShippingAddress};

},{}],399:[function(require,module,exports){
'use strict';

module.exports = {
  ROOT_SUCCESS_CALLBACK: 'onPaymentMethodReceived',
  ROOT_ERROR_CALLBACK: 'onError',
  ROOT_READY_CALLBACK: 'onReady'
};

},{}],400:[function(require,module,exports){
(function (global){
'use strict';

var api = require('braintree-api');
var Bus = require('braintree-bus');
var Destructor = require('destructor');
var bind = require('braintree-utilities').bind;
var constants = require('../constants');
var sanitizePayload = require('../lib/sanitize-payload');
var lookupCallbackFor = require('../lib/lookup-callback-for');
var fallbackErrorHandler = require('../lib/fallback-error-handler');

function noop() {}

function _handleDependencyInitializing() {
  this._dependenciesRemaining++;
}

function _handleDependencyReady() {
  this._dependenciesRemaining--;

  if (this._dependenciesRemaining === 0) {
    delete this._dependenciesRemaining;

    this.bus.off(Bus.events.ASYNC_DEPENDENCY_INITIALIZING, this._handleDependencyInitializing);
    this.bus.off(Bus.events.ASYNC_DEPENDENCY_READY, this._handleDependencyReady);

    this._onIntegrationReady();
  }
}

function BaseIntegration(configuration) {
  this.configuration = configuration;

  this.isReady = false;

  this.destructor = new Destructor();

  this.bus = new Bus({
    channel: this.configuration.channel,
    merchantUrl: global.location.href
  });

  this._createApiClient();
  this._configureCallbacks();
  this._configureAnalytics();
  this._attachEvents();
  this._emitInitializing();
}

BaseIntegration.prototype._emitInitializing = function () {
  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_INITIALIZING);
};

BaseIntegration.prototype._createApiClient = function () {
  var apiClientOptions = {
    clientToken: this.configuration.gatewayConfiguration,
    integration: this.configuration.integrationType,
    analyticsConfiguration: this.configuration.analyticsConfiguration
  };

  if (this.configuration.merchantConfiguration.enableCORS) {
    apiClientOptions.enableCORS = true;
  }

  this.apiClient = new api.Client(apiClientOptions);
  // TODO: investigate whether we need to tear these down
};

BaseIntegration.prototype._configureCallbacks = function () {
  var getCallback = lookupCallbackFor(this.configuration.merchantConfiguration);

  function successHandler(fn) {
    return function (payload) {
      fn(sanitizePayload(payload));
    };
  }

  this.onSuccess = successHandler(getCallback(constants.ROOT_SUCCESS_CALLBACK));
  this.onError = getCallback(constants.ROOT_ERROR_CALLBACK, fallbackErrorHandler);
  this.onReady = getCallback(constants.ROOT_READY_CALLBACK);
};

BaseIntegration.prototype._configureAnalytics = function () {
  var prefix = 'web.' + this.configuration.integrationType + '.';
  var apiClient = this.apiClient;

  this.bus.on(Bus.events.SEND_ANALYTICS_EVENTS, function (events, callback) {
    var i;

    if (!(events instanceof Array)) {
      events = [events];
    }

    for (i = 0; i < events.length; i++) {
      events[i] = prefix + events[i];
    }

    apiClient.sendAnalyticsEvents(events, callback);
    // TODO: maybe this needs to be canceled
  });
};

BaseIntegration.prototype._attachEvents = function () {
  var configuration = this.configuration;

  this.bus.on(Bus.events.ERROR, this.onError);
  this.bus.on(Bus.events.PAYMENT_METHOD_RECEIVED, this.onSuccess);

  this.bus.on(Bus.events.WARNING, function (warning) {
    try { console.warn(warning); } catch (e) { /* ignored */ } // eslint-disable-line no-console
  });

  this.bus.on(Bus.events.CONFIGURATION_REQUEST, function (reply) {
    // TODO: Coinbase and Hosted Fields both expect this reply
    // in this format. We need to amend that
    reply({
      // We do not want to send the entire merchantConfiguration object
      // because it could contain unserializable DOM nodes
      enableCORS: configuration.merchantConfiguration.enableCORS,
      configuration: configuration.gatewayConfiguration,
      integration: configuration.integrationType,
      analyticsConfiguration: configuration.analyticsConfiguration
    });
  });

  this._dependenciesRemaining = 0;
  this._handleDependencyInitializing = bind(_handleDependencyInitializing, this);
  this._handleDependencyReady = bind(_handleDependencyReady, this);
  this.bus.on(Bus.events.ASYNC_DEPENDENCY_INITIALIZING, this._handleDependencyInitializing);
  this.bus.on(Bus.events.ASYNC_DEPENDENCY_READY, this._handleDependencyReady);
};

BaseIntegration.prototype._onIntegrationReady = function () {
  var instance = {
    teardown: bind(function (done) {
      var key;
      var message = 'Cannot call teardown while in progress';

      done = done || noop;

      function teardownReply() {
        throw new Error(message);
      }

      for (key in instance) {
        if (instance.hasOwnProperty(key)) {
          instance[key] = teardownReply;
        }
      }

      this.destructor.teardown(bind(function () { // eslint-disable-line no-invalid-this
        message = 'Cannot teardown integration more than once';

        this.bus.teardown(); // eslint-disable-line no-invalid-this
        done();
      }, this)); // eslint-disable-line no-invalid-this
    }, this) // eslint-disable-line no-invalid-this
  };

  this.isReady = true;
  this.onReady(instance);
};

module.exports = BaseIntegration;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../constants":399,"../lib/fallback-error-handler":406,"../lib/lookup-callback-for":407,"../lib/sanitize-payload":408,"braintree-api":21,"braintree-bus":52,"braintree-utilities":373,"destructor":374}],401:[function(require,module,exports){
'use strict';

var clone = require('lodash.clonedeep');
var create = require('lodash.create');
var api = require('braintree-api');
var bind = require('braintree-utilities').bind;
var coinbase = require('braintree-coinbase');
var Bus = require('braintree-bus');
var BaseIntegration = require('./base-integration');

function CoinbaseIntegration() {
  var coinbaseConfiguration, coinbaseIntegration;

  BaseIntegration.apply(this, arguments);

  coinbaseConfiguration = clone(this.configuration.merchantConfiguration);

  this._attachBusEvents();

  coinbaseConfiguration.channel = this.configuration.channel;
  coinbaseConfiguration.configuration = clone(this.configuration.gatewayConfiguration);
  coinbaseConfiguration.coinbase = clone(coinbaseConfiguration.coinbase || {});
  coinbaseConfiguration.apiClient = new api.Client({
    enableCORS: this.configuration.merchantConfiguration.enableCORS || false,
    clientToken: this.configuration.gatewayConfiguration,
    integration: 'coinbase'
  });
  // TODO: investigate whether API client needs to be torn down

  coinbaseIntegration = coinbase.create(coinbaseConfiguration);
  this.destructor.registerFunctionForTeardown(function (done) {
    coinbaseIntegration.teardown(done);
  });

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_READY);
}

CoinbaseIntegration.prototype = create(BaseIntegration.prototype, {
  constructor: CoinbaseIntegration
});

CoinbaseIntegration.prototype._attachBusEvents = function () {
  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, bind(this._onPaymentMethodGenerated, this));
};

CoinbaseIntegration.prototype._onPaymentMethodGenerated = function (payload) {
  this.bus.emit(Bus.events.PAYMENT_METHOD_RECEIVED, payload);
};

module.exports = CoinbaseIntegration;

},{"./base-integration":400,"braintree-api":21,"braintree-bus":52,"braintree-coinbase":56,"braintree-utilities":373,"lodash.clonedeep":377,"lodash.create":389}],402:[function(require,module,exports){
'use strict';

var clone = require('lodash.clonedeep');
var create = require('lodash.create');
var form = require('braintree-form');
var paypal = require('braintree-paypal');
var coinbase = require('braintree-coinbase');
var utils = require('braintree-utilities');
var constants = require('../constants');
var Bus = require('braintree-bus');
var convertToLegacyShippingAddress = require('../compatibility').convertToLegacyShippingAddress;
var BaseIntegration = require('./base-integration');

function CustomIntegration() {
  BaseIntegration.apply(this, arguments);

  this._setupForm();
  this._setupPayPal();
  this._setupCoinbase();

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_READY);
}

CustomIntegration.prototype = create(BaseIntegration.prototype, {
  constructor: CustomIntegration
});

CustomIntegration.prototype._setupForm = function () {
  var merchantConfiguration = this.configuration.merchantConfiguration;
  var formShouldAutoSubmit, successCallback, formIntegration;

  if (merchantConfiguration.id) {
    formIntegration = form.setup(this.apiClient, this.configuration);

    formShouldAutoSubmit = !utils.isFunction(merchantConfiguration[constants.ROOT_SUCCESS_CALLBACK]);
    if (!formShouldAutoSubmit) {
      successCallback = this.onSuccess;
      formIntegration.onNonceReceived = utils.bind(function (err, payload) {
        if (err) {
          this.bus.emit(Bus.events.ERROR, err); // eslint-disable-line no-invalid-this
        } else {
          successCallback(payload);
        }
      }, this);
    }

    this.destructor.registerFunctionForTeardown(function () {
      formIntegration.teardown();
    });
  } else {
    this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, utils.bind(function (payload) {
      this.bus.emit(Bus.events.PAYMENT_METHOD_RECEIVED, payload); // eslint-disable-line no-invalid-this
    }, this));
  }
};

CustomIntegration.prototype._setupPayPal = function () {
  var paypalCallbackLookup, legacyPaypalSuccessCallback, legacyPaypalCancelledCallback, dummyInput, paypalIntegration, paypalConfiguration;
  var merchantConfiguration = this.configuration.merchantConfiguration;

  if (!merchantConfiguration.paypal) { return; }

  paypalConfiguration = clone(merchantConfiguration.paypal, function (value) {
    var isHtmlElement = value && value.nodeType === 1;
    if (isHtmlElement) {
      return value;
    }
  });

  paypalCallbackLookup = getIntegrationCallbackLookup(merchantConfiguration, 'paypal');
  legacyPaypalSuccessCallback = paypalCallbackLookup('onSuccess');
  legacyPaypalCancelledCallback = paypalCallbackLookup('onCancelled');

  if (!paypalConfiguration.paymentMethodNonceInputField) {
    dummyInput = document.createElement('input');
    dummyInput.id = 'braintree-custom-integration-dummy-input';
    paypalConfiguration.paymentMethodNonceInputField = dummyInput;
  }

  paypalConfiguration.onSuccess = function (payload) {
    legacyPaypalSuccessCallback(
      payload.nonce,
      payload.details.email,
      convertToLegacyShippingAddress(payload.details.shippingAddress)
    );
  };

  paypalConfiguration.onCancelled = utils.bind(function () {
    this.bus.emit(Bus.events.PAYMENT_METHOD_CANCELLED); // eslint-disable-line no-invalid-this
    legacyPaypalCancelledCallback();
  }, this);

  // In a custom integration, paypal options are nested inside of the paypal object
  // so the paypalConfiguration needs to be augmented with the value from the root
  // merchantConfiguration object for CORS
  // TODO: Update paypal create signature
  if (merchantConfiguration.enableCORS) {
    paypalConfiguration.enableCORS = true;
  }

  paypalIntegration = paypal.create(this.configuration.gatewayConfiguration, paypalConfiguration, this.configuration.channel);

  this.destructor.registerFunctionForTeardown(function () {
    paypalIntegration.teardown();
  });
};

CustomIntegration.prototype._setupCoinbase = function () {
  var coinbaseConfiguration, coinbaseIntegration;

  if (!this.configuration.merchantConfiguration.coinbase) { return; }

  if (navigator.userAgent.match(/MSIE 8\.0/)) { return; }

  coinbaseConfiguration = clone(this.configuration.merchantConfiguration);
  coinbaseConfiguration.channel = this.configuration.channel;
  coinbaseConfiguration.configuration = this.configuration.gatewayConfiguration;
  coinbaseConfiguration.apiClient = this.apiClient;
  delete coinbaseConfiguration.paypal;

  coinbaseIntegration = coinbase.create(coinbaseConfiguration);

  this.destructor.registerFunctionForTeardown(function (done) {
    coinbaseIntegration.teardown(done);
  });
};

function getIntegrationCallbackLookup(options, integration) {
  return function (funcName) {
    if (integration in options && utils.isFunction(options[integration][funcName])) {
      return options[integration][funcName];
    }
    return function noop() {};
  };
}

module.exports = CustomIntegration;

},{"../compatibility":398,"../constants":399,"./base-integration":400,"braintree-bus":52,"braintree-coinbase":56,"braintree-form":246,"braintree-paypal":345,"braintree-utilities":373,"lodash.clonedeep":377,"lodash.create":389}],403:[function(require,module,exports){
'use strict';

var create = require('lodash.create');
var dropin = require('braintree-dropin');
var utils = require('braintree-utilities');
var Bus = require('braintree-bus');
var constants = require('../constants');
var sanitizePayload = require('../lib/sanitize-payload');
var BaseIntegration = require('./base-integration');

function _getLegacyCallback(options) {
  if (utils.isFunction(options.paymentMethodNonceReceived)) {
    return options.paymentMethodNonceReceived;
  }

  return null;
}

function _hasRootCallback(options) {
  return utils.isFunction(options[constants.ROOT_SUCCESS_CALLBACK]);
}

function DropinIntegration() {
  var merchantConfiguration, legacyCallback, hasRootCallback, dropinIntegration;

  BaseIntegration.apply(this, arguments);

  merchantConfiguration = this.configuration.merchantConfiguration;
  legacyCallback = _getLegacyCallback(merchantConfiguration);
  hasRootCallback = _hasRootCallback(merchantConfiguration);

  if (legacyCallback || hasRootCallback) {
    merchantConfiguration.paymentMethodNonceReceived = utils.bind(function (payload) {
      if (legacyCallback) {
        legacyCallback(payload.originalEvent, payload.nonce);
      }

      this.bus.emit(Bus.events.PAYMENT_METHOD_RECEIVED, sanitizePayload(payload)); // eslint-disable-line no-invalid-this
    }, this);
  }

  dropinIntegration = dropin.create(this.configuration);
  this.destructor.registerFunctionForTeardown(function (done) {
    dropinIntegration.teardown(done);
  });

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_READY);
}

DropinIntegration.prototype = create(BaseIntegration.prototype, {
  constructor: DropinIntegration
});

module.exports = DropinIntegration;

},{"../constants":399,"../lib/sanitize-payload":408,"./base-integration":400,"braintree-bus":52,"braintree-dropin":237,"braintree-utilities":373,"lodash.create":389}],404:[function(require,module,exports){
'use strict';

module.exports = {
  custom: require('./custom'),
  dropin: require('./dropin'),
  paypal: require('./paypal'),
  coinbase: require('./coinbase')
};

},{"./coinbase":401,"./custom":402,"./dropin":403,"./paypal":405}],405:[function(require,module,exports){
'use strict';

var create = require('lodash.create');
var paypal = require('braintree-paypal');
var utils = require('braintree-utilities');
var constants = require('../constants');
var Bus = require('braintree-bus');
var convertToLegacyShippingAddress = require('../compatibility').convertToLegacyShippingAddress;
var BaseIntegration = require('./base-integration');

function _getLegacyCallback(options) {
  if ('onSuccess' in options && utils.isFunction(options.onSuccess)) {
    return options.onSuccess;
  } else if ('paypal' in options && utils.isFunction(options.paypal.onSuccess)) {
    return options.paypal.onSuccess;
  }

  return null;
}

function _hasRootCallback(options) {
  return utils.isFunction(options[constants.ROOT_SUCCESS_CALLBACK]);
}

function PayPalIntegration() {
  var merchantConfiguration, legacyCallback, hasRootCallback, paypalIntegration;

  BaseIntegration.apply(this, arguments);

  merchantConfiguration = this.configuration.merchantConfiguration;
  legacyCallback = _getLegacyCallback(merchantConfiguration);
  hasRootCallback = _hasRootCallback(merchantConfiguration);

  if (legacyCallback || hasRootCallback) {
    merchantConfiguration.onSuccess = utils.bind(function (payload) {
      if (legacyCallback) {
        legacyCallback(
          payload.nonce,
          payload.details.email,
          convertToLegacyShippingAddress(payload.details.shippingAddress)
        );
      }

      this.bus.emit(Bus.events.PAYMENT_METHOD_RECEIVED, payload); // eslint-disable-line no-invalid-this
    }, this);
  }

  paypalIntegration = paypal.create(this.configuration.gatewayConfiguration, merchantConfiguration, this.configuration.channel);

  this.destructor.registerFunctionForTeardown(function () {
    paypalIntegration.teardown();
  });

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_READY);
}

PayPalIntegration.prototype = create(BaseIntegration.prototype, {
  constructor: PayPalIntegration
});

module.exports = PayPalIntegration;

},{"../compatibility":398,"../constants":399,"./base-integration":400,"braintree-bus":52,"braintree-paypal":345,"braintree-utilities":373,"lodash.create":389}],406:[function(require,module,exports){
'use strict';

module.exports = function fallbackError(error) {
  if (error.type === 'CONFIGURATION' || error.type === 'IMMEDIATE') {
    throw new Error(error.message);
  } else {
    try {
      console.error(JSON.stringify(error)); // eslint-disable-line no-console
    } catch (e) { /* ignored */ }
  }
};

},{}],407:[function(require,module,exports){
'use strict';

var isFunction = require('braintree-utilities').isFunction;

function noop() {}

module.exports = function lookupCallbackFor(model) {
  return function (callbackName, fallbackCallback) {
    if (isFunction(model[callbackName])) {
      return model[callbackName];
    } else if (isFunction(fallbackCallback)) {
      return fallbackCallback;
    }

    return noop;
  };
};

},{"braintree-utilities":373}],408:[function(require,module,exports){
'use strict';

module.exports = function sanitizePayload(payload) {
  return {
    nonce: payload.nonce,
    details: payload.details,
    type: payload.type
  };
};

},{}]},{},[1])(1)
});