async function activeTab({ mustBeInjectable = false } = {}) {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  if (!tab?.id) {
    throw new Error("No active tab found.")
  }

  if (mustBeInjectable && !/^https?:/.test(tab.url || "")) {
    throw new Error(
      "The target camera page must be a normal http/https website.",
    )
  }

  return tab
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  ;(async () => {
    if (message.type === "SET_SOURCE") {
      // Source may be a PDF viewer, local file, or ordinary webpage.
      const tab = await activeTab()
      await chrome.storage.session.set({
        sourceTabId: tab.id,
        sourceTitle: tab.title || "Untitled tab",
      })
      sendResponse({
        ok: true,
        message: `Source saved:\n${tab.title || tab.url}`,
      })
      return
    }
    if (message.type === "ENABLE_TARGET") {
      // We must inject JavaScript into the target page, so keep this
      // restricted to ordinary websites.
      const target = await activeTab({ mustBeInjectable: true })
      const { sourceTabId, sourceTitle } = await chrome.storage.session.get([
        "sourceTabId",
        "sourceTitle",
      ])
      if (!sourceTabId) throw new Error("Set a source tab first.")
      if (sourceTabId === target.id)
        throw new Error("The source and target must be different tabs.")
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: sourceTabId,
        consumerTabId: target.id,
      })
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: target.id, allFrames: false },
        world: "MAIN",
        func: installTabCamera,
        args: [streamId],
      })
      if (!result?.ok) throw new Error(result?.error || "Injection failed.")
      sendResponse({
        ok: true,
        message: `Enabled in this tab.\nSource: ${sourceTitle || sourceTabId}\nReloading the target page will disable it.`,
      })
      return
    }
    if (message.type === "DISABLE_TARGET") {
      const target = await activeTab()
      await chrome.scripting.executeScript({
        target: { tabId: target.id, allFrames: false },
        world: "MAIN",
        func: uninstallTabCamera,
      })
      sendResponse({ ok: true, message: "Disabled in the current tab." })
      return
    }
    throw new Error("Unknown command.")
  })().catch(error => sendResponse({ ok: false, error: error.message }))
  return true
})
async function installTabCamera(streamId) {
  try {
    const stateKey = "__tabAsCameraState_v1"
    let state = window[stateKey]
    if (!state) {
      const mediaDevices = navigator.mediaDevices
      const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices)
      state = { originalGetUserMedia, capturedStream: null, enabled: true }
      window[stateKey] = state
      mediaDevices.getUserMedia = async function (constraints = {}) {
        const wantsVideo = Boolean(constraints && constraints.video)
        if (!state.enabled || !wantsVideo || !state.capturedStream)
          return state.originalGetUserMedia(constraints)
        const output = new MediaStream()
        for (const track of state.capturedStream.getVideoTracks())
          output.addTrack(track.clone())
        if (constraints.audio) {
          const microphone = await state.originalGetUserMedia({
            audio: constraints.audio,
            video: false,
          })
          for (const track of microphone.getAudioTracks())
            output.addTrack(track)
        }
        return output
      }
    }
    if (state.capturedStream)
      for (const track of state.capturedStream.getTracks()) track.stop()
    state.enabled = true
    state.capturedStream = await state.originalGetUserMedia({
      audio: false,
      video: {
        mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId },
      },
    })
    const videoTrack = state.capturedStream.getVideoTracks()[0]
    if (!videoTrack) throw new Error("Chrome returned no video track.")
    videoTrack.addEventListener("ended", () => {
      state.capturedStream = null
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error?.message || error) }
  }
}
function uninstallTabCamera() {
  const stateKey = "__tabAsCameraState_v1"
  const state = window[stateKey]
  if (!state) return { ok: true }
  state.enabled = false
  if (state.capturedStream) {
    for (const track of state.capturedStream.getTracks()) track.stop()
    state.capturedStream = null
  }
  navigator.mediaDevices.getUserMedia = state.originalGetUserMedia
  delete window[stateKey]
  return { ok: true }
}
