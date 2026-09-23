/* Functional jury client. No scenario decisions, provider keys or mock success. */
"use strict";
const $ = (id) => document.getElementById(id);
let sessionId = crypto.randomUUID();
let generation = 0;
let pending = null;
let selected = null;
let audioBusy = false;
let recording = null;
let captureGeneration = 0;
let requestingMicrophone = false;
let sequence = 0;
let turns = [];
const urls = new Set();
const status = (text) => { $("status").textContent = text; };

function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
}
function button(text, handler) {
  const item = node("button", text);
  item.type = "button";
  item.addEventListener("click", handler);
  return item;
}
function updateControls() {
  const busy = !!pending || !!recording || requestingMicrophone;
  $("send").disabled = busy;
  $("text").disabled = busy;
  $("audio-file").disabled = busy;
  $("microphone").disabled = !!pending || requestingMicrophone;
  $("microphone").textContent = recording ? "Остановить и отправить" : "Записать голос";
  $("cancel-recording").hidden = !recording && !requestingMicrophone;
  $("cancel-request").hidden = !pending;
}
function renderTrace() {
  const turn = turns.find((row) => row.id === selected);
  $("trace").textContent = "";
  if (!turn) { $("trace-state").textContent = "После первого запроса появится трассировка."; return; }
  if (!turn.result) {
    $("trace-state").textContent = turn.error ? `Реплика ${turn.id}: ошибка. Успешного trace нет.` : `Реплика ${turn.id}: ожидаем ответ.`;
    return;
  }
  $("trace-state").textContent = `Реплика ${turn.id}, серверный ход ${turn.result.turn}. Режим без выполнения операций.`;
  $("trace").textContent = JSON.stringify({transcript: turn.result.transcript, ...turn.result.trace}, null, 2);
}
function render() {
  const history = $("history");
  history.replaceChildren();
  if (!turns.length) history.append(node("p", "История пока пуста.", "muted"));
  for (const turn of turns) {
    const article = node("article", undefined, `turn${turn.id === selected ? " selected" : ""}`);
    article.append(node("small", `Реплика ${turn.id}`), node("p", turn.result?.transcript || turn.text));
    if (turn.result) article.append(node("p", turn.result.assistant_text));
    else article.append(node("p", turn.error || "Ожидаем OpenAI…", turn.error ? "error" : "muted"));
    const actions = node("div", undefined, "turn-actions");
    actions.append(button("Посмотреть trace", () => { selected = turn.id; render(); }));
    if (turn.result) {
      const speak = button("Озвучить ответ ИИ", () => speakTurn(turn));
      speak.disabled = audioBusy || !!pending;
      actions.append(speak);
    }
    article.append(actions);
    if (turn.audioUrl) {
      const player = document.createElement("audio");
      player.controls = true;
      player.src = turn.audioUrl;
      player.setAttribute("aria-label", "Ответ, озвученный искусственным интеллектом");
      article.append(player);
    }
    if (turn.audioError || turn.result?.audio_error) {
      article.append(node("p", "Озвучка недоступна. Текст и trace сохранены; можно повторить только озвучку.", "error"));
    }
    history.append(article);
  }
  renderTrace(); updateControls();
}
function storeAudio(turn, blob) {
  if (turn.audioUrl) { URL.revokeObjectURL(turn.audioUrl); urls.delete(turn.audioUrl); }
  turn.audioUrl = URL.createObjectURL(blob);
  urls.add(turn.audioUrl);
}
async function responseError(response) {
  let detail;
  try { const body = await response.json(); if (typeof body.detail === "string") detail = body.detail; } catch (_) { /* not JSON */ }
  return new Error(detail || `Ошибка сервера HTTP ${response.status}`);
}
async function submitRequest(text, path, options) {
  if (pending) return;
  const controller = new AbortController();
  const turn = {id: ++sequence, text};
  const token = generation;
  turns.push(turn); selected = turn.id; pending = controller;
  const deadline = setTimeout(() => controller.abort(), 210000);
  render(); status("Обрабатываем запрос. Отмена прекращает ожидание, но не гарантирует остановку сервера.");
  try {
    const response = await fetch(path, {...options, signal: controller.signal});
    if (!response.ok) throw await responseError(response);
    const result = await response.json();
    if (token !== generation) return;
    if (result.session_id !== sessionId || typeof result.assistant_text !== "string" || !result.trace) {
      throw new Error("Ответ не соответствует текущей сессии или контракту.");
    }
    turn.result = result;
    if (result.assistant_audio?.base64) {
      try {
        const bytes = Uint8Array.from(atob(result.assistant_audio.base64), (c) => c.charCodeAt(0));
        storeAudio(turn, new Blob([bytes], {type: "audio/mpeg"}));
      } catch (_) { turn.audioError = true; }
    }
    status("Ответ получен. Голос можно воспроизвести кнопкой на аудиоплеере.");
  } catch (error) {
    if (token !== generation) return;
    turn.error = error.name === "AbortError"
      ? "Ожидание отменено или истекло. Сервер мог продолжить обработку; автоматического повтора нет."
      : error.message || "Не удалось связаться с сервером.";
    status(turn.error);
  } finally {
    clearTimeout(deadline);
    if (token === generation) { pending = null; render(); }
  }
}
async function sendText(event) {
  event?.preventDefault();
  const text = $("text").value.trim();
  if (!text || pending || recording || requestingMicrophone) return;
  $("text").value = "";
  await submitRequest(text, "/v1/turn/text", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({session_id: sessionId, text})});
}
async function sendAudio(blob, name) {
  if (pending) return;
  if (!blob.size || blob.size > 20 * 1024 * 1024) { status("Запись пуста или превышает 20 MiB."); return; }
  const form = new FormData();
  form.append("session_id", sessionId); form.append("include_audio", "true"); form.append("file", blob, name);
  await submitRequest("Голосовая реплика", "/v1/turn/audio", {method: "POST", body: form});
}
async function speakTurn(turn) {
  if (audioBusy || pending || !turn.result) return;
  const token = generation;
  audioBusy = true; turn.audioError = false; render(); status("OpenAI создаёт озвучку ответа…");
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch("/v1/audio/speech", {method: "POST", headers: {"Content-Type": "application/json"}, signal: controller.signal, body: JSON.stringify({text: turn.result.assistant_text})});
    if (!response.ok) throw await responseError(response);
    const blob = await response.blob();
    if (token !== generation) return;
    storeAudio(turn, blob); turn.result.audio_error = null;
    status("Озвучка готова. Нажмите воспроизведение. Голос создан ИИ.");
  } catch (_) { if (token === generation) { turn.audioError = true; status("Озвучка не удалась. Текст ответа сохранён."); } }
  finally { clearTimeout(deadline); audioBusy = false; if (token === generation) render(); }
}
function cancelRecording() {
  captureGeneration++; requestingMicrophone = false;
  if (recording) {
    const capture = recording;
    capture.cancelled = true;
    clearTimeout(capture.timer);
    capture.stream.getTracks().forEach((track) => track.stop());
    if (capture.recorder.state !== "inactive") capture.recorder.stop();
    else recording = null;
  }
  updateControls();
}
async function startRecording() {
  if (recording) { if (recording.recorder.state !== "inactive") recording.recorder.stop(); return; }
  if (pending || requestingMicrophone) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    status("Микрофон недоступен. Откройте localhost или HTTPS; используйте текст либо загрузку записи."); return;
  }
  const token = ++captureGeneration;
  requestingMicrophone = true; updateControls();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio: true});
    if (token !== captureGeneration) { stream.getTracks().forEach((track) => track.stop()); return; }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((value) => MediaRecorder.isTypeSupported(value));
    if (!mime) throw new Error("Браузер не поддерживает согласованный формат WebM/MP4.");
    const recorder = new MediaRecorder(stream, {mimeType: mime});
    const capture = {recorder, stream, chunks: [], cancelled: false, timer: null};
    recording = capture;
    recorder.addEventListener("dataavailable", (event) => { if (event.data.size) capture.chunks.push(event.data); });
    recorder.addEventListener("stop", () => {
      clearTimeout(capture.timer); stream.getTracks().forEach((track) => track.stop());
      if (recording === capture) recording = null;
      updateControls();
      if (!capture.cancelled && token === captureGeneration) {
        const blob = new Blob(capture.chunks, {type: mime});
        sendAudio(blob, mime.startsWith("audio/mp4") ? "recording.mp4" : "recording.webm");
      } else status("Запись отменена; аудио не отправлено.");
    });
    recorder.addEventListener("error", () => {
      capture.cancelled = true;
      clearTimeout(capture.timer);
      stream.getTracks().forEach((track) => track.stop());
      if (recording === capture) recording = null;
      updateControls(); status("Ошибка записи; используйте текст.");
    });
    recorder.start();
    capture.timer = setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 60000);
    status("Идёт запись, максимум 60 секунд. Нажмите «Остановить и отправить».");
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    if (recording?.stream === stream) { clearTimeout(recording.timer); recording = null; }
    status(error.name === "NotAllowedError" ? "Доступ к микрофону не разрешён. Текстовый ввод продолжает работать." : error.message);
  } finally { requestingMicrophone = false; updateControls(); }
}
$("composer").addEventListener("submit", sendText);
$("microphone").addEventListener("click", startRecording);
$("cancel-recording").addEventListener("click", cancelRecording);
$("cancel-request").addEventListener("click", () => pending?.abort());
$("audio-file").addEventListener("change", (event) => { const file = event.target.files[0]; if (file) sendAudio(file, file.name); event.target.value = ""; });
$("new-session").addEventListener("click", () => {
  generation++; pending?.abort(); pending = null; cancelRecording();
  urls.forEach((url) => URL.revokeObjectURL(url)); urls.clear();
  turns = []; selected = null; sequence = 0; sessionId = crypto.randomUUID();
  $("text").value = ""; render(); status("Новая сессия. Предыдущая история не передаётся в новый диалог.");
});
window.addEventListener("pagehide", () => { generation++; pending?.abort(); cancelRecording(); urls.forEach((url) => URL.revokeObjectURL(url)); });
fetch("/health").then(async (response) => {
  if (!response.ok) throw new Error("Проверьте исходный starter-kit и сервер.");
  const health = await response.json();
  $("health").textContent = health.provider_configured
    ? `Загружено сценариев: ${health.business_scenarios}. Ключ задан; живой вызов проверяется только отправкой запроса.`
    : "Сервер работает. Задайте OPENAI_API_KEY в .env.local и перезапустите приложение.";
}).catch((error) => { $("health").textContent = error.message; });
render();
