/**
 * react-native-firebase 가 Firebase 를 SPM 으로 끌어오지 않도록 끈다.
 *
 * firebase-ios-sdk 의 Swift Package 산출물은 automatic library 라서, SPM 경로를 쓰면
 * react-native-firebase pod 마다 Firebase 사본을 하나씩 품는다. 이 프로젝트는 static
 * linkage 라 그 사본들이 링크 단계에서 중복 심볼로 충돌하고 `pod install` 이 실패한다.
 *
 * 공식 안내대로 SPM 을 끄면 pod 들이 CocoaPods 로 받은 Firebase 하나를 공유한다.
 * linkage 를 dynamic 으로 바꾸는 대안도 있지만, 그쪽은 앱 기동 시간과 다른 pod 까지
 * 건드리므로 영향 범위가 좁은 이쪽을 쓴다.
 *
 * ios/ 는 prebuild 로 다시 만들어지므로 Podfile 을 직접 고치지 않고 여기서 주입한다.
 */

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FLAG = '$RNFirebaseDisableSPM = true';

module.exports = function withFirebaseDisableSPM(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'Podfile',
      );
      const contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(FLAG)) return modConfig;

      // 어떤 target 블록보다 앞이어야 한다
      const firstTarget = contents.search(/^target /m);
      if (firstTarget === -1) {
        throw new Error('Podfile에서 target 블록을 찾지 못했습니다.');
      }

      fs.writeFileSync(
        podfilePath,
        `${contents.slice(0, firstTarget)}${FLAG}\n\n${contents.slice(firstTarget)}`,
      );

      return modConfig;
    },
  ]);
};
