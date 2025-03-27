let player,
  videoData = [
    {
      name: "LayLa",
      id: "535",
      title: "日本と比べてオーストラリアのいいところ",
      videoId: "CU_F-JFvL8I",
      subtitleFile: "srt/535.srt",
    },
  ];
function onYouTubeIframeAPIReady() {
  loadVideo(videoData[0].videoId, videoData[0].subtitleFile);
}
function loadVideo(e, t) {
  player
    ? player.loadVideoById(e)
    : (player = new YT.Player("player", {
        videoId: e,
        playerVars: {
          controls: 1,
          modestbranding: 0,
          rel: 0,
          showinfo: 0,
          disablekb: 0,
          fs: 0,
          playsinline: 1,
          autoplay: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          hl: "vi",
        },
        events: { onReady: onPlayerReady },
      })),
    loadSubtitles(t);
}
function onPlayerReady(e) {
  setInterval(updateSubtitle, 500);
}
document.addEventListener("DOMContentLoaded", function () {
  loadVideoList(), setupMenuToggle();
});
let subtitles = [];
function loadSubtitles(e) {
  fetch(e)
    .then((e) => e.text())
    .then((e) => {
      (subtitles = parseSRT(e)), renderSubtitleList();
    })
    .catch((e) => console.error("Lỗi tải phụ đề:", e));
}
function parseSRT(e) {
  return e
    .trim()
    .split("\n\n")
    .map((e) => {
      var t,
        e = e.split("\n");
      return e.length < 2
        ? null
        : {
            start: toSeconds((t = e[1].split(" --\x3e "))[0]),
            end: toSeconds(t[1]),
            text: e.slice(2).join("\r\n"),
          };
    })
    .filter((e) => null !== e);
}
function toSeconds(e) {
  var [e, t, n] = e.replace(",", ".").split(":");
  return 3600 * parseFloat(e) + 60 * parseFloat(t) + parseFloat(n);
}
function updateSubtitle() {
  if (player && player.getCurrentTime) {
    const t = player.getCurrentTime();
    highlightActiveSubtitle(subtitles.find((e) => t >= e.start && t <= e.end));
  }
}
function renderSubtitleList() {
  const n = document.getElementById("subtitleList");
  (n.innerHTML = ""),
    subtitles.forEach((e) => {
      var t = document.createElement("div");
      (t.className = "subtitle-item"),
        (t.textContent = e.text),
        (t.dataset.start = e.start),
        n.appendChild(t);
    });
}
function highlightActiveSubtitle(t) {
  document.querySelectorAll(".subtitle-item").forEach((e) => {
    e.classList.remove("active"),
      t &&
        parseFloat(e.dataset.start) === t.start &&
        (e.classList.add("active"), e.scrollIntoView({ block: "start" }));
  });
}
function loadVideoList() {
  fetch("videos.json")
    .then((e) => e.json())
    .then((e) => {
      (videoData = e), renderVideoList();
    })
    .catch(() => {
      console.warn("Không tìm thấy videos.json, sử dụng dữ liệu mặc định."),
        renderVideoList();
    });
}
function renderVideoList() {
  const l = document.getElementById("playlistGrid"),
    s =
      ((l.innerHTML = ""),
      videoData.reduce(
        (e, t) => (e[t.name] || (e[t.name] = []), e[t.name].push(t), e),
        {}
      ));
  Object.keys(s).forEach((e) => {
    var t = document.createElement("div"),
      n = (t.classList.add("name-item"), s[e][0].videoId),
      n = `<img src="https://img.youtube.com/vi/${n}/mqdefault.jpg" alt="${e} thumbnail" loading="lazy">`;
    const a = document.createElement("div"),
      i =
        (a.classList.add("name-item-header"),
        (a.innerHTML = n + `<h3>${e}</h3><div class="name-item-arrow">▼</div>`),
        t.appendChild(a),
        document.createElement("div"));
    i.classList.add("video-list"),
      s[e].forEach((e) => {
        var t = document.createElement("div");
        t.classList.add("video-item"),
          (t.innerHTML = `
        <img src="https://img.youtube.com/vi/${e.videoId}/mqdefault.jpg" alt="${e.title}">
        <p class="video-ep">[${e.name}] #${e.ep}</p>
        <p class="video-title"> <span>${e.titleVi}</span> | <span>${e.title}</span></p>
      `),
          t.addEventListener("click", () => {
            loadVideo(e.videoId, e.subtitleFile), closeMenu();
          }),
          i.appendChild(t);
      }),
      t.appendChild(i),
      l.appendChild(t),
      t.addEventListener("click", (e) => {
        i.classList.toggle("show");
        var t = a.querySelector(".name-item-arrow");
        i.classList.contains("show")
          ? (t.textContent = "▲")
          : (t.textContent = "▼");
      });
  });
  var e = document.createElement("div");
  e.classList.add("name-item-empty"), l.appendChild(e);
}
function setupMenuToggle() {
  var e = document.getElementById("menuToggle");
  const t = document.getElementById("playlistMenu"),
    n = document.getElementById("menuOverlay");
  var a = document.getElementById("closeMenu");
  e.addEventListener("click", () => {
    t.classList.add("active"), (n.style.display = "block");
  }),
    a.addEventListener("click", closeMenu),
    n.addEventListener("click", closeMenu);
}
function closeMenu() {
  document.getElementById("playlistMenu").classList.remove("active"),
    (document.getElementById("menuOverlay").style.display = "none");
}
let furiganaEnabled = !1;
async function furiganaSubtitleList() {
  var t = document.getElementById("subtitleList");
  if (
    ((t.innerHTML = ""),
    (document.getElementById("furiganaToggle").style.textDecoration =
      furiganaEnabled ? "line-through" : "none"),
    furiganaEnabled)
  ) {
    var e = document.createElement("div");
    (e.className = "loading-message"),
      (e.innerHTML = "⏳ Đang xử lý Furigana, vui lòng chờ..."),
      (e.style.color = "#255F38"),
      (e.style.marginTop = "20px"),
      (e.style.textAlign = "center"),
      t.appendChild(e);
    try {
      var n = new (Kuroshiro.default || Kuroshiro)();
      await n.init(new KuromojiAnalyzer({ dictPath: "./dict/" })),
        (t.innerHTML = "");
      for (const s of subtitles) {
        var a = document.createElement("div"),
          i =
            ((a.className = "subtitle-item"),
            (a.dataset.start = s.start),
            await n.convert(s.text, { mode: "furigana", to: "hiragana" }));
        (a.innerHTML = i), t.appendChild(a);
      }
    } catch (e) {
      console.error("Lỗi khi tải Furigana:", e),
        (t.innerHTML =
          "<div class='error-message'>⚠️ Lỗi khi tải Furigana!</div>");
    }
  } else
    for (const d of subtitles) {
      var l = document.createElement("div");
      (l.className = "subtitle-item"),
        (l.dataset.start = d.start),
        (l.innerHTML = d.text),
        t.appendChild(l);
    }
}
document
  .getElementById("furiganaToggle")
  .addEventListener("click", async function () {
    (furiganaEnabled = !furiganaEnabled), await furiganaSubtitleList();
  });
