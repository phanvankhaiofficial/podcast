let player;
let videoData = [
  {
    name: "LayLa",
    id: "535",
    title: "日本と比べてオーストラリアのいいところ",
    videoId: "CU_F-JFvL8I",
    subtitleFile: "srt/535.srt",
  },
];

document.addEventListener("DOMContentLoaded", function () {
  loadVideoList();
  setupMenuToggle();
});

function onYouTubeIframeAPIReady() {
  loadVideo(videoData[0].videoId, videoData[0].subtitleFile);
}

function loadVideo(videoId, subtitleFile) {
  if (player) {
    player.loadVideoById(videoId);
  } else {
    player = new YT.Player("player", {
      videoId: videoId,
      playerVars: {
        controls: 1, // Hiển thị toàn bộ controls
        modestbranding: 0, // Cho phép hiển thị logo YouTube
        rel: 0, // Hiển thị video liên quan
        showinfo: 0, // Hiển thị thông tin video
        disablekb: 0, // Bật phím tắt
        fs: 0, // Cho phép full-screen
        playsinline: 1, // Hỗ trợ phát inline trên iOS
        autoplay: 1,
        iv_load_policy: 3,
        cc_load_policy: 0,
        hl: "vi",
      },
      events: {
        onReady: onPlayerReady,
      },
    });
  }

  loadSubtitles(subtitleFile);
}

function onPlayerReady(event) {
  setInterval(updateSubtitle, 500);
}

let subtitles = [];
function loadSubtitles(subtitleFile) {
  fetch(subtitleFile)
    .then((response) => response.text())
    .then((data) => {
      subtitles = parseSRT(data);
      renderSubtitleList();
    })
    .catch((error) => console.error("Lỗi tải phụ đề:", error));
}

function parseSRT(srt) {
  return srt
    .trim()
    .split("\n\n")
    .map((entry) => {
      const lines = entry.split("\n");
      if (lines.length < 2) return null;
      const time = lines[1].split(" --> ");
      return {
        start: toSeconds(time[0]),
        end: toSeconds(time[1]),
        text: lines.slice(2).join("\r\n"),
      };
    })
    .filter((sub) => sub !== null);
}

function toSeconds(time) {
  const [h, m, s] = time.replace(",", ".").split(":");
  return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);
}

function updateSubtitle() {
  if (player && player.getCurrentTime) {
    const time = player.getCurrentTime();
    const sub = subtitles.find((s) => time >= s.start && time <= s.end);
    // document.getElementById("subtitle").innerHTML = sub
    //   ? sub.text.replace(/\r\n/g, "<br>")
    //   : "";
    highlightActiveSubtitle(sub);
  }
}

function renderSubtitleList() {
  const subtitleList = document.getElementById("subtitleList");
  subtitleList.innerHTML = "";
  let lastStartTime = 0;
  subtitles.forEach((sub) => {
    const div = document.createElement("div");
    div.className = "subtitle-item";
    div.textContent = sub.text;
    div.dataset.start = sub.start;
    subtitleList.appendChild(div);
    lastStartTime = sub.start;
  });

  let currentStartTime = lastStartTime + 30;
  for (let i = 0; i < 20; i++) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "subtitle-item empty";
    emptyDiv.textContent = " ";
    emptyDiv.dataset.start = currentStartTime;
    subtitleList.appendChild(emptyDiv);

    currentStartTime += 3;
  }
}

function highlightActiveSubtitle(activeSub) {
  const subtitleItems = document.querySelectorAll(".subtitle-item");
  subtitleItems.forEach((item) => {
    item.classList.remove("active");
    if (activeSub && parseFloat(item.dataset.start) === activeSub.start) {
      item.classList.add("active");

      item.scrollIntoView({ block: "start" });
    }
  });
}

// menu list
function loadVideoList() {
  fetch("videos.json")
    .then((response) => response.json())
    .then((data) => {
      videoData = data;
      renderVideoList();
    })
    .catch(() => {
      console.warn("Không tìm thấy videos.json, sử dụng dữ liệu mặc định.");
      renderVideoList();
    });
}

// function renderVideoList() {
//   const playlistContainer = document.getElementById("playlist");
//   playlistContainer.innerHTML = "";

//   videoData.forEach((video) => {
//     const li = document.createElement("li");
//     li.textContent = `[${video.name}] #${video.id} ${video.title}`;
//     li.addEventListener("click", () => {
//       loadVideo(video.videoId, video.subtitleFile);
//       closeMenu();
//     });
//     playlistContainer.appendChild(li);
//   });
// }

