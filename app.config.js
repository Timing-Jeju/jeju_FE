/**
 * app.json을 기반으로 하되, 네이버 지도 SDK의 client_id를 .env에서 주입한다.
 * (Expo CLI가 config 평가 전에 .env를 로드해준다.)
 *
 * client_id는 네이티브 프로젝트에 새겨지는 값이므로,
 * .env 변경 후에는 `npx expo prebuild` 를 다시 실행해야 반영된다.
 */
module.exports = ({ config }) => {
  const naverMapClientId =
    process.env.EXPO_PUBLIC_NCP_MAPS_CLIENT_ID ?? 'YOUR_NCP_MAPS_CLIENT_ID';

  config.plugins = config.plugins.map((plugin) => {
    if (
      Array.isArray(plugin) &&
      plugin[0] === '@mj-studio/react-native-naver-map'
    ) {
      return [plugin[0], { ...plugin[1], client_id: naverMapClientId }];
    }
    return plugin;
  });

  return config;
};
