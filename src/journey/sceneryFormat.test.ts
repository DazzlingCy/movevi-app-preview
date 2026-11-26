import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseRunSceneryFormat } from './sceneryFormat';

const iphone = {
  hlsPublished: true, nativeHls: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X)',
  platform: 'iPhone', maxTouchPoints: 5,
};

test('published native HLS is selected automatically on iPhone and iPad with a desktop user agent', () => {
  assert.equal(chooseRunSceneryFormat(iphone), 'hls');
  assert.equal(chooseRunSceneryFormat({ ...iphone, userAgent: 'Macintosh', platform: 'MacIntel' }), 'hls');
});

test('desktop, unsupported browsers, and local builds without HLS keep the original MP4', () => {
  assert.equal(chooseRunSceneryFormat({ ...iphone, userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0 }), 'mp4');
  assert.equal(chooseRunSceneryFormat({ ...iphone, userAgent: 'Android', platform: 'Linux armv8l' }), 'mp4');
  assert.equal(chooseRunSceneryFormat({ ...iphone, nativeHls: false }), 'mp4');
  assert.equal(chooseRunSceneryFormat({ ...iphone, hlsPublished: false }), 'mp4');
});