function renderVideoList() {
  const playlistContainer = document.getElementById("playlistGrid");
  playlistContainer.innerHTML = "";

  videoData.forEach((video) => {
    const videoItem = document.createElement("div");
    videoItem.classList.add("video-item");
    videoItem.innerHTML = `
      <img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" alt="${video.title}">
      <p class="video-ep">[${video.name}] #${video.ep}</p>
      <p class="video-title"> <span>${video.titleVi}</span> | <span>${video.title}</span></p>
    `;
    videoItem.addEventListener("click", () => {
      loadVideo(video.videoId, video.subtitleFile);
      closeMenu();
    });

    playlistContainer.appendChild(videoItem);
  });
}

/* ==================== Menu Hamburger ==================== */
function setupMenuToggle() {
  const menuToggle = document.getElementById("menuToggle");
  const playlistMenu = document.getElementById("playlistMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  const closeMenuBtn = document.getElementById("closeMenu");

  menuToggle.addEventListener("click", () => {
    playlistMenu.classList.add("active");
    menuOverlay.style.display = "block";
  });

  closeMenuBtn.addEventListener("click", closeMenu);
  menuOverlay.addEventListener("click", closeMenu);
}

function closeMenu() {
  document.getElementById("playlistMenu").classList.remove("active");
  document.getElementById("menuOverlay").style.display = "none";
}

/* ==================== Furigana ==================== */
let furiganaEnabled = false;

document
  .getElementById("furiganaToggle")
  .addEventListener("click", async function () {
    furiganaEnabled = !furiganaEnabled;
    await furiganaSubtitleList();
  });

async function furiganaSubtitleList() {
  const subtitleList = document.getElementById("subtitleList");
  subtitleList.innerHTML = "";
  let lastStartTime = 0;

  // ✅ Cập nhật trạng thái nút toggle
  document.getElementById("furiganaToggle").style.textDecoration =
    furiganaEnabled ? "line-through" : "none";

  if (!furiganaEnabled) {
    // ❌ Nếu furigana bị tắt, chỉ hiển thị văn bản gốc
    for (const sub of subtitles) {
      const div = document.createElement("div");
      div.className = "subtitle-item";
      div.dataset.start = sub.start;
      div.innerHTML = sub.text;

      // div.addEventListener("click", () => {
      //   player.seekTo(sub.start, true);
      // });

      subtitleList.appendChild(div);
      lastStartTime = sub.start;
    }

    let currentStartTime = lastStartTime + 30;
    for (let i = 0; i < 20; i++) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "subtitle-item empty";
      emptyDiv.textContent = " ";
      emptyDiv.dataset.start = currentStartTime;
      subtitleList.appendChild(emptyDiv);

      currentStartTime += 3;
    }

    return;
  }

  // ✅ Hiển thị thông báo "Đang xử lý Furigana..."
  const loadingMessage = document.createElement("div");
  loadingMessage.className = "loading-message";
  loadingMessage.innerHTML = "⏳ Đang xử lý Furigana, vui lòng chờ...";
  loadingMessage.style.color = "#255F38";
  loadingMessage.style.marginTop = "20px";
  loadingMessage.style.textAlign = "center";
  subtitleList.appendChild(loadingMessage);

  try {
    // ✅ Nếu furiganaEnabled = true, tiếp tục xử lý furigana
    const kuroshiro = Kuroshiro.default
      ? new Kuroshiro.default()
      : new Kuroshiro();

    await kuroshiro.init(new KuromojiAnalyzer({ dictPath: "./dict/" }));

    // ✅ Xóa thông báo loading sau khi hoàn tất
    subtitleList.innerHTML = "";

    for (const sub of subtitles) {
      const div = document.createElement("div");
      div.className = "subtitle-item";
      div.dataset.start = sub.start;

      const furiganaText = await kuroshiro.convert(sub.text, {
        mode: "furigana",
        to: "hiragana",
      });

      div.innerHTML = furiganaText;

      // div.addEventListener("click", () => {
      //   player.seekTo(sub.start, true);
      // });

      subtitleList.appendChild(div);
      lastStartTime = sub.start;
    }

    let currentStartTime = lastStartTime + 30;
    for (let i = 0; i < 20; i++) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "subtitle-item empty";
      emptyDiv.textContent = " ";
      emptyDiv.dataset.start = currentStartTime;
      subtitleList.appendChild(emptyDiv);

      currentStartTime += 3;
    }
  } catch (error) {
    console.error("Lỗi khi tải Furigana:", error);
    subtitleList.innerHTML =
      "<div class='error-message'>⚠️ Lỗi khi tải Furigana!</div>";
  }
}
