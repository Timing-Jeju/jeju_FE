/* eslint-env jest, node */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('web map boundary never imports the native Naver Map package', () => {
  const web = fs.readFileSync(
    path.join(root, 'components/NaverMap.web.ts'),
    'utf8',
  );
  expect(web).not.toMatch(/@mj-studio\/react-native-naver-map/);
});

test.each(['app/(tabs)/index.tsx', 'app/live-map.tsx', 'app/schedule-leg.tsx'])(
  '%s imports the platform map boundary',
  (file) => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    expect(source).toMatch(/@\/components\/NaverMap/);
    expect(source).not.toMatch(
      /from ['"]@mj-studio\/react-native-naver-map['"]/,
    );
  },
);
