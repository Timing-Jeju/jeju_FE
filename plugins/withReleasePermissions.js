/**
 * 릴리스 빌드에서 SYSTEM_ALERT_WINDOW(다른 앱 위에 표시) 권한을 제거한다.
 *
 * expo-dev-client 가 개발용 디버그 메뉴를 띄우려고 main 매니페스트에 이 권한을
 * 넣는데, main 은 모든 variant 에 병합되므로 릴리스 AAB 에도 그대로 실린다.
 * 앱 기능에는 쓰이지 않고 Play 에는 민감 권한으로 노출되므로 제거한다.
 *
 * 디버그 빌드는 android/app/src/debug/AndroidManifest.xml 이 같은 권한을 따로
 * 선언하므로, main 에서만 지워도 개발용 디버그 메뉴는 그대로 동작한다.
 */

const { withAndroidManifest } = require('expo/config-plugins');

const OVERLAY_PERMISSION = 'android.permission.SYSTEM_ALERT_WINDOW';
const PERMISSION_KEYS = ['uses-permission', 'uses-permission-sdk-23'];

module.exports = function withReleasePermissions(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const { manifest } = manifestConfig.modResults;

    PERMISSION_KEYS.forEach((key) => {
      if (!Array.isArray(manifest[key])) return;

      manifest[key] = manifest[key].filter(
        (permission) => permission.$?.['android:name'] !== OVERLAY_PERMISSION,
      );
    });

    return manifestConfig;
  });
};
