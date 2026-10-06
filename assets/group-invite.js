(() => {
  const tokens = new URL(window.location.href).searchParams.getAll("token");
  const status = document.getElementById("status");
  if (tokens.length !== 1 || !/^[a-f0-9]{64}$/.test(tokens[0])) {
    document.getElementById("title").textContent = "Ungültige Einladung";
    status.textContent = "Dieser Einladungslink ist unvollständig oder ungültig. Bitte lass dir einen neuen Link von der Gruppe schicken.";
    return;
  }
  const open = document.getElementById("open-app");
  open.href = `com.pace.sports.app://groups/join?token=${tokens[0]}`;
  open.hidden = false;
  document.getElementById("note").hidden = false;
  status.textContent = "Öffne die Einladung in Pace, um der Gruppe beizutreten. Die App prüft, ob deine Einladung noch gültig ist.";
})();
