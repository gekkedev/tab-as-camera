const status = document.querySelector("#status")
async function call(type) {
  status.textContent = "Working…"
  try {
    const response = await chrome.runtime.sendMessage({ type })
    if (!response?.ok) throw new Error(response?.error || "Unknown error")
    status.textContent = response.message
  } catch (error) {
    status.textContent = `Error: ${error.message}`
  }
}
document
  .querySelector("#source")
  .addEventListener("click", () => call("SET_SOURCE"))
document
  .querySelector("#target")
  .addEventListener("click", () => call("ENABLE_TARGET"))
document
  .querySelector("#stop")
  .addEventListener("click", () => call("DISABLE_TARGET"))
