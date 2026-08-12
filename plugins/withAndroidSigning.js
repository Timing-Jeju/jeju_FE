/**
 * 안드로이드 release 빌드에 업로드 키스토어 서명을 주입한다.
 *
 * android/ 는 .gitignore 대상이라 `npx expo prebuild` 때마다 재생성된다.
 * 그래서 build.gradle 을 직접 고치는 대신 config plugin 으로 주입한다.
 *
 * 키스토어 정보는 저장소에 남기지 않고 ~/.gradle/gradle.properties 에서 읽는다.
 *   TOURIST_UPLOAD_STORE_FILE / TOURIST_UPLOAD_STORE_PASSWORD
 *   TOURIST_UPLOAD_KEY_ALIAS  / TOURIST_UPLOAD_KEY_PASSWORD
 *
 * 위 값이 없는 환경(다른 개발자 PC, CI 등)에서는 기존처럼 debug 키로 서명해
 * 로컬 release 빌드가 깨지지 않도록 한다.
 */

const { withAppBuildGradle } = require('expo/config-plugins');

const HAS_UPLOAD_KEY = "project.hasProperty('TOURIST_UPLOAD_STORE_FILE')";

const DEBUG_SIGNING_CONFIG = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

const RELEASE_SIGNING_CONFIG = `${DEBUG_SIGNING_CONFIG}
        release {
            if (${HAS_UPLOAD_KEY}) {
                storeFile file(TOURIST_UPLOAD_STORE_FILE)
                storePassword TOURIST_UPLOAD_STORE_PASSWORD
                keyAlias TOURIST_UPLOAD_KEY_ALIAS
                keyPassword TOURIST_UPLOAD_KEY_PASSWORD
            }
        }`;

const DEBUG_SIGNING_IN_RELEASE =
  'signingConfig signingConfigs.debug\n            def enableShrinkResources';
const UPLOAD_SIGNING_IN_RELEASE = `signingConfig ${HAS_UPLOAD_KEY} ? signingConfigs.release : signingConfigs.debug
            def enableShrinkResources`;

module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    const { modResults } = gradleConfig;

    if (modResults.language !== 'groovy') {
      throw new Error(
        'withAndroidSigning: build.gradle 이 groovy 가 아니어서 서명 설정을 주입할 수 없습니다.',
      );
    }

    if (modResults.contents.includes('TOURIST_UPLOAD_STORE_FILE')) {
      return gradleConfig;
    }

    if (!modResults.contents.includes(DEBUG_SIGNING_CONFIG)) {
      throw new Error(
        'withAndroidSigning: signingConfigs.debug 블록을 찾지 못했습니다. build.gradle 템플릿이 바뀌었는지 확인하세요.',
      );
    }

    if (!modResults.contents.includes(DEBUG_SIGNING_IN_RELEASE)) {
      throw new Error(
        'withAndroidSigning: buildTypes.release 의 signingConfig 를 찾지 못했습니다. build.gradle 템플릿이 바뀌었는지 확인하세요.',
      );
    }

    modResults.contents = modResults.contents
      .replace(DEBUG_SIGNING_CONFIG, RELEASE_SIGNING_CONFIG)
      .replace(DEBUG_SIGNING_IN_RELEASE, UPLOAD_SIGNING_IN_RELEASE);

    return gradleConfig;
  });
};
