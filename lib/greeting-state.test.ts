import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeGreetingToUrl,
  decodeGreetingFromUrl,
  cleanShayariText,
  formatAiCounter,
  generateWhatsAppShareMessage,
  GreetingData,
} from './greeting-state';

test('encodeGreetingToUrl and decodeGreetingFromUrl roundtrip cleanly with Hindi unicode', () => {
  const sample: GreetingData = {
    from: 'शमशाद (Shamshad)',
    to: 'अमित और परिवार (Amit & Family)',
    shayari: 'दीप जलते रहें, जगमगाता रहे आपका संसार! 🪔✨\nशुभ दीपावली!',
    vibe: 'dhamakedar',
    theme: 'gold',
    cracker: 'anar',
  };

  const encodedUrl = encodeGreetingToUrl(sample, 'https://example.com/diwali');
  assert.ok(encodedUrl.startsWith('https://example.com/diwali?card='));

  const cardParam = new URL(encodedUrl).searchParams.get('card');
  assert.ok(cardParam);

  const decoded = decodeGreetingFromUrl(cardParam);
  assert.ok(decoded);
  assert.equal(decoded.from, sample.from);
  assert.equal(decoded.to, sample.to);
  assert.equal(decoded.shayari, sample.shayari);
  assert.equal(decoded.vibe, sample.vibe);
  assert.equal(decoded.theme, sample.theme);
  assert.equal(decoded.cracker, 'anar');
});

test('decodeGreetingFromUrl handles invalid or empty input safely', () => {
  assert.equal(decodeGreetingFromUrl(''), null);
  assert.equal(decodeGreetingFromUrl('invalid-base-64!@#$'), null);
});

test('cleanShayariText removes markdown asterisks, blockquotes, and excessive whitespace', () => {
  const dirty = `
  > **"दीप जलते रहें, जगमगाता रहे आपका संसार!"** 🪔
  > **शुभ दीपावली!**
  `;
  const cleaned = cleanShayariText(dirty);
  assert.ok(!cleaned.includes('**'));
  assert.ok(!cleaned.includes('>'));
  assert.ok(cleaned.includes('दीप जलते रहें'));
  assert.ok(cleaned.includes('शुभ दीपावली'));
});

test('formatAiCounter formats large numbers and zeroes gracefully', () => {
  assert.equal(formatAiCounter(0), '0');
  assert.equal(formatAiCounter(42), '42');
  assert.equal(formatAiCounter(1420), '1.4k');
  assert.equal(formatAiCounter(2500000), '2.5M');
});

test('generateWhatsAppShareMessage outputs clean sender name and link without raw shayari dump', () => {
  const msg = generateWhatsAppShareMessage('शिव सिंह', 'https://example.com/diwali?card=xyz');
  assert.ok(msg.includes('शिव सिंह'));
  assert.ok(msg.includes('ने आपके लिए एक खास 3D दिवाली कार्ड भेजा है'));
  assert.ok(msg.includes('https://example.com/diwali?card=xyz'));
  assert.ok(msg.includes('टच करके अभी खोलें'));
  assert.ok(!msg.includes('दीप जलते रहें'));
});


