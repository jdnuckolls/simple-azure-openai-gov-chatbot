
let chatHistory = [];
let isListening = false;
let recognizer;

// Check if speech is enabled and hide mic if not
fetch("/speech-enabled")
  .then(res => res.json())
  .then(data => {
    if (!data.enabled) {
      const micBtn = document.getElementById("chatbotMic");
      if (micBtn) micBtn.style.display = "none";
    }
  })
  .catch(err => {
    console.warn("Speech setting check failed:", err);
  });

function handleKeyPress(event) {
  if (event.key === "Enter") sendUserMessage();
}

function sendUserMessage() {
  const input = document.getElementById("chatbotInput");
  const message = input.value.trim();
  if (!message) return;

  addMessage("user", message);
  chatHistory.push({ role: "user", content: message });
  input.value = "";

  getChatbotResponse(message, chatHistory)
    .then((response) => {
      if (response.error) {
        addMessage("bot", response.reply, message);
        return;
      }

      const reply = response.reply || "";
      const sources = response.data_points || [];

      const fallbackPhrases = [
        "i don't know", "i’m not sure", "i am not sure",
        "unable to find", "not able to provide", "can't find",
        "no information available", "i do not have enough information",
        "couldn't find the answer", "sorry, but i couldn’t find the answer",
        "i couldn’t locate the answer", "i'm here and ready to help",
        "how can i assist", "how can i help"
      ];

      const isFallback = fallbackPhrases.some(phrase =>
        reply.toLowerCase().includes(phrase)
      );

      let formattedReply = reply;

      if (!isFallback && sources.length > 0) {
        const uniqueUrls = [...new Set(sources
          .filter(src => src.url && src.url.startsWith("http"))
          .map(src => src.url))];

        if (uniqueUrls.length > 0) {
          formattedReply += "<br/><br/>For more information:<br/>";
          uniqueUrls.forEach((url, idx) => {
            formattedReply += `<a href="${url}" target="_blank">Citation ${idx + 1}</a>`;
          });
        }
      }

      addMessage("bot", formattedReply);
      chatHistory.push(response.assistantMessage);
      localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    })
    .catch((err) => {
      console.error(err);
      addMessage("bot", "⚠️ Something went wrong. Please try again.");
    });
}

function addMessage(sender, message, retryText = null) {
  const chatbotBody = document.getElementById("chatbotBody");
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", sender);
  messageElement.innerHTML = message;

  if (retryText) {
    const retryBtn = document.createElement("button");
    retryBtn.textContent = "🔁 Retry";
    retryBtn.style.marginTop = "8px";
    retryBtn.style.padding = "6px 10px";
    retryBtn.style.fontSize = "12px";
    retryBtn.style.cursor = "pointer";
    retryBtn.onclick = () => {
      addMessage("user", retryText);
      getChatbotResponse(retryText).then((res) => {
        if (res.error) {
          addMessage("bot", res.reply, retryText);
        } else {
          addMessage("bot", res.reply || res);
        }
      });
    };
    messageElement.appendChild(retryBtn);
  }

  chatbotBody.appendChild(messageElement);
  chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

function clearChat() {
  chatHistory = [];
  localStorage.removeItem("chatHistory");
  const chatbotBody = document.getElementById("chatbotBody");
  chatbotBody.innerHTML = "";
}

async function getChatbotResponse(userMessage, history = []) {
  const response = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMessage, history })
  });

  return await response.json();
}

function updateListeningIndicator(active) {
  const input = document.getElementById("chatbotInput");
  input.setAttribute("placeholder", active ? "🎙️ Listening..." : "Type a message...");
}

document.getElementById("chatbotMic").addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  const micButton = document.getElementById("chatbotMic");

  if (isListening && recognizer) {
    recognizer.stopContinuousRecognitionAsync(() => {
      micButton.classList.remove("active");
      updateListeningIndicator(false);
      isListening = false;
    });
    return;
  }

  micButton.classList.add("active");
  updateListeningIndicator(true);

  try {
    const tokenRes = await fetch("/speech-token");
    if (!tokenRes.ok) {
      alert("Failed to get speech token");
      micButton.classList.remove("active");
      return;
    }

    const { token, region } = await tokenRes.json();
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
    speechConfig.speechRecognitionLanguage = "en-US";

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    isListening = true;

    recognizer.recognizeOnceAsync(result => {
      micButton.classList.remove("active");
      updateListeningIndicator(false);
      isListening = false;

      console.log("Speech Result:", result);

      switch (result.reason) {
        case SpeechSDK.ResultReason.RecognizedSpeech:
          document.getElementById("chatbotInput").value = result.text;
          sendUserMessage();
          break;
        case SpeechSDK.ResultReason.NoMatch:
          console.warn("❌ Speech could not be recognized.");
          alert("Speech not recognized. Try again.");
          break;
        case SpeechSDK.ResultReason.Canceled:
          const cancellation = SpeechSDK.CancellationDetails.fromResult(result);
          console.error("❌ Canceled:", cancellation.reason, cancellation.errorDetails);
          alert("Speech canceled: " + cancellation.reason);
          break;
        default:
          alert("Unknown speech recognition result.");
      }

      recognizer.close();
    });

  } catch (err) {
    console.error("Speech recognition error:", err);
    micButton.classList.remove("active");
    updateListeningIndicator(false);
    isListening = false;
  }
});

document.getElementById("chatbotInput").addEventListener("keypress", handleKeyPress);
document.getElementById("chatbotReset").addEventListener("click", clearChat);
