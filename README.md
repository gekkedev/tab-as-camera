# Tab as Camera

A minimal unpacked Chrome extension that substitutes the video returned by `navigator.mediaDevices.getUserMedia()` in one webpage with the live contents of another Chrome tab.

## Privacy

The extension contains no fetch, WebSocket, analytics, external scripts, remote-code loading, or host permissions. Captured frames remain inside Chrome unless the target website itself transmits the camera stream as part of its normal operation.

## Install

1. Extract this directory.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `tab-as-camera` directory.

## Use

1. Open the tab whose contents should become the camera.
2. Click the extension icon, then **Set current tab as source**.
3. Switch to the target website/tab.
4. Click the extension icon, then **Use source as camera in current tab**.
5. Let the website start its camera, or toggle its camera off and on.

## Limitations

- This is not a real operating-system virtual camera.
- It does not add a device to `navigator.mediaDevices.enumerateDevices()`.
- It works by replacing `getUserMedia()` in the target tab.
- Sites using unusual camera code, sandboxed cross-origin iframes, integrity checks, or native desktop components may not work.
- Reloading or navigating the target tab removes the override.
- Navigating or closing the source tab ends capture.
- Chrome 116 or newer is required.

## Troubleshooting

### The site still uses my normal camera

The extension only replaces `getUserMedia()` calls made after you enable it in
the target tab. It cannot replace a camera stream the site already opened.
Turn the site's camera off and back on, or reload the target page, enable the
extension, then start the site's camera. Reloading after enabling disables the
override, so reload before enabling it.
