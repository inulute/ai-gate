const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  const closeButton = document.getElementById("closeButton");

  closeButton.addEventListener("click", () => {
    ipcRenderer.send("close-dialog");
  });
  
  const chatgpt = document.getElementById("chatgpt");
  const bard = document.getElementById("gemini");
  const perplexSearch = document.getElementById("perplexSearch");
  const perplexChat = document.getElementById("perplexChat");
  const claude = document.getElementById("claude");

  chatgpt.addEventListener("click", () => {
    ipcRenderer.send("dialog-response", 0);
  });
  bard.addEventListener("click", () => {
    ipcRenderer.send("dialog-response", 1);
  });
  perplexSearch.addEventListener("click", () => {
    ipcRenderer.send("dialog-response", 2);
  });
  perplexChat.addEventListener("click", () => {
    ipcRenderer.send("dialog-response", 3);
  });
  claude.addEventListener("click", () => {
    ipcRenderer.send("dialog-response", 4);
  });
});

