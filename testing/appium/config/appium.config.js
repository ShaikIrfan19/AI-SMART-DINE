module.exports = {
  hostname: process.env.APPIUM_HOST || '127.0.0.1',
  port: parseInt(process.env.APPIUM_PORT || '4723', 10),
  path: '/',
  capabilities: {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'Android Emulator',
    'appium:app': process.env.APK_PATH || './mobile/android/app/build/outputs/apk/debug/app-debug.apk',
    'appium:appPackage': 'com.aismartdine',
    'appium:appActivity': '.MainActivity',
    'appium:newCommandTimeout': 300,
    'appium:autoGrantPermissions': true,
  },
};
